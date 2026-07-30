# Issue #1664 Code Generationサマリー

## 入力と配送

`unit-of-work.md`とuser storiesは`amadeus-bugfix`スコープでexpected absentのため補完せず、`requirements.md`のFR-1664-1〜3、FR-CROSS-1〜4、NFR-1、NFR-4〜6へ直接追跡した。

- 対象: [Issue #1664](https://github.com/amadeus-dlc/amadeus/issues/1664)
- 配送: [PR #1687](https://github.com/amadeus-dlc/amadeus/pull/1687)、2026-07-29 merge
- merge commit: `b52a3f36c0290a5b466248fc0c4a00ee798f7d0d`
- 実装変更: 既存の`tests/helpers/upstream-v2-fixture.ts`、`tests/integration/t224-upstream-v2-migration-cli.test.ts`に加え、2026-07-30 revisionで専用boundary helper、unit、対象E2Eを追加
- 製品のmigration、doctor、clone-id、audit-lock、timeoutと生成物は変更していない。

## 根因証拠と要件再確定

実装が確立したのは、並列fixtureがOS一時領域のaudit-lock namespaceを共有し、異なるidentityがMD5先頭8桁の同一lock pathへ衝突できる機構である。制御fixtureは衝突pairを探索し、生存ownerで共有lockを占有すると、migrationが`status=1`、`Failed to acquire audit lock after retries`、rollbackへ到達することを示す。migration／installed doctor subprocessへfixture固有の`.git/amadeus-test-audit-locks`を渡すと同じcaseが成功する。明示的な`extraEnv`は後勝ちなので、共有lock baseの失敗注入は維持される。

ただし、元の2026-07-28 CI失敗はstdout／stderrを保存していない。したがって、元事象が同じ衝突だったことは事後証明できず、「元CIの確定根因」ではなく「同じstatus 1を生む制御可能なfixture競合」と記録する。

`requirements.md`の「最終根因は未確定で、Issue仮説を固定しない」というAssumptionは探索結果と整合する。一方、FR-CROSS-2は異なる根因を得た場合の要件・受け入れテスト更新を実装前に要求する。Git順序は修正`40f31589a`、決定的衝突fixture`a26c78422`であり、この歴史的順序は事後修正できない。ユーザーは2026-07-30のCode Generation Revision 2で、この過去の順序と実装前再確定証拠の欠落だけを明示的にwaiveした。

## FR-CROSS-2限定waiver

- 適用範囲: #1664の過去の実装順序と実装前再確定証拠の欠落だけ。
- 非適用範囲: ほかのBolt、今後の#1664変更、修正後Green、関連suite、根因証拠の保存。
- 代替統制: audit-lock衝突の制御Red→Green、4境界の決定的失敗注入、clone-id反復安定性、symlink target metadata不変性、unit／integration／E2E。
- 残余リスク: 元CIのstdout／stderr欠落により直接原因は事後確定できず、audit-lock衝突を元CIの確定根因とは扱わない。

## 境界別の遅延・失敗注入

| FR-1664-2境界 | 現存する証拠 | 判定 |
|---|---|---|
| symlink解決 | `runCloneIdDoctorBoundaries.resolveSymlink`を失敗注入し、boundary名とcleanup実行をassert | 個別注入済み |
| clone-id導出 | `deriveCloneId`を失敗注入し、実`auditCloneId`をcache reset間で2回比較 | 個別注入・反復比較済み |
| process起動 | `launchProcess`を失敗注入し、integration／E2Eではinstalled Bun processを実行 | 個別注入・実process済み |
| fixture cleanup | `cleanup`自体を失敗注入し、前3境界の失敗時にもcleanupが必ず走る | 個別注入済み |
| 実測追加境界 | 共有audit-lockを生存ownerで占有し、status 1とrollbackを再現 | audit-lock境界だけは制御Red→Greenあり |

4境界は専用test-side portへ分離して個別注入した。unitのfakeはboundary識別だけを担い、integration／E2Eの実symlink、実`auditCloneId`、実installed processと組み合わせて検証劇場を避ける。

## 診断契約と例

`expectSuccessfulMigration`は成功時に即returnし、非0時だけclone-id論理／target path、command、exit path、status、signal、spawn error、stdout、stderrを例外へ含める。テストで固定されたexit-status例は次の形である。

```text
migration subprocess failed
clone-id logical path: "workspace/.clone-id"
clone-id target path: "/tmp/fixture/sentinel.txt"
command: "/usr/bin/bun" "amadeus-migrate.ts" "--apply"
exit path: exit-status
status: 1
signal: (none)
error: (none)
stdout:
{"status":"failed"}
stderr:
doctor failed
```

これは診断formatterへ与えたsynthetic結果の期待例であり、元CI subprocessから回収したログではない。

## Comprehensiveテスト戦略

| 層 | 適用と実績 | 判定 |
|---|---|---|
| Unit | `tests/unit/t224-clone-id-doctor-boundaries.test.ts`が4境界注入、実clone-id反復、target metadataを検証 | 6件Green |
| Integration | t224が実migration CLI、installed doctor subprocess、Git rollback、symlink、audit-lockを通し、対象caseでdoctorを2回実行 | 62件Green |
| E2E | `tests/e2e/t224-clone-id-doctor.test.ts`がinstalled migrator→installed doctor 2回の利用者経路を通す | 1件Green |

修正前Redについては、元CI runが`result.status=1`を記録し、最終test内でも共有baseの制御条件がstatus 1、隔離baseがGreenとなる。今回追加した4境界fixtureも各境界を決定的に失敗させる。ただしGit履歴上、既存修正commitが決定的衝突fixtureより先だったという歴史的なtest-first順序は事後変更できないため、残余として明記する。

## 双方向追跡

| 要件 → test／証拠 | 逆方向のtest／証拠 → 要件 | 状態 |
|---|---|---|
| FR-1664-1 → `migration success diagnostics preserve ...` 3 cases、`expectSuccessfulMigration`、元CI診断欠落 | 診断3 casesと対象symlink case → FR-1664-1 | 充足 |
| FR-1664-2 → lock衝突caseと専用4境界unit | 4境界unit → 個別失敗識別、t224／E2E → 実境界の非退行 | 充足 |
| FR-1664-3 → `installed doctor derives ...`、専用unit／E2E | cache reset間の導出値一致、target metadata比較、doctor 2回 → 安定性／不変性 | 充足 |
| FR-CROSS-1／4 → [PR #1687](https://github.com/amadeus-dlc/amadeus/pull/1687)、Issue close、CI run | 1 PR・既存2 test files＋revision 3 files・本記録 → #1664だけを配送 | 1対1を維持 |
| NFR-1／6 → 制御lock占有、4境界注入、rollback、unit／integration／E2E、typecheck、lint | lock Red→隔離Green、全focused Green → reliability／testability | revision実装面は充足。歴史的test-first順序は残余 |
| NFR-4 → Ubuntu 24.04 CI、macOS 26.5.1 arm64実行 | 既存t224は両OS Green、revisionの値／metadata契約はmacOS Green | revision後Linux再実行待ち |
| NFR-5 → test-only 2ファイル、既存env seam再利用 | 最小fixture変更 → maintainability | 充足 |

## OS・互換・不変条件の具体証拠

- Linux: [GitHub Actions run 30445827782のTests job](https://github.com/amadeus-dlc/amadeus/actions/runs/30445827782/job/90558381289)はUbuntu 24.04、Bun 1.3.13、`bun run test:ci -- -P 4`で、診断3 cases、symlink doctor case、lock衝突caseを含むt224を62 pass／0 fail／576 expectsで完了した。[Coverage Report (head)](https://github.com/amadeus-dlc/amadeus/actions/runs/30445827782/job/90558413627)も同じ対象caseをGreenにした。
- macOS: merge commit archiveをmacOS 26.5.1、Darwin arm64、Bun 1.3.13で`bun test --timeout 120000 tests/integration/t224-upstream-v2-migration-cli.test.ts`として再実行し、62 pass／0 fail／576 expectsだった。
- clone-id互換: 製品コードを変更せず、`_resetCloneIdForTests`を挟む2回の`auditCloneId`値一致とinstalled doctor 2回の成功をunit／integration／E2Eで固定した。
- symlink target: target内容、移送後symlink種別・link先に加え、外部targetのmode、uid、gid、size、mtime、inodeをbefore／after比較した。atimeは読取り自体で変化し得るため不変条件へ含めない。
- rollback／audit: lock衝突時は`rollback={attempted:true, restored:true}`、real doctor失敗caseはworkspace snapshotとGit index treeの復元、成功caseは`GUARDRAIL_LOADED`／`HEALTH_CHECKED`をassertする。
- CI: [PR #1687](https://github.com/amadeus-dlc/amadeus/pull/1687)ではTests、Coverage、Typecheck、Lint、Dist and self-install drift、CI Successが成功した。timeout延長、serial化、製品変更はない。

## waiverと残余リスク

- FR-CROSS-2: 実装前再確定証拠の欠落と、決定的fixtureが修正commit後に追加された歴史的順序は限定waiverで受容済み。
- 元CI直接原因: 失敗時stdout／stderrが保存されておらず、元事象がaudit-lock衝突だったことは確定できない。
- NFR-4: revision後の新規unit／E2EはmacOSでGreenだがLinux CIでは未実行。既存t224はrevision前merge SHAでUbuntu Greenの証拠がある。

## Revision 3 検証

- `bun test --timeout 120000 tests/unit/t224-clone-id-doctor-boundaries.test.ts tests/integration/t224-upstream-v2-migration-cli.test.ts tests/e2e/t224-clone-id-doctor.test.ts` → 69 pass／0 fail／608 expects
- `bun run typecheck` → exit 0
- `bun run lint` → exit 0。既存cognitive-complexity warningのみ。
- revisionはcommit `ddf2494abca68286f81f44438eee802deb040e0a`としてpushし、[PR #1714](https://github.com/amadeus-dlc/amadeus/pull/1714)をdraftで作成した。既存[PR #1687](https://github.com/amadeus-dlc/amadeus/pull/1687)のmerge状態は変更していない。

以上により、今回承認された実装・テスト未解決項目は閉じた。歴史的順序は限定waiverで受容し、元CIログ欠落とrevision後Linux未実行は残余リスクとして分離する。

## Revision 2 follow-up配送

- 最新`main`上で69 pass／608 expects、`bun run typecheck`、`bun run lint`が成功した。
- [PR #1714](https://github.com/amadeus-dlc/amadeus/pull/1714)は#1664だけを含む1 commitのdraftである。Linux CIはPR checkで確認する。
