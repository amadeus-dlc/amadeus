# Build & Test Results — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../code-generation/code-generation-plan.md`(検証列定義)、`../code-generation/code-summary.md`(出荷物)。測定 ref: 本線取込済みツリー(merge 0a1c5a328 = origin/main aa97a789d 包含)、2026-07-17 fresh 実行。

## ビルド検証(4コマンド)

| コマンド | exit | 備考 |
|---|---|---|
| `bun run typecheck` | 0 | 初回 127 は node_modules 未整備(実文「tsc: command not found」)— `bun install --frozen-lockfile`(257 packages)後に 0。環境起因で変更起因ではない(local-ci-red-assertion-verbatim) |
| `bun run lint` | 0 | |
| `bun run dist:check` | 0 | 全ハーネス in sync — docs/guide 非配布の機械確認を兼ねる |
| `bun run promote:self:check` | 0 | self install in sync |

## テストスイート(fresh 実行)

`bash tests/run-tests.sh --ci` → **exit 0 / RESULT: PASS**

- Test files: **367** / Failed files: **0**
- Total assertions: **5121** / Failed assertions: **0**
- wall-clock drift: 0 file(s)(ランナー予算契約 green — performance 面)
- 集計コマンド: `grep -E "Test files|Failed" <ci ログ>`(numbers-from-command-output-only)

## カバレッジ / patch gate

N/A — 本 Bolt はコード変更ゼロ(docs 2+record 1、PR #1130 squash aa97a789d の実 diff)につき patch 母集団なし。PR CI は着地済み(MERGED — マージはユーザー承認済み・leader 執行)。

## 判定

**PASS** — ビルド4コマンド+全層スイートが本線取込済みツリーで green。非退行を実測確認。
