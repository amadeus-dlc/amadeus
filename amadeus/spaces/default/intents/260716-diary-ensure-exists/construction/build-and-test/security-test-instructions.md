# Security Test Instructions — 260716-diary-ensure-exists

## 適用判断(N/A、根拠付き)

変更はエンジン内部の record 書き込み(`code-generation-plan.md` の目録・`code-summary.md` の AC 表どおり)— 外部入力境界なし・依存追加なし・書き込み先は projectDir 配下の record パス(memoryPathFor 由来の固定形)。攻撃面変化ゼロにつき比例選定対象外(build-and-test:c3)。

## 既存必須検査の維持

CI の既存ゲート(typecheck/lint/drift/tests)は PR #1088 head で全走行 — 省略なし。
