# コード構造：amadeus

## ディレクトリ構成

| ディレクトリ | 役割 |
|---|---|
| `aidlc/` | Amadeus 本体自己開発用の Amadeus DLC 成果物。 |
| `aidlc/spaces/default/memory/` | 組織、チーム、プロジェクトの長期方針。 |
| `aidlc/spaces/default/knowledge/` | Glossary、Domain Map、Context Map、背景、外部システム、アクター。 |
| `aidlc/spaces/default/intents/` | Intent registry、索引、active Intent、Intent record。 |
| `aidlc/spaces/default/codekb/amadeus/` | Amadeus リポジトリの Reverse Engineering 成果物。 |
| `skills/amadeus*/` | source skill とテンプレート。 |
| `.agents/skills/amadeus*/` | 昇格先 skill。Codex 実行時に参照される。 |
| `amadeus-contracts/` | skill contract の catalog と生成物。 |
| `dev-scripts/` | promote、contracts、examples、eval、移行、検証用スクリプト。 |
| `docs/` | Amadeus DLC の契約文書、ADR、AI-DLC 参照文書。 |
| `examples/` | 段階別 snapshot と provenance。 |
| `lints/` | public type file と TypeScript complexity の検査。 |
| `.agents/rules/` | エージェント向けの成果物規範、後方互換方針、語彙、スクリプト規範、指示の書き方。 |
| `.claude/skills/` | Claude Code 実行時に参照する skill（`.agents/skills/amadeus*/` と同名構成に加え、`gh-issue-organizer`、`japanese-tech-writing`、`skill-forge` を含む）。 |

## 主要モジュール

| モジュール | 場所 | 役割 |
|---|---|---|
| 単一入口 `amadeus` | `skills/amadeus/SKILL.md`、`.agents/skills/amadeus/SKILL.md` | Intake、Initialization、stage routing、phase 境界、Construction の Bolt 実行。 |
| stage catalog | `skills/amadeus/references/stage-catalog.md`、`.agents/skills/amadeus/references/stage-catalog.md` | stage、scope、skill の対応表。 |
| Ideation skill | `skills/amadeus-ideation-*/` | Intent Capture から Approval & Handoff までの成果物作成。 |
| Inception skill | `skills/amadeus-inception-*/` | Reverse Engineering、Practices Discovery、Requirements、User Stories、Design、Units、Delivery Planning。 |
| Construction skill | `skills/amadeus-construction-*/` | Functional Design から CI Pipeline までの成果物と実装支援。 |
| validator | `skills/amadeus-validator/validator/`、`.agents/skills/amadeus-validator/validator/` | Space、Intent、状態、audit、成果物リンク、Domain Map、Context Map、AI-DLC v2 準拠（`lifecycle-v2.ts`）の検証。 |
| examples 検証 | `dev-scripts/validate-amadeus-examples.ts`、`dev-scripts/examples-contract.ts` | snapshot の構造と provenance を検査する。 |

## 現在の自己開発対象

現在の active Intent は `260704-v2-parity-completion` である。

この Intent は、親 Issue #396（open）を起点に、AI-DLC v2（`awslabs/aidlc-workflows` の `v2` branch）との完全一致を目的とし、成果物の双方向一致、skill 一覧の一致、TS エンジン駆動化を柱にする。

先行 Intent `260703-amadeus-skill-english-rollout-plan`（Issue #399 起点、#395、#400、#401、#402 の順序、依存関係、完了証拠を追跡）は Status: Completed で終了している。

`skills/amadeus*/` と `.agents/skills/amadeus*/` の全 32 skill（単一入口 `amadeus` を含む）は、`SKILL.md` の英語化がおおむね完了している。

日本語で残すのは `未確認`、`該当なし` などテンプレート出力ラベルや、成果物の日本語見出し名など、Skill Language Policy が維持対象と定める語だけである。
