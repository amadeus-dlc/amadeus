# U4 clean-env-e2e Code Generation Summary

## 実装結果

- `tests/e2e/t267-clean-env-team-mode.serial.cli.test.ts` を新設した。
- 固定5ケースだけを実装した。
  1. 配布 `team-up.sh` → `team-msg.sh send` → election `open` / `vote` / `tally`
  2. herdr不在のfail-fast
  3. agmsg不在のfail-fast
  4. fake unameによる非対応OSのfail-fast
  5. doctorのfound/missing advisory
- 本番コード、`packages/framework/`、`scripts/`、`dist/`、self-install正本は変更していない。
- U2/U3の既存変更、監査ログ、`.agmsg-ballots` は変更・巻き戻ししていない。

## 隔離と被検体

- 各ケースの`beforeEach`でtemp root、HOME、隔離PATH、workspace、配布コピー、fake群を生成し、`afterEach`で全削除する。
- 子プロセスenvは必要キーだけを新規構築し、`process.env`を継承・spreadしない。
- `dist/claude/.claude` をtemp workspaceへコピーし、そのコピー配下のtoolだけを実行・importする。
- fake herdr/agmsg/unameは公開契約で必要な最小verbだけを持ち、未知herdr verbはexit 2とする。
- `.serial.cli.test.ts` によりrunnerの直列bandとcoverageのCLI mechanismを同時に明示する。

## 検証結果

| 検証 | 結果 |
|---|---|
| 新規E2E単独 | 5 pass / 0 fail、89 expects、約1.8〜2.3秒 |
| U2/U3関連回帰 | 36 pass / 0 fail、236 expects、約6秒 |
| coverage付き新規E2E | 5 pass / 0 fail |
| doctor LCOV | temp配布 `amadeus-utility.ts` を`SF`として収集し、例: `DA:455,82`、`DA:457,36`、`DA:458,68`、`DA:2555,39` |
| bash error path | herdr/agmsg/Plan9固有stderr、fake未呼出し、副作用0を各ケースで確認 |
| `bun run typecheck` | pass |
| `bun run lint` | exit 0（既存complexity warningのみ） |
| `bun run dist:check` | pass、全6 harness同期 |
| `bun run promote:self:check` | pass、全4 self-install同期 |
| coverage registry check | pass、fresh・guards green・ratchet held |
| `bash tests/run-tests.sh --ci` 最終再実行 | 476 files、6801 assertions、0 fail、RESULT: PASS |
| `git diff --check` | pass |

初回全CIでは、新規ファイル名がcoverage上`none→cli`へ再分類され、固定集合テストが1件failした。所有外のunit期待値は変更せず、ファイル名を`.serial.cli.test.ts`へ修正してserial配置とCLI mechanismを明示し、該当47 testsと最終全CIの両方をgreenにした。

## Skip・Advisory

- AWS credentialsが無効または失効しているため、live SDK/substrate testsはskipされた。
- Claude substrate unavailableとしてlive Claude系テストがskipされた。
- 最終CIのwall-clock観測では `tests/integration/t-codex-hooks-migration.test.ts` がdeclared medium / measured largeのadvisoryとなった。CI結果には影響しない。

## トレーサビリティ

- FR-6a: temp HOME、隔離PATH、配布コピーによるteam-up→team-msg→election journey
- FR-6b: fake herdr/agmsg、およびfake uname
- FR-6c: missing dependency、unsupported OS、doctor advisory、LCOV `DA`、固有stderr
- BR-1〜BR-6: 配布境界、隔離、fake境界、固定5ケース、ケース独立、到達証拠
- NFR: Security、Reliability、Performance、Scalability
