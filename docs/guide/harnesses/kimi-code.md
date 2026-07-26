# AI-DLC on Kimi Code

> Languages: **English** | [日本語](kimi-code.ja.md)

`dist/kimi/` is one of the framework's harness distributions, for the
**Kimi Code** harness. One deterministic core, many harnesses: the
engine, state machine, audit log, graph, swarm referee, and learnings gate are
byte-identical across every distribution — only the shell differs. The
tree is **generated** from `packages/framework/core/` +
`packages/framework/harness/kimi/` by `bun scripts/package.ts kimi`;
never hand-edit it (the drift guard fails CI).

## Prerequisites

- **Kimi Code CLI ≥ 0.28.1** — the measured floor. The hook event/matcher
  payload contract (every hook event kind captured against a live 0.28.1),
  `.kimi-code/skills/` discovery, and `AskUserQuestion` were all verified
  against this release. `/skill:amadeus --doctor` enforces the pin. Check with
  `kimi --version`.
- **bun** on your PATH — every tool and hook runs via bun.
- **A working Kimi CLI setup** — kimi refuses to start a session unless its
  config carries `default_model`, a managed provider, and a models table, and
  OAuth credentials from `kimi login` live under `$KIMI_CODE_HOME`
  (`~/.kimi-code` by default). If `kimi` starts a session for you today, you
  already have this.

## Install

The setup CLI installs the distribution and, for the kimi harness only, wires
the hooks at the end of the same run:

```bash
bunx @amadeus-dlc/setup install --harness kimi --target your-project
```

This places the `.kimi-code/` tree (skills, agents, scopes, tools, hooks,
knowledge, sensors), the `amadeus/` workspace shell (the pre-built
`amadeus/spaces/default/memory/` method tree the engine reads — a **sibling**
of `.kimi-code/`, not inside it), and the `AGENTS.md` onboarding file. After
the file payload is verified, the installer runs the hook wiring described in
the next section. `upgrade` re-runs the same wiring step, so a managed block
whose markers were stripped (see below) is re-wrapped, never duplicated.

## Hook wiring

Kimi Code has **no project-level config file**: the `[[hooks]]` and
`[[permission.rules]]` this harness needs live in the **user-level**
`$KIMI_CODE_HOME/config.toml` (`~/.kimi-code/config.toml` by default). One
wiring covers every project on the machine.

- **Single source of truth.** The wiring content is the shipped snippet
  `.kimi-code/hooks/amadeus-hooks.snippet.toml` (in the distribution:
  `dist/kimi/.kimi-code/hooks/amadeus-hooks.snippet.toml`). This guide
  deliberately references the snippet instead of transcribing it — read the
  file itself for the exact entries. Its marker-fenced block routes Kimi's
  hook events through the `.kimi-code/hooks/amadeus-kimi-adapter.ts` adapter
  and adds `[[permission.rules]]` pre-allows for the deterministic core's
  exact command prefixes and the git verbs the Bolt worktree flow needs.
- **How the installer merges it.** The installer shows the merge plan as a
  diff report, asks for an explicit interactive confirmation, backs the
  existing config up (a timestamped copy beside it), and writes the merged
  config atomically. Your own existing `[[hooks]]` entries are preserved; only
  the managed block between `# >>> amadeus-kimi-hooks >>>` and
  `# <<< amadeus-kimi-hooks <<<` is ever replaced or removed.
- **Non-interactive runs abort the wiring.** A run without an interactive
  terminal — `--yes` included; it is **not** treated as consent — prints the
  report and the manual procedure, then exits 1: a partially wired kimi setup
  is never reported as success.
- **Manual fallback.** Open `$KIMI_CODE_HOME/config.toml` in an editor, copy
  everything between `# >>> amadeus-kimi-hooks >>>` and
  `# <<< amadeus-kimi-hooks <<<` (inclusive) from
  `.kimi-code/hooks/amadeus-hooks.snippet.toml` to the end of the file, and
  save.
- **The kimi CLI re-serializes config.toml and drops comments** (measured).
  The managed block is therefore identified two ways — by its marker lines and
  by the adapter command-line signature — so a marker-stripped block is still
  detected as present, never double-added, and re-wrapped with fresh markers
  on the next install/upgrade.
- **Hook commands run with the session's project directory as cwd**, so the
  relative adapter path in each entry resolves per project; the adapter is
  fail-open where the project is not installed.
- **Hooks are auxiliary.** An unwired config does not block the workflow —
  the engine runs the same deterministic loop; the hooks only feed it
  presence minting, audit sync, and session lifecycle events. Doctor's probe
  check says exactly this when it cannot verify firing.

## Doctor

```bash
bun .kimi-code/tools/amadeus-utility.ts doctor     # or: /skill:amadeus --doctor
```

The kimi arm checks four things:

1. **Adapter presence** — the project's `.kimi-code/hooks/` carries the
   `amadeus-kimi-adapter` entry of the hook roster.
2. **Managed block** — the user-level config's wiring state. Missing entirely
   (or no config file) fails with the re-run-the-installer / manual-procedure
   fix; present-by-content with the markers gone (the CLI's re-serialization)
   is an advisory pass — the next install/upgrade re-wraps them; duplicated,
   unpaired, or reversed markers are a loud fail. A separate advisory scan
   flags managed-style git pre-allow rules left behind with no managed block
   detected (possible residue from an incompletely removed block — review
   manually).
3. **Version floor** — `kimi` on PATH at ≥ 0.28.1. A missing binary fails the
   `kimi CLI on PATH` row with an install hint; an older version fails with an
   upgrade hint.
4. **Hook probe (advisory)** — fires the adapter directly. "Adapter fired" or
   "unverified … (advisory; hooks are auxiliary, the workflow still runs)" —
   a probe failure never blocks the workflow.

## Use

Invoke the orchestrator with `/skill:amadeus` followed by a scope or a
description of what to build — the same utilities as every other harness
(`--status`, `--doctor`, `--stage`, `--phase`, `--depth`, `--test-strategy`,
`compose`). The per-stage runners (`/skill:amadeus-application-design`, …),
per-scope runners (`/skill:amadeus-feature`, …), and the read-only session
skills (`/skill:amadeus-session-cost`, `/skill:amadeus-replay`,
`/skill:amadeus-outcomes-pack`, `/skill:amadeus-grilling`) ship in the same
`.kimi-code/skills/` tree. Headless runs work through the print channel:
`kimi -p "/skill:amadeus --status"`.

## What's different on this harness

- **Closest to the Claude harness**: a real hooks surface plus
  `AskUserQuestion` structured gates. Where `AskUserQuestion` is unavailable
  (auto permission mode, headless `kimi -p`), gates render as the numbered
  prose fallback; both paths mint the auditable `HUMAN_TURN` the
  human-presence guard requires.
- **SessionEnd exists natively** — no next-start reconcile hack (unlike
  Codex, where an unclosed session is inferred at the next start).
- **No SessionStart context injection in 0.28.1** (measured: every injection
  form probed went undelivered). UserPromptSubmit stdout is the only working
  injection channel, so resume/context text rides it; the session-start hook
  is side-effects only.
- **Stop block = exit 2 + stderr** (measured: the reason reaches the model
  verbatim).
- **Skills, agents, and scopes are discovered from
  `.kimi-code/{skills,agents,scopes}/`** — no separate `.agents/` tree.
- **No statusline and no welcome message** — stage visibility rides the
  TodoList tool and `/skill:amadeus --status`.
- **PostCompact exists in Kimi but is deliberately not wired** (the hook
  coverage table excludes it).
- **Construction swarm = subagent floor only** —
  `bun .kimi-code/tools/amadeus-swarm.ts resolve --harness kimi` reads
  `AMADEUS_USE_SWARM` once per batch: unset selects the subagent floor;
  `claude-ultra` / `codex-ultra` loud-degrade to the floor (`SWARM_DEGRADED`
  is audited) — there is no `kimi-ultra`; any other value is rejected
  fail-closed.

## Regenerating and live journeys

```bash
bun scripts/package.ts kimi          # regenerate dist/kimi from packages/framework/core + harness/kimi
bun scripts/package.ts kimi --check  # drift guard
```

In the Amadeus self repository, `bun run promote:self` promotes
`dist/kimi/.kimi-code/` → the root `.kimi-code/` (the dogfood target).

Two opt-in **live print journeys** drive a real `kimi -p` session against the
shipped tree: `tests/e2e/t-print-kimi-status.serial.test.ts` (status journey)
and `tests/e2e/t-print-kimi-doctor.serial.test.ts` (doctor journey), via the
`tests/harness/kimi-print-drive.ts` driver. They **spend Kimi credits** and
require a real `kimi login`:

```bash
AMADEUS_KIMI_PRINT_LIVE=1 bun test tests/e2e/t-print-kimi-*.serial.test.ts
```

- `AMADEUS_KIMI_PRINT_LIVE=1` is the gate — without it the journeys skip with
  a reason (CI-safe).
- `AMADEUS_KIMI_BIN` overrides the kimi binary; `AMADEUS_KIMI_MODEL` overrides
  the model written into the throwaway config.
- Each journey runs against a tmp `$KIMI_CODE_HOME` with a generated minimal
  non-secret config (`default_model` + managed provider + models table — the
  shape kimi needs to start a session). Authentication crosses via **symlinks**
  of `credentials/` and `oauth/` — OAuth bytes are never copied, and a token
  refresh during the live run writes through to your real credential store
  (an accepted consequence of using real auth).

## Next steps

Installed and wired? The methodology is the same on every harness — keep going
with the neutral chapters:

- [Your First Workflow](../02-your-first-workflow.md) — an annotated end-to-end run.
- [Phases and Stages](../04-phases-and-stages.md) — the 5 phases and 32 stages.
- [Scopes, Depth, and Test Strategy](../05-scopes-and-depth.md) — right-sizing a run.
- [Glossary](../glossary.md) — every term defined.

Other harnesses: [AI-DLC on Codex CLI](codex-cli.md) · [the harness family index](README.md).
