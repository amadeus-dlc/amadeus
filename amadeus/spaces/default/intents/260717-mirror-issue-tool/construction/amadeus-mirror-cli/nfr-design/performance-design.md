# Performance Design — amadeus-mirror-cli

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

- performance-requirements.md P-1/P-2 のとおり性能要求は不在 — 専用の性能機構(キャッシュ・並列化・独自タイムアウト)は**設計しない**。buildSnapshot は3ソースを逐次同期読取(最も単純な形)
- 実行モデルの前提は tech-stack-decisions.md(Bun 直接実行・追加依存なし)を継承する — 性能機構を足さない判断はこの単発 CLI 前提に依拠
- gh 往復は各コマンド1〜2回(create: auth 検査+create、sync: auth 検査+edit、close: auth 検査+edit+close)に留める — 呼び出し回数の上限は business-logic-model のフロー構造そのもので保証(追加機構なし)

## 検証設計

性能テストなし(security-requirements.md / scalability-requirements.md / reliability-requirements.md の各検証節と同じく、要求に trace しない検査を追加しない)(P 要求不在への trace。build-and-test:c1 準拠)。
