# Build & Test Results — 260704-grilling-mode-wiring

実行日: 2026-07-04
実行環境: build workspace（`claude/issue-442-grilling-wiring` branch、未コミット working tree）
実行手順は build-instructions.md と unit-test-instructions.md に従った。
対象の実装内容は `../implicit/code-generation/code-summary.md`、計画は `../implicit/code-generation/code-generation-plan.md` を参照する。

## ビルド結果

| コマンド | 結果 |
|---|---|
| `npm run typecheck` | pass（`test:all` 連鎖内で実行、エラー 0） |
| `npm run lint:check` | pass（同上、違反 0） |

## テスト結果

`npm run test:all`（= `test:ci:mock` 連鎖）を完走し、**exit code 0（PASS）** を確認した。

| 連鎖内の検証 | 結果 |
|---|---|
| `typecheck` | pass |
| `lint:check` | pass |
| `contracts:check` | pass |
| `parity:check` | pass（38 skills、197 engine files、`engineFileExceptions` 空のまま） |
| `claude-wiring:check` | pass |
| `grilling-wiring:check`（本 Intent で新設） | pass（`grilling wiring: ok`） |
| `test:it:all`（`test:it:grilling-wiring`、`test:it:promote-skill` を含む） | pass |
| `test:it:engine-e2e` | pass（intent-birth、run-stage directive、produces 不在拒否、human presence 拒否、audit shard 生成の全項目 ok） |
| `diff:check` | pass |

失敗・スキップは 0 件である。

## TDD 証跡（code-generation ステージからの通算）

- RED 1: 実装前の実 repo で `check-grilling-wiring.ts` が annex マーカー 8 件欠落 + 29 skill の旧文言残存を検出して exit 1。
- GREEN 1: 結線実装 + 昇格後に pass。
- RED 2: レビュー指摘（annex の engine-bridge 相対パス切れ）を受けてパス実解決検査を追加し、実 repo で該当 2 件（source と昇格先）を検出して exit 1。
- GREEN 2: パス修正 + 再昇格後に pass。fixture eval は正常 1 + 異常系 5（旧文言残存、annex マーカー欠落、source/昇格先不一致、相対パス切れ ほか）がすべて期待どおり判定。

## カバレッジ

R006 の検査観点 3 つ + レビューで追加したパス実解決の計 4 観点すべてに、実 repo 検査と fail fixture の両方が存在する。
