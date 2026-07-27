# Build & Test Summary — 260726-t258-p95-flake

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-t258-p95-flake/code-generation/ — 検証対象と実測 exit code の導出元)。結果の正本は build-test-results.md(engine 宣言名)。

## 要約

- 修正: t258/t257 の性能契約判定を p95 絶対 ceiling → **median 基準の絶対予算**へ(予算値不変・ユーザー承認済み契約変更)。述語は tests/lib/ の canonical 1定義+fail-closed
- プロセス: builder が実装前実測で当初裁定の前提(noop 相関)を反証 → 逸脱停止 → 再裁定 C — 逸脱規律の模範例
- 残作業: push → PR → CI 実測 → マージ承認 → #1511 クローズ(close-after-landing)

## テスト戦略整合(Minimal)

新規テストは FR へ trace する unit(述語)+既存統合の配線のみ。性能・セキュリティの新規検査は比例選定で追加なし。
