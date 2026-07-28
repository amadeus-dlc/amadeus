# Scalability Requirements — u2-state-reconcile-hardening

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 規模モデル

- 複数 Project の同期は独立(business-rules BR-U2-2 — requirements FR-7c の受入条件6): 1 Project の失敗が他 Project の処理・記録を妨げないため、N 増加時も部分障害が全体へ連鎖しない。呼び出し回数は N に線形(requirements NFR-3)。
- 台帳の規模: entry 数は「同期対象になったことのある Project 数」までしか増えない — business-logic-model の reconcile ループ(手順1〜5)には entry 削除の手順が存在しないため単調増加であり、前提 A-2(所属 Project は少数 — requirements)により実用上有界。数値上限は設けない。

## スケーリング方針(非適用の明示)

- 水平スケーリング・キャッシュ・circuit breaker は導入しない — 常駐プロセスを持たない CLI には適用対象が存在しない(根拠: requirements FR-1b — daemon・polling・GitHub Actions を導入しないチェーン内実行のみ。cid:nfr-design:c1 の置換規律)。
- rate-limit は既存 retryable 分類(429 → rate-limit → pending)で吸収し、新たな throttle・バックオフ機構を導入しない(requirements NFR-3 後段)。U2 の pending 台帳がこの吸収の永続面(technology-stack 断面: 新規依存・新機構ゼロで成立)。

## 同時実行

- 同一 boundary 内の per-Project 処理(business-logic-model の独立ループ)に並列化の性能要求は置かない — requirements A-2 の少数前提で逐次処理が十分であり、並列化は要件に存在しないため推測で導入しない(実行形態の最終確定は実装時 — 並列安全性が文書で保証されない外部コマンド依存があるため cid:code-generation:external-cmd-concurrency-safety-doc の規律が適用される)。
