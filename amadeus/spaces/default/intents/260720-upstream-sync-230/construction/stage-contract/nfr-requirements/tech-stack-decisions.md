# Tech Stack Decisions — stage-contract

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。既存schema/graph choke pointを使い、新技術を追加しない。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime/Language | Bun 1.3.13 / TypeScript ESM | 既存CLI/schema/testsと一致。 |
| Vocabulary | `amadeus-lib.ts`のUNIT_KINDS/UnitKind | 既存依存方向を保ち第二定義を防ぐ。 |
| Public API | 正準4 seam | parse/emit/filterを内部helperへ閉じる。 |
| Packaging | manifest-driven 6 harness / 4 self-install | source正本と生成境界を維持。 |
| Testing | bun:test、golden、integration runner | exact-shape、bytes、pruningを検証可能。 |

## 追加しない技術

新dependency、network、database、UI、service、schema DSL、別kind registry、when evaluator、audit event、retention/SLOを追加しない。

## Source・test ownership

schema/pure filterはunit、parse/emit/compile/directive/coverage/approvalはintegration、projectionはpackage checksで検証する。push前local lcov patch未カバー0と既決spawn/waiver条件を守る。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U01-01〜15、`business-logic-model.md`のPublic seam/Contract pipeline、`requirements.md`のNFR-3〜8、`technology-stack.md`に対応する。
