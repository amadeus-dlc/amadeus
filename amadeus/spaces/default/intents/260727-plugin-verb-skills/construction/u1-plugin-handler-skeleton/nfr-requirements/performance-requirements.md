# Performance Requirements — U1 u1-plugin-handler-skeleton

上流入力(consumes 全数): business-logic-model.md(委譲一本道)、business-rules.md(BR-U1-3 薄い dispatch)、requirements.md(FR-2)、technology-stack.md(Bun spawn 前提)

## PR-U1-1: 委譲オーバーヘッド

`/amadeus plugin <verb>` の追加コストは子プロセス spawn 1回のみ(business-logic-model.md の一本道)。専用の性能予算・計測は設けない(requirements.md の受け入れ基準にも性能項目はなく、FR-2 は機能契約のみ) — 既存 handleMigrate 委譲(technology-stack.md の Bun spawnSync 前提)と同一機構であり、新しい強制メカニズムが存在しないため数値を発明しない(constants-from-code)。

## 検証形

性能面の追加テストなし(business-rules.md BR-U1-4 の機能テストが実行時間の暗黙上限 = 既存テストランナーのタイムアウトに服する)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T22:51:13Z
- **Iteration:** 2
- **Scope decision:** none

it.1 の Major(t67/t68 捏造引用 → 実測 import 済みテスト t203/t211/t221/t249 へ差し替え)/ Minor(domain-entities.md の未宣言参照 → ヘッダ追加参照明記)を閉包。引用先の実在を reviewer 独立 grep で確認。残存なし。

### Findings

- None
