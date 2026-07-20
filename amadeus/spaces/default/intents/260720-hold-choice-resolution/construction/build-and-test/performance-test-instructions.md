# Performance Test Instructions — tie-choice-resolution

上流入力: `construction/tie-choice-resolution/code-generation/code-generation-plan.md`、`construction/tie-choice-resolution/code-generation/code-summary.md`、`performance-design.md`。

## 適用判定

本変更は単発 CLI の固定長 token parse と、実測2〜5件の choice に対する線形走査である。performance-design P-1〜P-3 は専用 benchmark を不要と確定しており、外部サービス・並行負荷・長時間処理を追加しないため load/stress/soak test は非該当である。

## 代替検証

- unit/integration test で regex 1回、choice の bounded scan、既存 render 経路を通す。
- `bun run coverage:ci` の完走と既存 suite の timeout 非発生を性能退行の smoke signal とする。
- ループの非有界化、再帰、I/O 追加が diff に存在しないことをレビューで確認する。

専用数値を後付けせず、全 CI の exit 0 と設計の計算量不変を PASS 条件とする。
