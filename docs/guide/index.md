# Amadeus DLC User Guide

## About this guide

This guide is for people who install and operate Amadeus DLC in their own workspace: running the lifecycle on a project of their own, not developing Amadeus itself. If you already have Amadeus installed and need to steer or extend it, see the [Extension Guide](../amadeus/extension-guide.md) instead.

The chapter split — numbered chapters, starting with introduction, getting-started, first-workflow — takes its cue from the upstream AI-DLC v2 guide's table of contents as a structural reference only. The upstream chapter bodies were not opened while writing this guide. Every sentence here is written from Amadeus's own artifacts: its skills, the `.agents/amadeus/` engine, the installer, and the real commands and paths in this repository.

This guide follows the same language convention as `docs/amadeus/`: each chapter is published as an English `<name>.md` (canonical), paired with a Japanese `<name>.ja.md` (translation), per the [Language Policy](../amadeus/language-policy.md).

## Reading order

Read the introductory arc in numeric order:

1. [00 — Introduction](00-introduction.md) — what Amadeus DLC is, how it runs, and how it relates to AI-DLC v2.
2. [01 — Getting Started](01-getting-started.md) — installing the engine into a workspace and verifying the install.
3. [02 — Your First Workflow](02-first-workflow.md) — birth, the first engine directive, and where state and artifacts land.

## Chapters

| # | Chapter | Status |
|---|---|---|
| 00 | [Introduction](00-introduction.md) | Available |
| 01 | [Getting Started](01-getting-started.md) | Available |
| 02 | [Your First Workflow](02-first-workflow.md) | Available |

The chapters below extend the guide past the introductory arc. Each is tracked by a child issue of [#533](https://github.com/amadeus-dlc/amadeus/issues/533); none is written yet, and the numbering and titles are provisional until its child issue is picked up.

| # | Working title | Tracking issue | Status |
|---|---|---|---|
| 03 | Spaces and Intents | [#567](https://github.com/amadeus-dlc/amadeus/issues/567) | Not yet written |
| 04 | Phases and Stages | [#567](https://github.com/amadeus-dlc/amadeus/issues/567) | Not yet written |
| 05 | Scopes and Depth | [#567](https://github.com/amadeus-dlc/amadeus/issues/567) | Not yet written |
| 06 | Agents | [#568](https://github.com/amadeus-dlc/amadeus/issues/568) | Not yet written |
| 07 | Interaction Modes | [#568](https://github.com/amadeus-dlc/amadeus/issues/568) | Not yet written |
| 08 | Knowledge | [#569](https://github.com/amadeus-dlc/amadeus/issues/569) | Not yet written |
| 09 | Rules and the Learning Loop | [#569](https://github.com/amadeus-dlc/amadeus/issues/569) | Not yet written |
| 10 | State and Audit | [#569](https://github.com/amadeus-dlc/amadeus/issues/569) | Not yet written |
| 11 | Session Management | [#570](https://github.com/amadeus-dlc/amadeus/issues/570) | Not yet written |
| 12 | CLI Commands | [#568](https://github.com/amadeus-dlc/amadeus/issues/568) | Not yet written |
| 13 | Customization | [#570](https://github.com/amadeus-dlc/amadeus/issues/570) | Not yet written |
| 14 | Artifacts Reference | [#570](https://github.com/amadeus-dlc/amadeus/issues/570) | Not yet written |
| 15 | Troubleshooting | [#570](https://github.com/amadeus-dlc/amadeus/issues/570) | Not yet written |
| 16 | Worked Examples | [#571](https://github.com/amadeus-dlc/amadeus/issues/571) | Not yet written |
| 17 | Skills | [#571](https://github.com/amadeus-dlc/amadeus/issues/571) | Not yet written |
| — | Amadeus-specific chapters (multi-agent operation, the docs-only declaration, the `pdm` scope, the validator, the grilling protocol), a glossary, and per-harness guides | [#571](https://github.com/amadeus-dlc/amadeus/issues/571) | Not yet written |

## Related links

- [README](../../README.md) — project overview and installation quickstart.
- [AMADEUS.md](../../AMADEUS.md) — the shared entrypoint document agents load for this repository.
- [Extension Guide](../amadeus/extension-guide.md) — what to edit to steer an installed workspace.
- [Lifecycle Contract Overview](../amadeus/lifecycle/overview.md) — the authoritative phase, stage, and gate contract.
