# Tech Stack Decisions — u2-state-reconcile-hardening

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 決定一覧

| 決定 | 根拠 |
|---|---|
| 新規依存ゼロ — 既存 reducer / codec / store の様式を台帳3状態面へ拡張するのみ | technology-stack 実測: 本 intent 区間で依存宣言の変更 0 行。business-logic-model 手順3の reducer transition 3種(upsert-project-entry / mark-project-pending / mark-project-safety-blocked)は既存 reducer 様式の追加 transition として実装する |
| 失敗注入は FakeGateway の差し替え(既習様式)で行い、本番コードへテスト専用分岐を置かない | business-rules テスト規約+phases/construction.md の Testing Standards(テストシームは port/依存注入) |
| 状態永続は既存 state file(codec 3面: keys/validate/render)— 新しい永続化機構・DB を導入しない | requirements FR-7c(per-Project receipt)は既存 codec の closed set 拡張で成立(technology-stack 断面: 新機構ゼロ) |
| 実 FS を使う reconcile 検証は integration 層、reducer transition は unit 直叩き(純関数) | business-rules テスト規約(fs-tests-integration-first — test-size ratchet を配置根拠とする) |
| リトライは boundary 駆動(次の eligible boundary / manual sync)— タイマー・キュー・ジョブ機構を導入しない | requirements FR-7b+FR-1b(daemon/polling 禁止)。pending 台帳が再試行の永続面 |

## 却下した代替案

- **即時リトライ(指数バックオフ等)の内蔵**: 却下 — FR-1b がチェーン内実行のみを許し、リトライ時機は boundary 駆動が要件(FR-7b)。バックオフ機構は throttle 新設の禁止(requirements NFR-3 後段)にも抵触する。
- **台帳の独立ファイル化(state file 外の DB/JSON)**: 却下 — 既存 state codec の closed-schema 拡張(business-logic-model の台帳3状態化)で足り、新しい永続面は audit-batch-before-state-atomicity の既存順序保証(business-rules BR-U2-6)から外れるリスクだけを増やす。
