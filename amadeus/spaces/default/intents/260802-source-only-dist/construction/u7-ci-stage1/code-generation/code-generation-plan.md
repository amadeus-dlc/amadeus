# Code Generation Plan — u7-ci-stage1

上流入力(consumes 全数): business-logic-model(段階1の3変更と `bun run build` 所有)、business-rules(BR-U7-1〜6)、domain-entities(CI 構成の不変条件)、performance-design(build 回数と隔離)、security-design(temp 境界とログ制約)、unit-of-work(u7 の独立境界)、requirements(FR-4.1、FR-3.1 の単一コマンド面、NFR-1)。補助入力として application-design(C7 段階1)、unit-of-work-story-map(Slice 2)、delivery-planning(Bolt 6)を参照する。

## 前提と変更境界

- 本 Unit は `self-feature` の u7 段階1であり、`package.json`、`.github/workflows/ci.yml`、`tests/run-tests.ts`、および当該契約のテストだけを変更する。
- u8 の原子切替まで、既存 `dist:check`、`promote:self:check`、`amadeus-graph.ts compile --check` と `detect-ci-changes` を維持する。
- `dist/`、self-install 生成物、ignore/allowlist、既存テスト本体は直接編集しない。
- 現行 `scripts/package.ts` は tracked `dist/**/stage-graph.json` を compile seed に使うため、u7 段階1ではその seed を維持する。dist 不在からの bootstrap は u8/C8 の再設計事項として一時的な未充足を明示する。
- 公開テスト境界は root package script、CI workflow、run-tests CLI、tracked seed を含む独立一時tree、再現性比較結果とする。内部実装をmockせず、実ファイル・実process経由で観測する。

## 成功条件

1. `bun run build` が dist と self-install を順序どおり生成し、先行失敗を後続へ伝播する。
2. dist 不在または空の repository で test runner が exit 1 と build 案内を返し、dist 実在時は既存runner契約へ進む。
3. full CI の dist-consuming test job は test/coverage/e2e 実行前に build を1回完了する。
4. 再現性jobは固定SHAから作った2つの独立一時treeで、tracked compile seed を保持したままそれぞれ専用workspaceへ build し、生成bytesを比較する。共有出力先で並行buildしない。
5. dist 不在/空を run-tests 入口ガードが検出して失敗し、比較差分は内容ではなくpathだけを出す。
6. 旧drift checksはworkflow内に残り、既存CI契約テストもgreenを維持する。

## 実装計画(Comprehensive test strategy)

- [x] Step 1: 既存workflow、runner、package script、CI静的検査、テスト設定を棚卸しし、fresh-clone・presence guard・再現性比較の公開seamを確定する。Trace: Slice 2 / FR-4.1 / FR-3.1 / NFR-1。
- [x] Step 2: workflow契約の失敗テストを追加し、`bun run build`、build-before-test、専用tree 2回build、byte比較、旧drift checks保持を静的に検証してRedを実測する。Trace: BR-U7-1、BR-U7-3、BR-U7-5、BR-U7-6。
- [x] Step 3: dist不在/空・故意のbyte差のprocess/FS統合テストを追加し、公開CLIのRedを実測する。Trace: BR-U7-2、BR-U7-4、NFR-1、security-design。
- [x] Step 4: `package.json` に `build` scriptを最小追加し、dist→promote:selfの依存順序と失敗伝播をGreen化する。Trace: FR-3.1、BR-U7-5。
- [x] Step 5: `tests/run-tests.ts` の入口にdist不在/空のfail-closed guardと一元化した案内文を追加し、正常・不在・空の各テストをGreen化する。Trace: FR-4.1、BR-U7-2、BR-U7-4(a)。
- [x] Step 6: `.github/workflows/ci.yml` のdist-consuming jobへbuild前段を追加し、テスト開始前の依存順序と失敗伝播を静的契約でGreen化する。Trace: FR-4.1、performance-design、reliability-design。
- [x] Step 7: `.github/workflows/ci.yml` に再現性jobを追加する。tracked compile seed を含む2つの独立一時treeを直列にbuildしてbytesを比較し、差分pathのみを表示する。Trace: NFR-1、BR-U7-3、BR-U7-4(b)、security-design。
- [x] Step 8: test設定は既存Bun runner/size分類を再利用し、新規設定が不要であることを確認する。対象テスト、typecheck、lint、workflow YAML parse、既存drift checks、tracked seed を含む独立treeでのbuild 2回同一性を実行してGreenを実測した。dist除外treeの失敗原因も特定し、u8/C8へ明示的に繰り越した。Trace: Comprehensive戦略全体。
- [x] Step 9: 最終diffと `git status` を確認し、担当外・入力成果物・state・audit・生成物をstage対象から除外する。planの全checkboxを実績に合わせて更新し、日本語 `code-summary.md` を作成する。Trace: u7 Unit境界 / delivery-planning Bolt 6。
- [x] Step 10: 実装・テスト・plan・summaryだけをpath指定でstageし、英語Conventional Commitでcommitする。Trace: Bolt 6 出荷単位。

## 非適用項目

- API、repository/data access、database migration、frontend、deployment/IaCは本Unitに実在境界がなくN/A。
- 性能テストはworkflow内のbuild回数・順序のcounter assertionで検証する。常駐service・負荷境界はない。
- security検証はtemp tree隔離、symlinkを比較対象として辿らないこと、差分内容をログしないことに限定する。新しいcredential・network境界はない。
