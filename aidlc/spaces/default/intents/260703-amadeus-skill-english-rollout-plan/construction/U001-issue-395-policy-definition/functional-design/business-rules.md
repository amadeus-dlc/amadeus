# Business Rules：#395 方針確定

## 目的

Amadeus skill の英語化方針で守る業務ルールと、後続 Bolt へ渡す Intent Contracts を定義する。

## 業務ルール

| # | ルール | 根拠 |
|---|---|---|
| 1 | `SKILL.md` の英語化可否は、Issue #395 の受け入れ条件を満たす方針として明示する。 | Issue #395、R002 |
| 2 | 英語化する場合、生成される `aidlc/**/*.md`、`.kiro/specs/**/*.md`、`openspec/**/*.md` は日本語のまま維持する。 | AGENTS.md、R004 |
| 3 | `skills/amadeus*/SKILL.md` と `.agents/skills/amadeus*/SKILL.md` の言語ルール衝突は、英語化 PR の前提条件として解消する。 | Issue #395、`.agents/rules/amadeus-artifacts-and-examples.md` |
| 4 | source skill と昇格先 skill の同期が必要な場合は、`dev-scripts/promote-skill.ts` を使う。 | `.agents/rules/amadeus-artifacts-and-examples.md`、R004 |
| 5 | `.agents/skills/amadeus*/SKILL.md` だけを手作業で分岐させない。 | Issue #395、`.agents/rules/amadeus-artifacts-and-examples.md` |
| 6 | frontmatter description を英語化する場合は、必要に応じて `agents/openai.yaml` も更新する。 | Issue #395 |
| 7 | PR 説明には対象 Issue、対象 Intent、変更範囲、検証結果、翻訳変更と意味変更の境界を記録する。 | R004 |
| 8 | #395 の完了証拠は、対応 PR の merge または明示的な Issue close とする。 | R002、B001 Definition of Done |

## 例外

- `CONTEXT.md` の canonical name は、英語化後の `SKILL.md` でも別名化しない。
- Amadeus DLC 固有契約は、本家 AI-DLC v2 との対応確認を理由に削らない。
- Issue #395 本文に含まれる旧配置名は、現行の `aidlc/` と `aidlc-state.md` の契約へ読み替える。

## Intent Contracts

| 契約 | 事前条件 | 事後条件 |
|---|---|---|
| PRE001 方針判断 | Issue #395 の目的、対象範囲、注意事項、受け入れ条件を確認している。 | `SKILL.md` を英語化するか現状維持するかの判断基準を説明できる。 |
| PRE002 言語契約維持 | 現行の AGENTS.md、`.agents/rules/`、`CONTEXT.md` の言語ルールを確認している。 | 生成される日本語成果物契約と skill 本文の英語化方針を分けて扱える。 |
| PRE003 昇格フロー維持 | source skill と昇格先 skill の関係を確認している。 | 必要な同期は昇格フローで行う前提を PR 境界に含められる。 |
| PRE004 完了証拠記録 | #395 対応 PR または Issue close の状態を確認できる。 | B001 の完了証拠として merge または close を追跡できる。 |

## 未確認事項

- #395 対応 PR の最小差分を、方針文書、Issue 更新、言語ルール変更のどこまでにするかは Code Generation で確定する。
