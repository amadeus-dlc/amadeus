# Tech Stack Decisions — clean-env-e2e

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 技術スタック決定

- 新規依存ゼロ: technology-stack の既存 e2e 基盤(node-pty / @xterm/headless / Bun ランナー)と fakeHerdr 様式(business-logic-model の再利用宣言)のみで構成。requirements FR-6b の fake-binary seam 方針どおり herdr/agmsg 実バイナリへの依存を作らない
- テストヘルパー型(CleanEnv / FakeCall — business-rules のドメイン不変条件を持つ)は tests/ 側に置き、本番コードへの型追加ゼロ

## 決定事項

- テスト配置: tests/e2e/ の serial 命名(business-rules BR-5)。新規テスト番号は実装時に最新帯を確認して予約(swarm-test-number-reservation)
- 共有ヘルパー化は既存 t-team-msg の fakeHerdr と重複させない — 意図が同一(herdr shim)のため実装時に共通化可否を判断し、複製する場合は理由を記録(意図ベースの重複排除)
