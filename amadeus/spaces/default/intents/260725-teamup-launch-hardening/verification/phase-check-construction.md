# Phase Boundary Check — Construction（260725-teamup-launch-hardening / #1476, #1478）

検証日時: 2026-07-26T00:30Z / 検証者: conductor（ソロモード） / スコープ: amadeus-feature / Standard depth / Test Strategy Minimal

測定 ref: `6e5a4ae62`（本 intent のブランチ HEAD）。数値はすべてコマンド出力からの転記。

## トレーサビリティ検証（construction 成果物 → 上流）

| ステージ | ユニット | 成果物 | 実在 | 上流トレース |
|---|---|---|---|---|
| functional-design | U1 / U2 | business-logic-model / business-rules / domain-entities | ✅ | application-design 5件 + units-generation + requirements |
| nfr-requirements | U1 / U2 | nfr-requirements | ✅ | requirements NFR-1〜8 / functional-design |
| nfr-design | U1 / U2 | performance-design / security-design | ✅ | nfr-requirements / functional-design |
| code-generation | U1 / U2 | code-generation-plan / code-summary | ✅ | 各ユニットの functional-design 3件 + nfr-design 2件 + unit-of-work + requirements |
| build-and-test | 全体 | 7成果物（build / unit / integration / performance / security / summary / results） | ✅ | 両ユニットの code-generation-plan + code-summary |

トレーサビリティの断絶なし。各成果物の冒頭「上流入力（consumes 全数）」行は宣言全数を列挙し、本文で実参照している（装飾トークンなし）。

## ゲートの整合

- **運用形態**: ソロモード。選挙・定足数・クロスレビュー2名・delegate 配送は非適用。
- **承認**: functional-design / nfr-requirements / nfr-design / code-generation の各ゲートをユーザー直接裁定で approved。build-and-test は本チェック作成後に approve する。
- **§12a reviewer**:
  - U1 functional-design 2 iterations（Minor→Major の順で control-flow 図の完全性を是正）
  - U1/U2 nfr-design 3 iterations（**Critical 1件** — 完了照合述語がディレクトリ実在で偽陽性になる設計欠陥を設計段で捕捉）
  - U1 code-generation 2 iterations
  - U2 code-generation 2 iterations（Major 1・Minor 1 を是正し閉包確認 READY）
- **§13**: functional-design 2件、nfr-requirements 2件、nfr-design 2件、code-generation 3件、build-and-test 2件を persist。
- **センサー**: 各ステージの最終発火で SENSOR_FAILED 増分 0。

## 実装の検証（実測）

| 検証 | 結果 |
|---|---|
| `bun run typecheck` | exit **0** |
| `bun run lint` | exit **0** |
| `bun run dist:check` | exit **0** |
| `bun run promote:self:check` | exit **0** |
| `bash tests/run-tests.sh --ci` | exit **0**（`RESULT: PASS`、FAIL **0件**） |
| PR ブランチ単独検証（U1） | 検証4種 exit **0** |
| PR ブランチ単独検証（U2、U1 に積んだ状態） | 検証4種 exit **0** |

各ユニットが**単独で deployable**であることを、PR ブランチを実際に分離して機械確認した（`cid:units-generation:c1`）。

## 配布面の同期

正本 `packages/framework/core/tools/team-up.sh` → **11 コピー**（正本1 + `dist/` 6ハーネス + セルフインストール4）。`dist:check` / `promote:self:check` の exit 0 で機械確認。

## 実 launch による受け入れ検証

| 構成 | アタッチ到達 | 終了コード | sentinel |
|---|---|---|---|
| 3人（U1 のみ、instance `bench4`） | 6.02秒 | 0 | 3/3 |
| 7人（U1+U2、instance `bench5`） | **11.80秒** | **0** | **7/7** |

`git worktree add`（7人構成）: 直列 7.77秒 / 並列度4 で **3.60・3.55秒** / 無制限 7.55秒。

計測は全て隔離インスタンスで実施し撤去した。`git worktree list` は計測前後とも 32件で一致し、agmsg team 登録・sentinel・actas ロックの残留は 0。

## 本 intent の成果の位置づけ（訂正を含む）

計測を並べた結果、**起動レイテンシ自体は前 intent（PR #1477）で既に解消していた**（200.85秒 → 5.87秒、3人構成）。本 intent の実質的な成果は次の2点である。

1. **#1384 の watcher 保護が実際に機能するようになった** — U1 が monitor モード時のスキップを入れ、actas 移行により検証が真に走る状態になった（7人で sentinel 7/7、exit 0）
2. **起動をさらに短縮した** — U2 の worktree 並列化で 7人構成の worktree 作成が 7.77秒 → 3.60秒

「速くなった」ことより「保護が効くようになった」ことが本質である。この位置づけは `code-summary.md` と `build-test-results.md` にも記載した。

## 引き継ぐ未検証事項

| 項目 | 状態 | 引き継ぎ先 |
|---|---|---|
| R-3: actas の受信範囲制限が配送を壊さないか | **未検証**。7人起動の成功は watcher が arm された証拠であって配送の証拠ではない | #1476 の実運用投入時 |
| R-6: Linux CI 上の並列度特性 | **未検証**。上限4は macOS 実測由来 | 上限を置く設計で吸収する想定 |
| `t-codex-hooks-migration.test.ts` の wall-clock drift（36.45秒） | **本 intent 由来ではない**（`bf84cdfaf` #1212）。`RESULT: PASS` を妨げない | 別作業 |

RAID の「resume 時の actas ロック残存」は**リスクが実在しなかった**ことを実測で確定した（所有 PID 全 DEAD → `actas_lock_gc_stale` が `reclaimed=4` → 残留 0。GC は `session-start.sh:171` が毎回呼ぶ既存機構）。本 intent の変更を要しない。

## 判定

**PASS（条件付き）**。条件は R-3 の未検証を明示引き継ぎすることであり、construction phase の成果物・検証・承認はすべて成立している。
