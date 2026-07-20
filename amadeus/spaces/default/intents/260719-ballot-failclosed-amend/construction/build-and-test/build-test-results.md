# Build Test Results — 260719-ballot-failclosed-amend

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 判定分離(deployment-execution:c3 語彙)

| 項目 | 判定 | 実測 |
| --- | --- | --- |
| typecheck / lint | PASS | builder exit 0 / 0(minor 修正後の再確認込み — typecheck 0) |
| t234 / t235 / t236 | PASS | 22 pass / 10 pass / 追加分 green(builder)、e4 が live e2e で独立再実測 |
| フルスイート --ci | PASS | RESULT: PASS、Failed 0/0(builder。ログ中の COVERAGE GATE FAILED 出力は gate 自身の negative fixture — --- FAIL マーカー 0) |
| 落ちる実証 | PASS | pre-fix 面切替で t234 1 error+t235 1 fail の赤 → fix SHA 復元で 32 pass(builder)+e4 独立再現 |
| corpus sweep | PASS | builder 42/98 赤 0 → e4 44/106 赤 0(glob 全数の件数追従実証) |
| lcov(diff 行) | PASS | 全配線行 DA>0 個別確認(builder)、in-process seam 追加不要 |
| PR #1273 CI | **PENDING** | 閉包条件 = head e5756ddc2 の「typecheck - lint - drift - tests」SUCCESS(現在 pending 実測)。確定値はマージ報告時に leader が実測 |
| マージ着地 | **PENDING** | 閉包条件 = ユーザー承認 → leader スカッシュマージ → state=MERGED 実測 |

- PASS: 上表の実行証跡あり項目のみ。PENDING を PASS と表記しない(report-final-values-only)。
- N/A: 専用性能・追加セキュリティ検査(各 instructions に反証可能根拠)。

## PENDING の消し込み手順

PR #1273 の CI SUCCESS を leader が実測 → ユーザー承認 → スカッシュマージ → state=MERGED 実測 → 本表の PENDING 2行を leader のマージ報告で確定値化(verify-before-notify)。Issue #1252/#1253 のクローズは着地面 grep 後(close-after-landing-verification)。
