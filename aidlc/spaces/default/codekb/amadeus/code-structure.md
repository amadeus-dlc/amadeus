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

## 主要モジュール

| モジュール | 場所 | 役割 |
|---|---|---|
| 単一入口 `amadeus` | `skills/amadeus/SKILL.md`、`.agents/skills/amadeus/SKILL.md` | Intake、Initialization、stage routing、phase 境界、Construction の Bolt 実行。 |
| stage catalog | `skills/amadeus/references/stage-catalog.md`、`.agents/skills/amadeus/references/stage-catalog.md` | stage、scope、skill の対応表。 |
| Ideation skill | `skills/amadeus-ideation-*/` | Intent Capture から Approval & Handoff までの成果物作成。 |
| Inception skill | `skills/amadeus-inception-*/` | Reverse Engineering、Practices Discovery、Requirements、User Stories、Design、Units、Delivery Planning。 |
| Construction skill | `skills/amadeus-construction-*/` | Functional Design から CI Pipeline までの成果物と実装支援。 |
| validator | `skills/amadeus-validator/validator/`、`.agents/skills/amadeus-validator/validator/` | Space、Intent、状態、audit、成果物リンク、Domain Map、Context Map の検証。 |
| IndexGenerate | `skills/amadeus-validator/scripts/IndexGenerate.ts`、`.agents/skills/amadeus-validator/scripts/IndexGenerate.ts` | `intents.json` と Intent モジュールファイルから `intents.md` を生成する。 |
| examples 検証 | `dev-scripts/validate-amadeus-examples.ts`、`dev-scripts/examples-contract.ts` | snapshot の構造と provenance を検査する。 |

## 現在の自己開発対象

現在の active Intent は `260703-amadeus-skill-english-rollout-plan` である。

この Intent は、Issue #399 を起点に #395、#400、#401、#402 の順序、依存関係、完了証拠を追跡する。
