# Build & Test Results — Amadeus Grilling 統合

**Date**: 2026-07-07 / **Stage**: build-and-test (3.6) / **対象**: code-generation の変更セット(48編集+9新規)

## 結果一覧

| 検証 | 結果 |
|---|---|
| `bun scripts/package.ts --check`(dist ドリフトガード) | ✅ PASS(全4ハーネス in sync) |
| `bun run typecheck`(tsconfig + tests) | ✅ PASS |
| `bun test t199`(新設 — 配布/分類/帰属) | ✅ PASS(18 tests, 32 expects) |
| `bun test t68`(バンプ3点同期) | ✅ PASS(7 tests) |
| `bash tests/run-tests.sh`(230ファイル、smoke+unit+integration) | ✅ ベースライン同一 — 失敗8ファイル(t11/t38/t65/t66/t140/t174/t19/t130)は main 由来の既知問題と完全一致。**本変更起因の新規失敗ゼロ** |
| `bun run lint` | ⚠️ 既知の失敗のみ(tests/harness/kiro-acp-drive.ts — main 由来、本変更と無関係) |
| `bun run promote:self:check` | ❌ **FAIL(2件)— 本変更起因ではなくフレームワークの既存ギャップ**(下記) |

## promote:self:check 失敗の分析

検出: `DIFFERS: .claude/tools/data/scope-grid.json` / `ORPHAN: .claude/scopes/amadeus-grilling-integration.md`

**根本原因**: 本ワークフロー自身が使う**合成スコープ(composed scope)のランタイムファイル**を、promote-self のパリティ検査が dist 由来でないため drift と誤認する。合成スコープはコンポーザーの正規の書き込みパス(ランタイム追記、dist に含まれない)であり、promote-self の preserved リストに `.claude/scopes/` の合成分と scope-grid.json の追記エントリが含まれていないことによる衝突。**ドッグフーディング環境(このリポジトリ自身)でのみ発生**し、grilling 実装の欠陥ではない。

**影響**: 合成スコープのワークフローが in-flight の間、このリポジトリで promote:self:check が赤になる。CI が同チェックを走らせる場合、コミットがブロックされる。

**推奨対応**(ゲート判断事項): `scripts/promote-self.ts` に合成スコープの保全(dist に無い `.claude/scopes/amadeus-*.md` の保持+scope-grid.json の追記エントリのマージ)を追加する小修正。本 intent のスコープ外のため、別 issue / フォローアップとするか、同一リリースに含めるかは人間の判断に委ねる。

## 判定

**実装本体の品質ゲートはすべてグリーン**(NFR-3: 既存互換 / NFR-4 のうち dist・typecheck・t68 / NFR-5: t199)。promote:self:check の赤はフレームワーク既存ギャップの顕在化であり、grilling 変更セットの合否には影響しないと判定する。
