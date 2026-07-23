# Requirements — 260723-fixture-shard-pollution(#1389)

上流入力(consumes 全数): business-overview、architecture、code-structure。

## Intent 分析

フルテストスイート実行が**実ワークスペースの active intent record** の audit へ fixture シャード(`<host>-fixturecloneid01.md`)を書き込む(Issue #1389、bug/P2/S3-MAJOR、クロスレビュー e4+e5 成立・e1 実スイート 2/2 再現)。architecture(codekb)の current view が示すとおり、欠陥は2段複合:

- **根(設計非対称)**: `recordEngineError`(`amadeus-orchestrate.ts:208-235`)だけが sibling 契約 `emitError`(`amadeus-lib.ts:5879`、projectDir 第1引数貫通)から逸脱し、projectDir を process.argv 再抽出+ambient `CLAUDE_PROJECT_DIR` フォールバック(`amadeus-lib.ts:253`)で解決する — in-process テスト駆動では argv に `--project-dir` が無く、ambient の実ワークツリーへ書き込む(汚染シャードの `Command:` 空欄はこの機序の直接痕跡)
- **増幅(プロセスキャッシュ)**: `_cloneId`(`amadeus-lib.ts:2448`、`:2503` で projectDir 無視 return)が同一プロセス内の先行 fixture テストで `fixturecloneid01` に汚染され、実 record への書込シャード名が fixture 値に混成する
- **犯人テスト**: `tests/integration/t248-stage-contract-routing.test.ts:507-527` — `withStageEnv` が `CLAUDE_PROJECT_DIR` を set しない唯一の in-process error 駆動サイト(対照 `advanceInProcess:420-431` は明示 set)。assertion は temp project の audit 空のみ確認する**偽経路 green** で ambient 汚染を検知しない

ゴールは**文書化済み挙動への回復**(テストは自分の fixture にのみ書く)であり bugfix スコープの範囲内。

- 対象 Issue: #1389(クロスレビュー2名成立済み)
- 原因所在: bootstrap 由来の設計非対称(`recordEngineError` 新設時 #839 の片側実装 — cid:symmetric-pair-review の実例クラス)。code-structure / code-quality-assessment に記録済み

## 機能要件(FR)

- **FR-1(修正対象集合)**: **根+増幅の両方**を修正する(E-FSPRA1 裁定 A、3-0)。(a) 根 = `recordEngineError` に projectDir を引数で受けさせ、argv 再抽出は「引数未指定時のフォールバック」へ降格(`emitError` :5879 との symmetric-pair 回復)。(b) 増幅 = `_cloneId` メモ化を projectDir キー付きへ(`:2503` の無条件 return 廃止)。留保転記: [e1] _cloneId の projectDir キー化は既存単一 project プロセスの挙動不変を落ちる実証の両側(汚染ケースが赤くなる+正当ケースが赤くならない)で固定してから完了扱いにすること。[e6] _cloneId の projectDir キー化は既存単一 projectDir 経路での挙動不変をテストで固定すること(NFR 面の回帰防止)。
- **FR-2(テスト側是正範囲)**: **犯人 t248 のみ**本 PR で env 隔離を是正し(`withStageEnv` へ `CLAUDE_PROJECT_DIR: project` を明示 — 既習 `advanceInProcess:420-431` 様式)、同型潜在 t118:378・要確認3本(`tests/unit/t211-swarm-batch-progress.test.ts:177` の in-process `handleNext([], proj)`(CLAUDE_PROJECT_DIR 隔離 grep 0件 — 2026-07-23 conductor 再実測)/ t251:80,222 / t212:630)は**実測のうえ**存在すれば Issue 起票する(E-FSPRA2 裁定 A、2-1。cid:same-root-inventory 準拠)。留保転記: [e6・B 票側] t118 の同型性は着手前に実測で再確認し、非同型と判明したら A(t248 のみ+Issue)へ縮退する。A 根拠注記: [e5] t118 未実測の同乗は実測起票規律に反する。
- **FR-3(回帰テスト)**: 「in-process error 駆動が ambient record を汚染しないこと」を assert する回帰テストを第一級成果物として追加する。ambient 側 fake project(state+active-intent 実在)を fixture として立て、**汚染ゼロを直接 assert** する — 現行 t248 の偽経路 green(temp 側のみの確認)を再演しない。落ちる実証: 修正前面で赤くなることを実測してから完成扱い(注入は fix コミット後・checkout 限定切替 — cid:falling-proof-no-stash)。
- **FR-4(既存挙動の非退行)**: 修正後も正規 CLI 経路(`--project-dir` 明示・spawn 実行)の ERROR_LOGGED 記録は従来どおり機能する(#839 の emit⇔terminal 対称は維持)。`emitMigrationError` の opt-out(recordError=false)も不変。

## 非機能要件(NFR)

- **NFR-1(CI green)**: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` green 維持。
- **NFR-2(dist/self-install 同期)**: 修正は `packages/framework/core/tools/` 正本を編集し、`bun scripts/package.ts`+`bun run promote:self` の再生成と `dist:check` / `promote:self:check` exit 0 を同一 PR に含める(project.md Mandated)。
- **NFR-3(依存追加なし)**: 新規 runtime dependency を追加しない。
- **NFR-4(カバレッジ)**: push 前にローカル lcov で diff 追加行の未カバー 0 を実測(cid:local-lcov-pre-push)。実 FS を使う回帰テストは integration 層に置く(cid:fs-tests-integration-first)。

## 制約

- bugfix スコープ(Minimal depth): 変更は外科的最小。修正面は Q1/Q2 裁定の対象集合+テストのみ
- 要求されない後方互換レイヤー・フォールバック分岐を追加しない(org.md Forbidden)
- `_resetCloneIdForTests`(`amadeus-lib.ts:4973`、既存 seam)の配線先(共有 fixtures teardown か犯人テスト個別か)は design 段の判断(RE 申し送り事項3)

## 前提

- t118:378 は同型シェイプ確定・実汚染未実測(RE 申し送り事項1)— Q2 裁定が A の場合は Issue 起票前に実測で確定する
- 汚染の実測系譜: e4 scratch 決定的再現 1/1(Issue #1389 コメント)・e1 実スイート 2/2(同)・機構照合4点は Architect 検証済み(re-scan record)

## Out of scope

- `die()`(`amadeus-utility.ts:135-146`)の同型シェイプ是正(in-process 駆動口なし — RE で対象外確定)
- 監査シャード様式・audit 機構一般の変更
- 過去に汚染された record の履歴 rewrite(既に除去済み・append-only 原則)

## Open questions

- (Q1/Q2 は選挙 E-FSPRA1/E-FSPRA2 で裁定済み — questions ファイルの [Answer]+裁定の記録、FR-1/FR-2 に反映済み)
- t118:378 の実汚染実測は FR-2 の Issue 起票前提として実装段で実施(前提節参照)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-23T03:03:40Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: Major 1件 — FR-2 の機構引用 t211:177 が実在しない(mechanism-cite-verify-at-draft 違反)。裁定転記・他引用・6次元は全て確認済み。

### Findings

- [Major] FR-2 の要確認3本の t211:177 が実在しない — tests/integration/t211-linter-lint-check.test.ts は147行で範囲外、in-process error 駆動の grep 0件。t251:80,222 / t212:630 は実在・妥当(reviewer 実測 evidence verbatim は scratch verdict ファイル参照)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-23T03:04:54Z
- **Iteration:** 2
- **Scope decision:** none

FR-2の t211:177 是正が実在・整合確認済み、他は退行なし

### Findings

- None
