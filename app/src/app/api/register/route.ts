import { NextResponse } from "next/server";
import { registerFromGithub } from "@/lib/github";
import { ensureSeeded } from "@/lib/seed";
import { upsertAgent } from "@/lib/store";
import { MOCK_MODE } from "@/lib/config";
import {
  ApiError,
  jsonError,
  optionalTrimmedString,
  parseJsonBody,
  requireTrimmedString,
} from "@/lib/http";
import type { AgentRegistrationInput } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ETH_RE = /^0x[a-fA-F0-9]{40}$/;

interface RegisterBody {
  github_url?: string;
  name?: string;
  handle?: string;
  tagline?: string;
  specialty?: string;
  extra_skills?: string;
  rent_price_eth_per_task?: number | string;
  maintainer_email?: string;
  wallet_eth?: string;
  team_ready?: boolean;
}

function parseExtraSkills(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const skills = raw
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter((s) => /^[a-z0-9_\-]{2,40}$/.test(s));
  return skills.length ? skills.slice(0, 20) : undefined;
}

function parseRentPrice(raw: number | string | undefined): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new ApiError(400, "invalid_request", "rent_price_eth_per_task must be between 0 and 1 ETH");
  }
  return n;
}

function parseEmail(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (!EMAIL_RE.test(raw)) {
    throw new ApiError(400, "invalid_request", "maintainer_email is not a valid email");
  }
  return raw;
}

function parseWallet(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (!ETH_RE.test(raw)) {
    throw new ApiError(400, "invalid_request", "wallet_eth must be a 0x-prefixed 40-hex-char address");
  }
  return raw;
}

export async function POST(req: Request) {
  ensureSeeded();
  try {
    if (MOCK_MODE) {
      throw new ApiError(403, "mock_mode_disabled", "registration disabled in MOCK_MODE");
    }

    const body = await parseJsonBody<RegisterBody>(req);
    const github_url = requireTrimmedString(body.github_url, "github_url", { maxLength: 500 });

    const input: AgentRegistrationInput = {
      github_url,
      name: optionalTrimmedString(body.name, "name", { maxLength: 80 }),
      handle: optionalTrimmedString(body.handle, "handle", { maxLength: 60 }),
      tagline: optionalTrimmedString(body.tagline, "tagline", { maxLength: 140 }),
      specialty: optionalTrimmedString(body.specialty, "specialty", { maxLength: 60 }),
      extra_skills: parseExtraSkills(optionalTrimmedString(body.extra_skills, "extra_skills", { maxLength: 500 })),
      rent_price_eth_per_task: parseRentPrice(body.rent_price_eth_per_task),
      maintainer_email: parseEmail(optionalTrimmedString(body.maintainer_email, "maintainer_email", { maxLength: 120 })),
      wallet_eth: parseWallet(optionalTrimmedString(body.wallet_eth, "wallet_eth", { maxLength: 42 })),
      team_ready: typeof body.team_ready === "boolean" ? body.team_ready : undefined,
    };

    const agent = await registerFromGithub(input);
    upsertAgent(agent);
    return NextResponse.json({ success: true, data: agent });
  } catch (e) {
    return jsonError(e, {
      status: 500,
      code: "register_failed",
      message: "register failed",
    });
  }
}
