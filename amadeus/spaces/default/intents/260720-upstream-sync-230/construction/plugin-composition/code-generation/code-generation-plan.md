# plugin-composition コード生成計画

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`domain-entities.md`(functional-design)、`reliability-design.md`、`logical-components.md`(nfr-design)、`component-methods.md` C4(application-design)、`requirements.md` FR-6 item 20。

## 対象と成功条件

- 対象ユニットは U10 `plugin-composition`(C4)のみ。**機構のみ**を実装し、reference plugin `test-pro` の内容・authoring guide(U11)、ledger closure(U12)は所有しない。
- 公開シームは `component-methods.md` C4 の正準6関数のみ:
  - `inspectPlugin(plugin: PluginDescriptor, host: HostSnapshot): PluginPlanResult`
  - `planPluginComposition(plugin: ValidPlugin, host: HostSnapshot): PluginCompositionPlan`
  - `applyPluginPlan(plan: PluginCompositionPlan, tx: WorkspaceTransaction): ApplyResult`
  - `planPluginDrop(record: PluginRecord, host: HostSnapshot): PluginDropPlan`
  - `applyPluginDrop(plan: PluginDropPlan, tx: WorkspaceTransaction): DropResult`
  - `diagnosePlugins(host: HostSnapshot): readonly PluginDiagnostic[]`
  - `discoverPlugins(sourceRoot, io): readonly PluginDescriptor[]` は C4 **内部 helper**(E-OC1 裁定 A)であり公開 seam に数えない。
- 受入の核(requirements.md FR-6 item 20 受け入れ基準):
  - Given 同名stage/不正manifest/未知seam、When compose、Then 既存 bytes 不変で非0(rejected)を返し、理由を drop/audit/doctor の適切な面へ残す。
  - no-clobber stage copy、`produces`/`consumes`/`sensors`/`required_sections` の seam merge、宣言済み fragment splice、self-heal compile、drop record、doctor 可視化を決定的に行う。
  - 衝突・malformed plugin・部分適用は loud failure とし、host bytes・composition record・audit を半端に変更しない(BR-U10-10)。

## 配置と境界(U09 先例に整合)

- 新規モジュール `scripts/plugin-composition.ts` に C4 のロジックを凝集する(U09 の `scripts/plugin-projection.ts` と同じ配置方針)。`scripts/` は dist へ投影されないため、正本 `packages/framework/core/` / `harness/` を触らず、dist/self-install は不変(NFR-3/4)。
- U01 の `scripts/`?→ 実際には U10 は `packages/framework/core/tools/amadeus-stage-schema.ts`(U01)の `SeamName` 相当語彙を **参照のみ**で使う。stage schema の seam field 名(`produces`/`consumes`/`sensors`/`required_sections`)を正本とし、独自定義を第二正本にしない(BR-U10-12)。
- U09 の projected bundle(`dist/plugins/<name>/`)は `discoverPlugins` の入力 root。U09 の byte 投影と U10 の host compose は別 workflow(services.md「同一 transaction にしない」)。

## 設計判断(U10 レーン内・ユーザー可視契約の変更なし)

- 全ロジックを純関数化し、副作用は注入した `WorkspaceTransaction`(backend + verifier + lock + 失敗インジェクタ)へ閉じ込める。in-process テストで全分岐を駆動し spawn 盲点(bun --coverage)を避ける。
- **三面 atomicity(E-USSU10FD2)**: `WorkspaceBackend` が host/composition-record/audit の三面と durable journal を持つ。committer は「PREPARED を最初の canonical mutation 前に durable 化 → host→record→audit を適用 → COMMITTED → clear」の順で進め、handled failure は return 前に全 preimage を即時・冪等復元、crash(未 catch 伝播)は次操作の lock 取得直後に PREPARED を検出して pre-state へ回復する。drift/corruption は追加 mutation 0 で loud 停止し、未回復中は新規 compose/drop を禁止する。
- **shared ownership(E-USSU10FD1)**: `SharedFileLedger`(file → base + 順序付き contribution 列)を composition record が参照する。plugin は shared file 全体を所有せず、自身の canonical contribution・適用順・期待 post-state のみを記録する。drop は current が期待 post-state に一致することを全対象で mutation 前に確認し、base + 残存(他 plugin)寄与から決定的に再構築する。user edit/drift/identity 不一致は三面不変で loud reject。
- **seam merge の対象モデル**: stage の 4 seam を string-entry list として決定的 union-append(base 順→新規宣言順、dedup)し、`StageSeamsDoc` を canonical serialize する。fragment splice は宣言 anchor 位置への text 挿入。実 stage 文書の YAML 逐語編集・実 graph compile の配線は U11 以降(本 Unit は機構=決定的データ変換のみ)。

## テスト戦略(Comprehensive)

既存 Bun test / `tests/unit` / `tests/integration` を使用し新基盤を追加しない。実 FS を触るテストは integration 層(fs-tests-integration-first)。純関数テストは unit 層。テスト番号は t252 以降(t248–t251 使用済み)。

- Unit t252(純関数・fs 非依存, size: small): inspect の全 error 収集(same-name/malformed/unknown seam/clobber を同時 fixture で全数)、error 一件で plan/write 0、seam merge の union-append/dedup 決定性、fragment splice、plan→record 生成、drop の期待 post-state 一致検証・残存再構築、in-memory backend による三面 atomicity(PREPARED→COMMITTED、handled failure 復元、crash 後 recovery、drift/corruption stop、二重 audit 0)、diagnosePlugins の read-only 投影。
- Integration t253(実 FS node backend, size: medium): 実 temp dir に host tree を作り、compose→doctor→drop を回して宣言成果物だけが生成・検出・除去され tracked tree に一時生成物を残さないこと、実ファイルでの三面 byte 不変(inspect reject / verify failure / commit 途中 crash)を実証。

## 実装手順

1. [ ] RED: 公開契約(6 seam signature)・全 error 収集・seam merge・fragment・三面 atomicity・recovery を unit test で固定(t252)。
2. [ ] GREEN: `scripts/plugin-composition.ts` を実装(6 公開 seam + 内部 `discoverPlugins`、純関数 + 注入 transaction)。
3. [ ] RED→GREEN: 実 FS node backend の compose/doctor/drop・crash 不変を integration test で固定(t253)。
4. [ ] 新設ガード(atomicity/no-clobber/reject)の落ちる実証(赤→復元→緑、注入は fix コミット後・復元 ref 明示)。
5. [ ] 検証: 対象テスト(path 実在機械確認 + `Ran ... across M files` 照合)、`typecheck`、`lint:check`、`dist:check`、`promote:self:check`、complexity gate、coverage registry check、local lcov で patch 未カバー0。
6. [ ] `code-summary.md`(日本語)に変更・検証 exit code・既知の制約を記録。
7. [ ] worktree 内でコミット(英語件名)。push しない。

## 変更方針

- 既存の既定値・出力順・エラー結果形式を維持する。`scripts/` への加算のみで正本・dist・self-install を不変に保つ(NFR-3)。
- 要求されない後方互換レイヤー・フォールバック・移行シムを追加しない(construction phase guardrail)。
- コミットは worktree 内のみ。push・他ユニットの実装は行わない。
