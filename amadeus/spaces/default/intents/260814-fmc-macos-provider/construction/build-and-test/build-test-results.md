# Build & Test Results(intent 260814-fmc-macos-provider)

測定 ref: HEAD `1d49d9a57e4756d92739a1c0d12a07ade98922f0`(= PR #3007 head)。実行日 2026-08-14。

## 実測結果

| 検査 | コマンド | 結果 |
|---|---|---|
| Build | `bun run build` | exit 0(追跡ファイル不変) |
| 型検査 | `bun run typecheck` | exit 0 |
| リント | `bun run lint` | exit 0(error 0) |
| 患部 unit(4ファイル) | unit-test-instructions.md のコマンド | **29 pass / 0 fail**(181 expect) |
| 患部 integration(5ファイル) | integration-test-instructions.md のコマンド | **76 pass / 0 fail**(298 expect) |
| フルスイート | `bash tests/run-tests.sh --ci` | **RESULT: PASS — 992 files / Failed 0 / 13370 assertions / Failed 0**(commit `4a0379e9a` で実測。`git diff --name-only 4a0379e9a..HEAD` の非 record 差分は `metrics/2026-08-14T02-29-52-660Z-da5860f67d04.json` 1件のみ = テスト消費面に交差なし) |

## FR-3 / FR-7 の独立再検証(選挙 E-260814-CG-TDD-SUBSTITUTE の申し送り・reviewer FOLLOW-UP 対応)

t-formal-verif-tlc-spawn-planner.test.ts を最終 head で再実行し、FR-3(明示 provider 非フォールバック: inspect 呼び出し系列 assert + PROVIDER_PLATFORM)と FR-7(auto 選択の planner 種別マトリクス5組)を含む 9 pass / 0 fail を確認(上表 unit 29 pass に包含、単独実行でも 9 pass を実測済み)。

## 失敗と是正の記録

- merge 前のフルスイートで既存赤2件を観測: t528(ambient isolation、Issue #2981 — #3000 が origin/main に着地済みで、merge 取込後の再実行で解消を実測)、t99(dist コピーの transient — 単独再実行で緑)。いずれも本 intent の変更由来でないことをベース比較で切り分け済み(code-summary.md)。
