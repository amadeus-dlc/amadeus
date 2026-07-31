# Logical Components — u7-mirror-model

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## コンポーネント表

| 論理コンポーネント | 実体 | NFR 関与 |
|---|---|---|
| MirrorLifecycle モデル(2変種) | E1(.tla+.cfg — AsIntended 登録/AsImplemented 一度限り) | 完全探索+落ちる実証(performance/reliability) |
| model-map v2 | E2(schemaVersion 2・models[]) | fail-closed 移行(security) |
| SHA ピン4ファイル | E3(reducer+types+reconciliation+coordinator) | ドリフト検出面(security/reliability) |
| 工程文書2面 | E4(追従+供給、docs/ 英語) | 発見可能性 — 後続 intent の実装者向け |

## 依存方向

model-map v2(スキーマ)→ モデル登録 → TLC 実行 → verdict。工程文書は全体を参照する読み物で逆方向依存なし。

## NFR 対応の全数表

| NFR | 本 unit での扱い |
|---|---|
| NFR-1(検証二層) | **本 unit が第2層(TLC 専用ジョブ)の実体** — AsIntended のみ恒常 green 対象(T3 の CI 統合契約) |
| NFR-2(TDD) | コード面(v2 スキーマ・移行・drift)は TDD 必須(business-rules.md BR-U7-1)。.tla は TLC 完全探索+落ちる実証が検証形 |
| NFR-3(配布同期) | model-map モジュール変更は plugin 側複製と同一 PR 同期(BR-U7-4 — ADR-2 drift guard が強制) |
| NFR-4(台帳整合) | 新テストの registry 追従のみ |
| NFR-5(ゲート実効) | 新設「ガード」ではないが落ちる実証(AsImplemented 反例)は必須 AC(I2)— 実効性検証は u3 と別面で適用 |
