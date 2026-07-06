# Code Generation Plan — engine-error-logged（Issue #431）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 計画（TDD）

1. RED: `dev-scripts/evals/engine-error-logged/check.ts`（隔離 workspace 実 CLI、8 検査）を追加。修正前は error directive / 未捕捉例外の後に audit へ ERROR_LOGGED が無いことを確認する（3 件 RED）。
2. GREEN: `emit()` の error 分岐と import.meta.main の catch に `recordEngineError()`（best-effort、state 不在 no-op、lazy require で循環回避、記録失敗は握りつぶし）を追加する。errorDirective の発行箇所は 30 超あるため、emit 単一箇所への集約で計装漏れを構造的に防ぐ。
3. 検証: eval 8 検査 GREEN、`npm run test:all` exit 0。parity は宣言済み（#486）。
