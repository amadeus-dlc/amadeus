# Build & Test Results — 260719-cursor-complete-clear

上流入力(consumes 全数): code-generation-plan, code-summary

測定 ref: bolt/fix-1248-cursor-clear head `176811547`(base origin/main `a326f47bc`)。実行主体: builder(worktree)+conductor 裏取り。数値は各コマンド出力からの転記(numbers-from-command-output-only)。

## 結果一覧

| 検査 | 結果 | 出典 |
| --- | --- | --- |
| bun run typecheck | exit 0 | builder 報告(22593bb8f/176811547 両時点)+conductor 再実行 exit 0 |
| bun run lint(Biome) | exit 0(変更ファイル新規 warning 0) | builder 報告 ×2 |
| tests/run-tests.sh --ci | RESULT: PASS — Failed files 0 / Failed assertions 0(388ファイル・5493 assert @22593bb8f、再実行 PASS @176811547) | builder 実測 |
| t243(回帰本体) | 7テスト 23 assert / 0 fail | conductor 再実行(このターン) |
| t07(fork/merge 非退行) | 21 pass / 0 fail(t243 併走) | builder 実測 |
| dist:check / promote:self:check | exit 0 / exit 0 | builder ×2+conductor 再実行(22593bb8f 時点) |
| complexity-gate --check | exit 0(NEW_VIOLATION 0) | builder ×2 |
| ローカル lcov(diff 追加行) | 測定対象29行 DA==0 0件、:732 DA=13 | builder 実測(lcov-wiring-line-checklist 適用) |

## 落ちる実証(E-GMECG 追補適用: fix コミット後の面切替・復元 ref 明示)

- pre-fix 全戻し(`git checkout origin/main -- <対象>`)→ t243 0 pass/1 fail(export 不在)
- audit のみ pre-fix → 抑止2テスト赤(`Expected: false / Received: true`)
- 復元(`git checkout 22593bb8f -- <対象>` 相当の HEAD 復帰+dist 再生成)→ 6 pass、git status クリーン
- reviewer(architecture-reviewer)が独立再現済み

## Origin repro 閉包(fix-review-replays-origin-repro)

conductor が scratch(repo 外・--project-dir/CLAUDE_PROJECT_DIR override)で #1248 の再現手順を修正版 dist に verbatim 再適用: カーソル消滅 / SENSOR_FIRED CLI 抑止(advisory+シャード 33行不変・lone-intent fallback 経路) / 実フック HUMAN_TURN 抑止(0件) / 完了監査4行は解放前記録。

## CI(PR #1258)

- 初回 head 22593bb8f: typecheck-lint-drift-tests SUCCESS / Coverage Report FAILURE(Patch coverage gate: UNCOVERED amadeus-audit.ts:732 — ジョブログ実文で帰属確定)
- 是正 176811547(handleAuditMerge export+in-process 駆動)push 済み。CI green 化は監視中 — 確定値はマージ報告時に leader が実測(report-final-values-only: 本表は push 時点の記録であり、CI 最終値は未確定として PENDING と明記)

## 判定分離(deployment-execution:c3 語彙)

- PASS: ローカル全検証(上表)・落ちる実証・origin repro 閉包
- PENDING: PR #1258 の CI Success green(閉包条件 = head 176811547 の CI Success SUCCESS)とマージ着地
