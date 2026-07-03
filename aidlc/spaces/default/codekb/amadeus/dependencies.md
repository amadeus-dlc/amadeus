# 依存：amadeus

## 外部依存

| 依存 | 用途 |
|---|---|
| Bun | TypeScript スクリプトの実行。 |
| Node.js と npm | `npm run` の検証入口。 |
| GitHub | Issue、Pull Request、CI、レビューボット、merge 証拠。 |
| codex CLI と claude CLI | real provider の examples 生成と e2e。mock CI では不要。 |

## 内部依存

| 依存関係 | 意味 |
|---|---|
| `CONTEXT.md` → 文書と成果物 | Amadeus DLC の語彙を定義する。 |
| `skills/amadeus/references/stage-catalog.md` → `aidlc-state.md` | stage、scope、skill の対応を決める。 |
| `skills/amadeus*/` → `.agents/skills/amadeus*/` | source skill から昇格先 skill へ反映する。 |
| `skills/amadeus-validator/scripts/IndexGenerate.ts` → `intents.md` | Intent registry から人間向け索引を生成する。 |
| `skills/amadeus-validator/validator/` → `aidlc/` | Space と Intent の構造を検証する。 |
| `dev-scripts/examples-contract.ts` → generator と validator wrapper | examples snapshot の不変条件を共有する。 |
| `dev-scripts/evals/**` → CI | テンプレート、validator、契約、移行、e2e を検査する。 |

## Issue #399 の依存

Issue #399 の計画は、#395、#400、#401、#402 の順序に依存していた。

#401 は #391、#392、#393、#394 の扱いを完了証拠として持つ。

子 Issue の完了は、対応 PR の merge または明示的な Issue close で観測する。

#391〜#395、#399〜#402 はすべて CLOSED であり、対応する Intent `260703-amadeus-skill-english-rollout-plan` は Status: Completed である。

## Issue #396 の依存

現在の active Intent `260704-v2-parity-completion`（Issue #396、open）は、`260703-aidlc-v2-full-compliance` と `260703-amadeus-skill-english-rollout-plan` の両方に依存する。

前者は現在の `aidlc/` 構造、`aidlc-state.md`、`intents.json` を前提にするため、後者は skill の英語化方針が本家英語 skill のコピー戦略の前提になるためである。

基本戦略は本家 `awslabs/aidlc-workflows`（v2 branch、参照 commit `d341522e1491db4884e9127004c3882365229218`）の `dist/claude/` からのコピー（MIT-0）である。
