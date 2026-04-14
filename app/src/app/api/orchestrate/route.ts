import { ensureSeeded } from "@/lib/seed";
import { listAgents, saveRun } from "@/lib/store";
import { getTeam, teamMembers } from "@/lib/teams";
import { decompose } from "@/lib/orchestrator";
import { classify } from "@/lib/classifier";
import { selectAgent, tierToModel } from "@/lib/router";
import { runSubagent } from "@/lib/executor";
import { computeSavings, taskPriceEth } from "@/lib/pricing";
import type { OrchestrationEvent, OrchestrationRun, SubTask, Agent } from "@/lib/types";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const maxDuration = 120;

function sse(event: OrchestrationEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: Request) {
  ensureSeeded();
  const { goal, team_id } = (await req.json()) as { goal?: string; team_id?: string };
  if (!goal) {
    return new Response(
      JSON.stringify({ success: false, error: { message: "goal required" } }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (ev: OrchestrationEvent) =>
        controller.enqueue(enc.encode(sse(ev)));

      try {
        let agentPool: Agent[];
        if (team_id) {
          const team = getTeam(team_id);
          if (!team) throw new Error(`team ${team_id} not found`);
          agentPool = teamMembers(team);
          if (agentPool.length === 0) throw new Error(`team ${team_id} has no members`);
        } else {
          agentPool = listAgents();
        }

        const run: OrchestrationRun = {
          id: uuid(),
          goal,
          created_at: new Date().toISOString(),
          subtasks: [],
          total_actual_eth: 0,
          total_naive_eth: 0,
          saved_pct: 0,
          status: "decomposing",
        };
        send({ type: "run_created", run });

        const decomposed = await decompose(goal);
        const subtasks: SubTask[] = decomposed.map((d) => ({
          id: uuid(),
          description: d.description,
          tier: "moderate",
          model: "sonnet",
          agent_id: "",
          status: "pending",
          actual_tokens: 0,
          cost_eth: 0,
        }));
        run.subtasks = subtasks;
        send({ type: "decomposed", subtasks });

        for (let i = 0; i < subtasks.length; i++) {
          const st = subtasks[i];
          const classification = await classify(st.description);
          st.classification = classification;
          st.tier = classification.tier;
          st.model = tierToModel(classification.tier);
          st.status = "routed";
          send({
            type: "classified",
            subtask_id: st.id,
            classification,
            model: st.model,
          });

          const agent = selectAgent(agentPool, st.tier, decomposed[i].skill_hint);
          st.agent_id = agent.id;
          send({ type: "agent_assigned", subtask_id: st.id, agent_id: agent.id });
        }

        await Promise.all(
          subtasks.map(async (st) => {
            send({ type: "task_started", subtask_id: st.id });
            st.status = "working";
            const agent = agentPool.find((a) => a.id === st.agent_id);
            if (!agent) throw new Error(`agent ${st.agent_id} not found`);
            try {
              const result = await runSubagent(
                agent,
                st.model,
                st.tier,
                st.description,
              );
              st.actual_tokens = result.actual_tokens;
              st.cost_eth = taskPriceEth(
                st.model,
                result.actual_tokens,
                agent.quality,
              );
              st.output = result.output;
              st.status = "done";
              send({
                type: "task_completed",
                subtask_id: st.id,
                actual_tokens: result.actual_tokens,
                cost_eth: st.cost_eth,
                output: result.output,
              });
            } catch (e) {
              st.status = "error";
              st.error = e instanceof Error ? e.message : "task failed";
              send({
                type: "task_failed",
                subtask_id: st.id,
                error: st.error,
              });
            }
          }),
        );

        const totals = computeSavings(subtasks);
        run.total_actual_eth = totals.actual_eth;
        run.total_naive_eth = totals.naive_eth;
        run.saved_pct = totals.saved_pct;
        run.status = "done";
        saveRun(run);

        send({
          type: "run_completed",
          total_actual_eth: totals.actual_eth,
          total_naive_eth: totals.naive_eth,
          saved_pct: totals.saved_pct,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "orchestrate failed";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
