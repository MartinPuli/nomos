# Nomos Post-MVP Roadmap

This document separates what Nomos already proves in the MVP from what would be required to operate it as a durable product.

## What the MVP already proves

- teams are a clearer marketplace unit than raw agents
- routing work across model tiers is a credible cost-saving story
- GitHub can serve as a lightweight agent onboarding source
- live decomposition, classification, assignment, and savings display are enough for a strong demo narrative

## Demo-only shortcuts in the current codebase

- in-memory state for agents, teams, and orchestration runs
- seeded fixture teams and fixture agents as the main supply layer
- GitHub registration that creates agents but not full team composition workflows
- no auth, billing, tenancy, or auditability
- no durable run history or analytics storage
- no production-grade fallback for provider outages beyond operator guidance and env flags

## Phase 1: Demo-stable product core

Goal: make the current MVP safe to iterate on and stable enough for repeated demos and pilot conversations.

- keep expanding tests around routing, pricing, parsing, and orchestration boundaries
- add API-level integration coverage for `classify`, `register`, and `orchestrate`
- add structured logging around model calls, token usage, and route failures
- record run summaries in durable storage
- add a basic admin view for recent runs, failures, and average savings

Exit criteria:

- the team can explain failures with logs instead of guesswork
- run history survives restarts
- regressions in pricing and routing are caught automatically

## Phase 2: Marketplace trust layer

Goal: make teams and agents feel trustworthy enough for external users.

- persistent agent and team records
- explicit verification states for GitHub-backed agents
- richer provenance signals: repo age, maintainers, commit recency, metrics freshness
- clear separation between fixture content, imported agents, and curated teams
- team assembly workflows that turn imported agents into rentable teams

Exit criteria:

- marketplace inventory is not just demo content
- users can tell which entities are verified, imported, curated, or experimental

## Phase 3: Identity and tenancy

Goal: support real users, organizations, and repeated usage.

- user accounts and team workspaces
- ownership of agents, teams, and registered repos
- per-workspace run history and saved goals
- environment-level secrets management for provider credentials
- usage tracking by user and organization

Dependencies:

- persistent data model
- audit-friendly run storage
- clear resource ownership model

## Phase 4: Billing and settlement

Goal: move from savings demo to economic product.

- separate internal cost accounting from external customer pricing
- usage-based billing with invoices or prepaid balances
- team-level pricing strategy with margins and discounts
- optional escrow or onchain settlement only after offchain billing is already coherent
- refunds, failed-run policies, and spend controls

Important product call:

Do not lead with Web3 infrastructure until offchain billing and pricing logic are already trusted. In the current state, routing and savings are the product; payment rails are secondary.

## Phase 5: Observability and optimization

Goal: make Nomos improve itself through real usage data.

- run-level analytics for savings, latency, failure rates, and token efficiency
- per-team and per-agent performance dashboards
- routing quality feedback loops
- experimentation layer for classifier prompts and team composition
- operator controls for forcing routes, replaying runs, or disabling providers safely

Exit criteria:

- routing decisions can be explained and tuned with data
- team quality is measurable over time

## Phase 6: Platform expansion

Goal: move from demo app to extensible infrastructure layer.

- SDK or API for external orchestration clients
- background job execution rather than request-bound orchestration only
- pluggable provider layer beyond a single model vendor
- richer agent packaging contracts than `skills.md` and `memory/metrics.json`
- team templates, marketplace search, and recommendation ranking

## Suggested sequencing

1. Durable storage for runs, agents, and teams.
2. Test coverage + structured logging.
3. Verification and provenance for imported GitHub agents.
4. Team assembly workflows.
5. User identity and tenancy.
6. Billing and spend controls.
7. Analytics and optimization loops.
8. SDK and platform surface.

## What not to do too early

- do not add blockchain settlement before pricing and billing semantics are stable
- do not add auth before deciding the ownership model for teams and imported agents
- do not expand provider support before logging and routing evaluation exist
- do not promise a marketplace economy before trust and provenance signals are credible

## North-star framing

Nomos becomes valuable when it is not just a place to browse teams, but the system that consistently answers one operational question:

> Which specialist should do this work, on which model, at what cost, and why?

The MVP already demonstrates the outline of that answer. The roadmap is about making it durable, measurable, and sellable.