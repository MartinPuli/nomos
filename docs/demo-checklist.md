# Nomos Demo Checklist

Use this when running Nomos live for a team, judge, or investor.

## Before the demo

1. Confirm `ANTHROPIC_API_KEY` is set.
2. If using live GitHub registration, confirm `GITHUB_TOKEN` is set.
3. Open the app at `app/` and verify the homepage loads teams and agents.
4. Pick the strongest demo path: open the Product Launch Squad detail page first.
5. Keep the launch preset ready in `/orchestrate`.

## During the demo

1. Start from the marketplace so the team-first model is clear.
2. Open a team detail page and call out the roster, model mix, and savings history.
3. Run the launch preset so Nomos visibly routes one task to Opus, one to Sonnet, and one to Haiku.
4. Focus attention on the savings panel, not the raw output text.
5. Expand one task output only after the routing and savings story has landed.

## Fallback path

1. If Anthropic is unavailable, stop and explain the routing path rather than clicking repeatedly.
2. If GitHub registration is rate-limited, skip `/register` and use the seeded marketplace.
3. If you need deterministic classifier behavior, set `FORCE_ROUTING=pricing=complex,landing=moderate,faq=simple`.
4. If you need a fixtures-only run, set `MOCK_MODE=1` before starting the app.

## Operator notes

- Strongest visual narrative: team detail → orchestrate → savings panel.
- The main proof is cost reduction through routing, not generic multi-agent output.
- Keep one backup browser tab open on the homepage in case the live flow needs a reset.