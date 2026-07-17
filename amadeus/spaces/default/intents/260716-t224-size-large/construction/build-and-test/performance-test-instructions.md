# Performance Test Instructions — 260716-t224-size-large

## 適用判断(N/A、根拠付き)

本 intent に承認済み性能 NFR は存在しない(bugfix スコープ、requirements.md に NFR なし — 上流 `code-generation-plan.md` / `code-summary.md` にも性能契約なし)。性能検査は戦略名からの機械追加をしない(build-and-test:c1 — 承認済み NFR と実在境界へ trace できる場合のみ選定)。

## 補足

t224 の wall-clock 実測(35.75〜46.03s 帯)は size 宣言の根拠データであり性能契約ではない — drift 表示は観測専用(run-tests.ts:915、t112 ピン)。
