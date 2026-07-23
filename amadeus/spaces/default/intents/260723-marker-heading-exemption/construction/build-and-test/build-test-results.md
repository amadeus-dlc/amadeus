# Build & Test Results — 260723-marker-heading-exemption

上流入力(consumes 全数): code-generation-plan、code-summary

測定 ref: 本線 merge 断面(origin/main の PR #1401/#1405 着地を merge 済みの team ブランチ HEAD)。全数値はコマンド出力からの転記。

## 実行結果(2026-07-23、全て実測 exit code)

| コマンド | exit | 要旨 |
|---|---|---|
| `bash tests/run-tests.sh --ci` | 0 | **RESULT: PASS** — Test files: 463 / Failed files: 0 / Total assertions: 6650 / Failed assertions: 0 |
| `bun run typecheck` | 0 | 両 tsconfig green |
| `bun run lint` | 0 | Biome error 0 |
| `bun run dist:check` | 0 | dist 6 ツリー drift なし |
| `bun run promote:self:check` | 0 | self-install 4 ツリー drift なし |

## FR-7 閉包(マージ後の本線断面で再実測)

Issue #1296 再現コマンド verbatim(配布コピー `.claude/tools/` 経由):

```
{"pass":true,"h2_count":0,"headings":[],"findings_count":0,"marker_exempt":true}
```

修正前の `{"pass":false,...,"findings_count":2}` から転回を維持(PR #1405 着地面でも成立)。

## 注記(advisory)

- wall-clock drift 1件: `tests/integration/t-codex-hooks-migration.test.ts`(declared=medium / measured=large)— 本 intent 非関連の既知負荷起因 advisory(cid:fanout-load-settle 系。e1 の 260723-t241 BT でも同一観測)。fail 条件ではなく RESULT: PASS に包含
- PR CI 側も全 green 済み(PR #1405: CI Success / Coverage base・head / typecheck-lint-drift-tests 全 pass、patch gate ローカル実測 11/11 covered)
