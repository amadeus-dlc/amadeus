# Integration Test Instructions — 260716-t224-size-large

## 上流入力

`code-summary.md` AC-1c/AC-2c(drift 閉包+スイート green)と `code-generation-plan.md` の落ちる実証手順に対応。

## 実行手順

- `bash tests/run-tests.sh --integration --filter t224` — 期待: 58 pass / `wall-clock drift: 0 file(s)` / RESULT: PASS / exit 0
- `bash tests/run-tests.sh --smoke` — 期待: RESULT: PASS / exit 0

## 落ちる実証(リグレッション根拠)

`// size: large` 行を一時削除して同コマンドを実行すると `wall-clock drift: 1 file(s)`(declared=medium measured=large)が再現する — 検証後は `git checkout --` で復元すること。
