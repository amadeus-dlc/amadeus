# Code Generation 計画承認 — U1 サイズ分類台帳

**人間承認:** 2026-07-17T19:27:39Z — ユーザーがQ1の `1`（A: Approve Plan）を選択。

## 既決事項

- 本 intent は台帳データと消費契約の materialize までとし、application code、test、runner、collector、CI、tier-aware gate、#683、#1157を変更しない。
- measurement ref `3917a283a953165866170d235d3dc25ad2fd3643` のtreeをrepo外の一時領域でread-only再測定し、数値・行・verdictはコマンド出力からのみ採用する。
- 正式成果物は `code-summary.md` 1件とし、observedRef、tier×size matrix、全442 row、consumer contract、再現・検証証跡を収める。
- generic code-generationのapplication code/test要求より、承認済み上流と人間指示の実装Out境界を優先する。新規test/configはN/Aとし、既存テストと一時read-only validatorで検証する。

## Q1: U1 Code Generation計画を承認しますか

A. **Approve Plan（推奨）** — `code-generation-plan.md` のStep 1〜8を順に実行し、完了直後にcheckboxを更新する。application codeを変更せず、`code-summary.md` に442-row台帳と消費契約を正式materializeする。
B. **Request Changes** — 計画を修正して再提示する。変更したいStepまたは境界を指定する。
X. **Other** — 別の進め方を指定する。

[Answer]: A — Approve Plan（ユーザー回答: `1`）
