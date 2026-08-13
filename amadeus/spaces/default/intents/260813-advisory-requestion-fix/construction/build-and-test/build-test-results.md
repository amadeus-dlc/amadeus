# Build & Test Results — intent 260813-advisory-requestion-fix

測定 ref: conductor ツリー HEAD `23eef2e09`(= PR #2980 head。bolt merge + origin/main `8b6089275` 取込後)。全て本ツリーでの実測。

## Build

| 項目 | 結果 | コマンド |
|---|---|---|
| build | exit 0 | `bun run build` |
| 追跡ファイル不変 | 0 行 | `git status --porcelain \| wc -l`(build 後) |
| typecheck | exit 0 | `bun run typecheck` |
| lint | exit 0(警告465は既存) | `bun run lint` |

## テスト

| 実行 | 結果 | コマンド |
|---|---|---|
| advisory 対象10ファイル(直列) | **142 pass / 0 fail**(442 expect) | `bun test tests/integration/t2967-*.integration.test.ts tests/unit/t457… t459… t458… t526… t528-authoring… t-advisory-choice-record… t-advisory-human-choice-boundaries… tests/unit/t113.test.ts` |
| フルスイート | exit 1 — **fail 1件のみ**: `t528-report-ack-kind`(既知の不安定、#2981。origin/main 単独でも再現) | `bash tests/run-tests.sh --ci`(ログ: scratchpad `bt-fullsuite2.log`) |
| 落ちる実証(code-generation 段で実施) | 実装3ファイルを base `97581b3e` へ戻し新テスト → 10 fail / 1 pass → 復元後残渣 0 行 | `git checkout 97581b3e -- <3 files>; bun test <t2967 2ファイル>; git checkout HEAD -- <3 files>` |

## 失敗の帰属(実測)

- `t528-report-ack-kind` 1 fail: 未改変 origin/main の隔離 worktree でも fail(集合は入れ替わる= state 依存の隔離不足)。**本 intent 由来ではない** — #2981 起票済み
- 前回スイートの team-up 16 fail: PR #2975 がテスト群ごと削除し解消(#2978 に追記済み)
- 初回並行実行時の t2967 timeout: フルスイートとの並行負荷起因(cid:code-generation:c1-coverage-single-owner 違反を自認) — 直列再実行で 142 pass / 0 fail を確定

## CI 検証面(ローカル実測範囲外 → PR #2980 CI)

隔離2回ビルド再現性 / source-only 境界 / グラフ不変量 / Project Coverage Gate(絶対+相対 AND)/ Patch Coverage Gate / plugin-conformance-e2e は PR #2980 の必須 CI で実測する(code-summary.md の未検証面の書き分けと同一)。
