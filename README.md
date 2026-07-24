# Amadeus-DLC

> Languages: **English** | [日本語](README.ja.md)

**Amadeus-DLC is a self-hosted AI development lifecycle: a deterministic workflow engine plus a gated, 32-stage methodology, authored once and running natively inside six coding-agent harnesses.** You describe what to build; eleven domain-expert agents carry it through ideation, inception, construction, and operation — and a state machine that is code, not prompts, holds every approval gate until *you* pass it.

![version](https://img.shields.io/badge/version-0.1.5-blue)
![license](https://img.shields.io/badge/license-(MIT%20OR%20Apache--2.0)-green)
![Kiro IDE](https://img.shields.io/badge/harness-Kiro%20IDE-orange)
![Kiro CLI](https://img.shields.io/badge/harness-Kiro%20CLI-orange)
![Claude Code](https://img.shields.io/badge/harness-Claude%20Code-orange)
![Codex CLI](https://img.shields.io/badge/harness-Codex%20CLI-orange)
![OpenCode](https://img.shields.io/badge/harness-OpenCode-orange)
![Cursor](https://img.shields.io/badge/harness-Cursor-orange)

> [!WARNING]
> **Preview (pre-1.0) — under active development.** Interfaces, stage definitions, the agent roster, and the install model are still evolving, and breaking changes can land between releases. Pin a known-good version for anything you depend on, and review all generated output before you act on it.

## Why Amadeus-DLC

Ad-hoc AI coding works until the project gets real. Then context drifts between prompts, the reasoning behind a decision goes unrecorded, and the model quietly does something you never asked for.

Most attempts to fix this pile more prompts on top of the model and hope it complies. Amadeus takes the opposite bet: **everything that must not be negotiable is moved out of the model and into deterministic code.** The stage sequence is a compiled graph, not a convention. Approval gates are enforced by a CLI state machine that refuses to advance — they cannot be sweet-talked. Every event lands in an append-only audit trail. Sensors run real linters and structural checks against every artifact, independent of what the model claims. The model *conducts* the work; the engine *referees* it.

Around that engine, the methodology does the rest:

- **Structure** — 5 phases, 32 stages, each with a clear owner, declared inputs and outputs, and a human gate before the next one starts.
- **Memory** — corrections you make become persistent rules in a layered method tree (`org → team → project → phase → stage`), so the same mistake is not made twice.
- **Proportion** — a throwaway proof-of-concept and a regulated enterprise rollout run the same engine; a scope simply selects which stages execute, and an adaptive composer can tailor the plan to your exact task.

And it is **self-hosted**: Amadeus is developed with Amadeus. Every feature in this repository went through its own stages, gates, and audit trail before it shipped.

## How a workflow runs

You type `/amadeus` followed by what you want to build. The engine births an **intent**, detects your workspace (greenfield or brownfield), picks a scope — or you pass one explicitly — and starts walking the stage graph:

1. **Ideation** — capture the intent, assess feasibility, define what is in and out of scope, get the initiative approved.
2. **Inception** — reverse-engineer the existing code if there is any, pin requirements and stories, design the application, cut it into **units of work** with an explicit dependency DAG.
3. **Construction** — build unit by unit in **Bolts**. Greenfield scopes ship a **walking skeleton** first: a thin end-to-end slice you approve before anything else is built. Independent units can fan out to parallel workers under a deterministic convergence referee.
4. **Operation** — pipelines, provisioning, observability, incident response — when the scope calls for it.

At every stage the leading agent produces reviewable artifacts under the `amadeus/` workspace tree, a reviewer persona challenges them, sensors verify them mechanically, and the gate waits for you. Stop any time; `/amadeus` resumes from the recorded state.

## What's in the box

- **[5 phases, 32 stages](docs/guide/04-phases-and-stages.md)** — Initialization, Ideation, Inception, Construction, Operation
- **[11 domain-expert agents](docs/guide/06-agents.md)** — product, design, delivery, architect, aws-platform, compliance, devsecops, developer, quality, pipeline-deploy, operations
- **[10 stock scopes](docs/guide/05-scopes-and-depth.md)** (enterprise through workshop) with auto-detection from freeform intent, plus the **[adaptive composer](docs/guide/05-scopes-and-depth.md#the-adaptive-composer)** that proposes a tailored EXECUTE/SKIP plan from your task — and registers approved plans as reusable composed scopes
- **[3 depth levels](docs/guide/05-scopes-and-depth.md#the-3-depth-levels)** and **[3 test-strategy levels](docs/guide/05-scopes-and-depth.md#the-3-test-strategy-levels)** — artifact detail and test volume, controlled independently
- **[Approval gates at every stage](docs/guide/07-interaction-modes.md)** — enforced by the engine, with interaction modes from question-by-question to fast-track
- **[Spaces and intents](docs/guide/03-spaces-and-intents.md)** — per-intent records, per-team spaces, everything version-controlled in your repo
- **[Rules and a learning loop](docs/guide/09-rules-and-the-learning-loop.md)** — human corrections persist as layered method rules, guarded by an admission check that rejects contradictions
- **[Two-tier knowledge](docs/guide/08-knowledge.md)** — methodology knowledge ships with the framework; team and domain knowledge accumulates in your workspace
- **[Deterministic sensors](docs/harness-engineering/06-sensors.md)** — linters, type checks, structural artifact checks, firing automatically per stage
- **[Plugins](docs/guide/19-plugins.md)** — small, hand-authored bundles that add stages, seam entries, and prose fragments to a workspace without editing the framework: projected to every harness, composed atomically, dropped without residue
- **[State machine and audit trail](docs/guide/10-state-and-audit.md)** — append-only, per-clone audit shards; every gate, answer, and sensor verdict is on the record
- **[Session management](docs/guide/11-session-management.md)** — resume from checkpoint, redo, jump to any stage or phase, park and unpark
- **[CLI utilities](docs/guide/12-cli-commands.md)** and **[session skills](docs/guide/17-skills.md)** — status, doctor, cost report, replay narrative, outcomes pack, grilling interviews

## An independent line of development

Amadeus-DLC implements the **AI-DLC methodology** — a structured, gated approach to AI-driven development defined by AWS (see [Provenance](#provenance-and-acknowledgements)). It began as a fork of the v2 reference implementation and inherited that line's core at the fork point: the deterministic engine, the 32-stage graph, the composer, the learning loop, the audit trail, and the multi-harness build all trace back to it. Since the fork the two lines have evolved independently, and Amadeus reconciles them deliberately rather than automatically — each upstream release is analyzed item by item into an evidence-backed ADOPT/ADAPT/SKIP plan before anything lands — most recently upstream v2.3.0, including its plugin system (see the [upstream migration guide](docs/guide/18-migrating-upstream-v2.md)).

On top of that inheritance, this line develops its own additions. Among them:

- the **installer** — `@amadeus-dlc/setup` installs and upgrades any harness distribution with one command, where upstream installs by manual copy;
- **two additional harness surfaces** — OpenCode and Cursor — extending the four shipped upstream to six;
- a **workspace migration tool** (`/amadeus --migrate`) that converts an upstream v2 `aidlc/` workspace in place, previews included;
- the **grilling** session skill for read-only design interrogation, and **fully bilingual documentation** — every guide ships in English and Japanese;
- and the discipline behind all of the above: Amadeus is developed *with* Amadeus, in this repository, through its own stages, gates, and audit trail.

## Pick your harness

The engine — state machine, audit log, referee — is byte-identical across every harness; only the shell differs.

| Harness | Install (into your project) | Invoke | Guide |
| --- | --- | --- | --- |
| **Kiro IDE** | `bunx @amadeus-dlc/setup install --harness kiro-ide` | `/amadeus` | [Running on Kiro IDE](docs/guide/harnesses/kiro-ide.md) |
| **Kiro CLI** (≥ 2.6) | `bunx @amadeus-dlc/setup install --harness kiro` | `/amadeus` | [Running on Kiro CLI](docs/guide/harnesses/kiro-cli.md) |
| **Claude Code** | `bunx @amadeus-dlc/setup install --harness claude` | `/amadeus` | [Getting Started](docs/guide/01-getting-started.md) |
| **Codex CLI** (≥ 0.139.0) | `bunx @amadeus-dlc/setup install --harness codex` | `$amadeus` | [Running on Codex CLI](docs/guide/harnesses/codex-cli.md) |
| **OpenCode** | `bunx @amadeus-dlc/setup install --harness opencode` | `$amadeus` | [Running on OpenCode](docs/guide/harnesses/opencode.md) |
| **Cursor** | `bunx @amadeus-dlc/setup install --harness cursor` | `/amadeus` | [Running on Cursor](docs/guide/harnesses/cursor.md) |

> [!NOTE]
> This release works best with **Claude Opus 4.8** (on Kiro, that requires a paid plan). On weaker models the conductor may skip optional stage steps or rush approval gates. We are sharpening behavior on other models.

## Quick Start

### Prerequisites (every harness)

Every harness runs the same TypeScript hooks and CLI tools through **bun**, so install bun first — it is the one requirement they all share.

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash
```

```powershell
# Windows PowerShell
irm bun.sh/install.ps1 | iex
```

```batch
:: Windows Command Prompt (CMD) — bun ships only a PowerShell installer, so invoke it from CMD
powershell -c "irm bun.sh/install.ps1 | iex"
```

On Windows, use *either* PowerShell *or* CMD, not both — your prompt shows `PS C:\` in PowerShell and `C:\` (no `PS`) in CMD. Everything runs on native Windows; WSL is not required. [Git for Windows](https://git-scm.com/downloads/win) is recommended so harnesses that use a Bash tool can find one.

> [!TIP]
> bun has to be on the PATH that *non-interactive* shells see, since that's what a harness uses to run a hook or tool. Those shells read `~/.zshenv` (zsh) or `~/.bashrc` (bash), not `~/.zshrc` — but the bun installer writes to `~/.zshrc`. So if `which bun` works in your terminal yet the harness can't find bun, copy the `BUN_INSTALL`/`PATH` export into `~/.zshenv` (or `~/.bashrc` for bash and Git Bash).

### Install a harness

`@amadeus-dlc/setup` fetches the tagged distribution from GitHub and copies it into your project — no manual `dist/` copying needed. Two equivalent invocations (`npx` works with any Node.js ≥ 18.3; no bun required for this one command):

```bash
bunx @amadeus-dlc/setup install     # bun
npx @amadeus-dlc/setup install      # npm/node
```

Run bare, `install` launches an interactive wizard: pick your harness (`claude` / `codex` / `kiro` / `kiro-ide` / `opencode` / `cursor`), then a target directory. For scripts and CI, skip the wizard with explicit flags:

```bash
bunx @amadeus-dlc/setup install --harness claude --target your-project --yes
```

Upgrading an existing install? Use `upgrade` instead of `install` — same flags. It reports a diff-style plan before touching anything and preserves your customizations:

```bash
bunx @amadeus-dlc/setup upgrade --harness claude --target your-project --yes
```

`amadeus-setup` with no subcommand always just prints help; `install`/`upgrade` never run implicitly. If the installer isn't reachable (no network, air-gapped environment), see [Installer Unavailable — Manual Copy Fallback](docs/guide/15-troubleshooting.md#installer-unavailable--manual-copy-fallback).

Every install ships two pieces side by side: the harness surface (`.claude/`, `.codex/`, `.kiro/`, …) and the `amadeus/` **workspace shell** with the pre-built `amadeus/spaces/default/memory/` method tree the engine reads — `/amadeus --doctor` fails its "workspace shell ready" check without it.

<details>
<summary><b>Kiro IDE</b></summary>

**1. Install Kiro IDE** and sign in.

**2. Install Amadeus-DLC into your project**

```bash
bunx @amadeus-dlc/setup install --harness kiro-ide --target your-project --yes
```

This installs `.kiro/` + `amadeus/` (+ `AGENTS.md`) into `your-project/`. Open `your-project/` in Kiro IDE — the install ships `.kiro/settings/cli.json` with `chat.defaultAgent` set to `amadeus` and registers the framework hooks as `.kiro/hooks/*.kiro.hook` files. In the chat panel, run `/amadeus --doctor` to verify, then `/amadeus <description>` to start. Full guide: [Running on Kiro IDE](docs/guide/harnesses/kiro-ide.md).

</details>

<details>
<summary><b>Kiro CLI</b></summary>

**1. Install Kiro CLI** (≥ 2.6) and log in:

```bash
kiro-cli --version   # confirm ≥ 2.6
kiro-cli login
```

**2. Install Amadeus-DLC into your project**

```bash
bunx @amadeus-dlc/setup install --harness kiro --target your-project --yes
cd your-project && kiro-cli chat
```

The install ships `.kiro/settings/cli.json` with `chat.defaultAgent` set to `amadeus`, so `/amadeus` is active by default. Inside the session, run `/amadeus --doctor` to verify, then `/amadeus <description>` to start. Full guide: [Running on Kiro CLI](docs/guide/harnesses/kiro-cli.md).

</details>

<details>
<summary><b>Claude Code</b></summary>

**1. Install Claude Code**

```bash
# macOS / Linux (native install — recommended; auto-updates)
curl -fsSL https://claude.ai/install.sh | bash
```

```powershell
# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```

Prefer Homebrew on macOS? `brew install --cask claude-code`. Verify with `claude --version`.

**2. Install Amadeus-DLC into your project**

```bash
bunx @amadeus-dlc/setup install --harness claude --target your-project --yes
cp -n your-project/.claude/CLAUDE.md.example your-project/.claude/CLAUDE.md
cp -n your-project/.claude/settings.json.example your-project/.claude/settings.json
cd your-project && claude
```

Then, inside the Claude Code session:

```
/amadeus --doctor                                               # verify the setup
/amadeus Build a task management API with user authentication   # start a workflow
```

The shipped `settings.json.example` does not pin a provider or model; Claude Code uses your normal configured defaults. Put personal overrides in `.claude/settings.local.json` or your user-level settings. Full guide: [Getting Started](docs/guide/01-getting-started.md).

</details>

<details>
<summary><b>Codex CLI</b></summary>

**1. Install Codex CLI** (≥ 0.139.0 — earlier releases don't surface the real agent role in hook payloads):

```bash
codex --version   # confirm ≥ 0.139.0
```

**2. Install Amadeus-DLC into your project** (which must be a **git repository** — Codex only discovers a project `.codex/hooks.json` inside one):

```bash
bunx @amadeus-dlc/setup install --harness codex --target your-project --yes
cp -n your-project/.codex/config.toml.example your-project/.codex/config.toml
bun your-project/.codex/tools/amadeus-codex-hooks.ts activate --project-dir your-project
```

This installs `.codex/` + `.agents/` + `amadeus/` + `AGENTS.md`. Codex hooks have an explicit ownership boundary: `.codex/hooks.json.example` is the tracked canonical configuration, `.codex/hooks.json` is an ignored, per-clone active file. `activate` creates the active file only when absent and never overwrites an existing one. Verify with:

```bash
bun .codex/tools/amadeus-utility.ts doctor
```

Invoke the orchestrator with `$amadeus` (or `/skills` → amadeus) followed by a scope or description. The trust dialog, config merge, upgrade paths for existing installs, and sandbox/git notes are covered in full in the [Codex guide](docs/guide/harnesses/codex-cli.md).

</details>

<details>
<summary><b>OpenCode</b></summary>

**1. Install OpenCode** and sign in to your provider.

**2. Install Amadeus-DLC into your project**

```bash
bunx @amadeus-dlc/setup install --harness opencode --target your-project --yes
```

This installs `.opencode/` + `amadeus/` (+ `AGENTS.md`) into `your-project/`. Activate the shipped configuration as described in the guide (copy `.opencode/opencode.json.example` to `.opencode/opencode.json` if your project does not already carry one), then run `$amadeus --doctor` to verify and `$amadeus <description>` to start. Full guide: [Running on OpenCode](docs/guide/harnesses/opencode.md).

</details>

<details>
<summary><b>Cursor</b></summary>

**1. Install Cursor** and sign in.

**2. Install Amadeus-DLC into your project**

```bash
bunx @amadeus-dlc/setup install --harness cursor --target your-project --yes
```

This installs `.cursor/` + `amadeus/` (+ `AGENTS.md`) into `your-project/`. Activate the shipped hook configuration as described in the guide (copy `.cursor/hooks.json.example` to `.cursor/hooks.json` if your project does not already carry one), then run `/amadeus --doctor` to verify and `/amadeus <description>` to start. Full guide: [Running on Cursor](docs/guide/harnesses/cursor.md).

</details>

## Documentation

Three guides, one per reader — pick by what you're trying to change:

| | For | Covers |
|---|---|---|
| **[User Guide](docs/guide/00-introduction.md)** | Building software *with* Amadeus | Getting started, workflows, scopes, agents, interaction modes, troubleshooting |
| **[Harness Engineer Guide](docs/harness-engineering/00-overview.md)** | Shaping *how* Amadeus behaves | Stages, agents, scopes, rules, sensors, and team knowledge — configuration, not code |
| **[Developer Reference](docs/reference/00-overview.md)** | Changing Amadeus *itself* | Architecture, orchestrator, stage protocol, hooks, state machine, testing, contributing |

The documentation index with the full map is [docs/README.md](docs/README.md).

## Repository layout

Three zones: what the framework **is**, how each harness **speaks**, and what users **copy**.

```text
amadeus/
│  ─────────── HAND-AUTHORED SOURCE — edit here ───────────
├── packages/
│   ├── framework/
│   │   ├── core/               # ONE harness-neutral source of truth
│   │   │   ├── tools/          #   amadeus-*.ts engine tools (+ data/scaffold/templates)
│   │   │   ├── amadeus-common/ #   stage protocol + stage files + conductor
│   │   │   ├── agents/         #   domain-expert personas
│   │   │   ├── knowledge/ memory/ scopes/ sensors/ hooks/
│   │   │   ├── skills/         #   session skills
│   │   │   └── templates/      #   onboarding skeleton → each harness's CLAUDE.md / AGENTS.md
│   │   └── harness/            # thin per-harness authored surfaces — small, divergent by design
│   │       ├── claude/  codex/  cursor/  kiro/  kiro-ide/  opencode/
│   └── setup/                  # @amadeus-dlc/setup — the installer package
│
├── scripts/
│   ├── package.ts              # THE build entry: copy core+harness per manifest → graph compile →
│   │                           #   runner-gen → emit() per tree.  --check = total drift guard (CI)
│   └── manifest-types.ts       # shared manifest contract
│
│  ─────────── GENERATED, COMMITTED, DRIFT-GUARDED — never hand-edit ───────────
├── dist/
│   ├── claude/    kiro-ide/    kiro/      # what users of each harness copy
│   ├── codex/     opencode/    cursor/
│
│  ─────────── SUPPORTING ───────────
├── tests/                      # all-TypeScript suite (t*.test.ts)
├── docs/                       # guide/ · harness-engineering/ · reference/
└── book-pack/                  # local domain pack (book writing) — not shipped
```

> `packages/framework/core/` is what the framework **is**. `packages/framework/harness/` is how each harness **speaks**. `dist/` is what users **copy**. Only framework source is edited; `bun scripts/package.ts` regenerates `dist/`, and a hand-edit to `dist/` is a CI failure.

The framework source lives under `packages/framework/` so it sits beside sibling packages such as `packages/setup` (the installer); root `scripts/` and `dist/` remain the repository-level build entry and public install contract. The background and trade-offs are recorded in the [Workspace Layout Decision](docs/reference/18-workspace-layout.md).

## Build / regenerate the harnesses

Maintainers edit the hand-authored source in `packages/framework/core/` (or a `packages/framework/harness/<name>/` surface), then regenerate the committed `dist/<harness>/` trees — **never hand-edit `dist/`**, the drift guard fails CI.

```bash
bun run dist                    # regenerate every dist/<harness>/ from core + harness
bun scripts/package.ts <name>   # regenerate one harness (e.g. claude, kiro-ide, codex)
bun run dist:check              # byte-parity drift guard (run in CI)
bun run promote:self            # update this repo's project-local self install
bun run promote:self:check      # drift guard for the project-local self install
```

Adding a whole new harness? See [Porting to a New Harness](docs/harness-engineering/09-porting-to-a-new-harness.md). The authoritative build reference is the [Contributing Guide](docs/reference/11-contributing.md#development-workflow).

## Testing

```bash
bun tests/run-tests.ts               # default: smoke + unit + integration
bun tests/run-tests.ts --ci          # smoke + unit + integration
bun tests/run-tests.ts --release     # + e2e (full acceptance)
bash tests/run-tests.sh --ci         # POSIX compatibility wrapper
```

See the [Testing Reference](docs/reference/09-testing.md) for the full strategy and test registry.

## Troubleshooting

Most first-run trouble is one of these; each harness guide covers the rest.

| Symptom | Harness | Fix |
| --- | --- | --- |
| `which bun` works in your terminal, but the harness can't find bun | all | bun isn't on the non-interactive PATH. Copy the `BUN_INSTALL`/`PATH` export into `~/.zshenv` (zsh) or `~/.bashrc` (bash/Git Bash) — see the tip under [Quick Start](#quick-start). |
| `/amadeus --doctor` reports a Codex CLI version below 0.139.0 | Codex | Upgrade to Codex CLI 0.139.0 or later. Older releases break subagent attribution and hyphenated agent TOML resolution. |
| Model/provider calls fail with auth or model-not-found errors | Claude, Codex | Confirm your CLI's configured provider credentials and model access. If you intentionally use a project-local provider override, verify that file is present and matches your account or organization setup. |
| Hooks never fire (no audit rows, no gates) | Codex | Trust the hooks: run `bun scripts/package.ts codex trust --project <dir>`, or start one TUI session and choose "Trust all." Untrusted hooks never run. |
| Skills or rules don't take effect after you copy a new `dist/` | all | Start a fresh session — harnesses load skills, agents, and rules at session start. |

## Contributing

See the [Contributing Guide](docs/reference/11-contributing.md) for prerequisites, workflow, and submission process.

## Provenance and acknowledgements

The **AI-DLC methodology** — the phased, gated approach to AI-driven development this project implements — was defined by AWS. Read the [AI-DLC blog post](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/) and the [Method Definition Paper](https://prod.d13rzhkk8cj2z0.amplifyapp.com/) to learn the methodology itself.

Amadeus-DLC began as a fork of [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) (AI-DLC v2) and owes its starting point to that work. It has since become an independent implementation with its own engine, packaging, installer, and extensions, developed in this repository under its own roadmap. Upstream releases are still reviewed and selectively adopted through an evidence-backed ADOPT/ADAPT/SKIP process — see [Migrating from upstream v2](docs/guide/18-migrating-upstream-v2.md).

Generative AI can make mistakes. Review the output — and the costs — of whatever model and agentic harness you run this framework with; the approval gates exist so that nothing ships without a human having looked at it.

## License

Dual-licensed under either of

- [MIT License](LICENSE-MIT)
- [Apache License, Version 2.0](LICENSE-APACHE)

at your option.
