# code-generation plan — Bolt FR-6 (#848 docs-only の workspace_requires 免除経路の再接地)

## 対象バグ

#848 (P2/S3): docs-only intent が `verifyStageArtifacts` の `workspace_requires` ガードで
無条件に拒否される。元修正 c8ddabffc(B002=#499)の `declare-docs-only` / `GUARD_EXEMPTED` /
`docsOnly` registry フィールドが現行ソース(`packages/framework/core/`)に存在しない(RE 実測 0 ヒット)。
免除手段はテスト用 env `AMADEUS_SKIP_ARTIFACT_GUARD=1` のみ。

## 契約(c8ddabffc B002 と同等)

- (a) `amadeus-state.ts declare-docs-only --evidence "<...>"` で宣言(evidence の形式検査
  `<DECISION_RECORDED|GATE_APPROVED> <stage> [detail]` + audit 実在照合)。宣言は registry
  (`intents.json`)の該当行の `docsOnly: { evidence }` フィールドに書く(唯一の書き込み経路)。
- (b) 宣言があれば `verifyStageArtifacts` の `workspace_requires` 分岐を免除し、免除発動を
  `GUARD_EXEMPTED` audit イベント(Stage / Evidence フィールド)として記録。
- (c) 宣言なし・不正宣言(形式不備・audit 不在・空 evidence)は従来どおり拒否(#366 型検出の保全)。

## 現行 audit-format への差分再接地(適合点)

- イベント名: `GUARD_EXEMPTED`(元修正と同一)。
- フィールド形: `Timestamp`(emitter が自動付与)+ `Stage` + `Evidence`。
- 現行の `emitAudit`(lock-aware: `holdsAuditLock` → `appendAuditEntryUnlocked`)経由で emit。
  `verifyStageArtifacts` は approve/advance/finalize/complete-workflow の `withAuditLock` 内で
  呼ばれるため unlocked 経路になる(self-deadlock 回避)。
- audit イベント照合は現行の共有ヘルパー `findAllEvents(audit, event)` + `auditField(block, "Stage")`
  を使う(元修正の手書きブロック split を現行 API へ再接地)。
- taxonomy 同期3面(t28/t48 が強制): `amadeus-audit.ts`(VALID_EVENT_TYPES + EVENT_HEADINGS)、
  `knowledge/amadeus-shared/audit-format.md`(Event Registry)、`docs/reference/12-state-machine.md`
  (Audit event taxonomy)。現行 canonical count は 72 → GUARD_EXEMPTED 追加で 73。
  プロローグの prose カウンタ(3面とも "71" で 1 ずれの stale)も 73 へ再接地。

## 変更ファイル(surgical)

1. `packages/framework/core/tools/amadeus-lib.ts`
   - `IntentRegistryEntry` に `docsOnly?: { evidence: string }` を追加。
   - `setIntentDocsOnly(pd, dirName, evidence, space?)`(唯一の書き込み口、非空 evidence 必須、
     `recordDirMatches` で行照合、`writeFileAtomic`)を export。
   - `docsOnlyDeclaration(pd, dirName, space?)`(読み側、空/欠落 evidence は null=未宣言扱い)を export。
2. `packages/framework/core/tools/amadeus-state.ts`
   - import に `docsOnlyDeclaration`, `setIntentDocsOnly` を追加。
   - `main()` dispatch に `declare-docs-only` case + Valid 一覧へ追記。
   - `verifyDocsOnlyEvidence(pd, evidence)`(形式検査 + `findAllEvents`/`auditField` で audit 実在照合)。
   - `handleDeclareDocsOnly(args)`(`withAuditLock` 内、active intent 解決、evidence 非空、
     `setIntentDocsOnly` の matched=false を error に昇格)。
   - `verifyStageArtifacts` の `workspace_requires` 分岐を「宣言あり→`GUARD_EXEMPTED` emit で通過 /
     宣言なし→従来 error(免除の案内文を追記)」に変更。#880 が触った handleAdvance/handleFinalize/
     handleCompleteWorkflow 本体には触れない(verifyStageArtifacts 内で完結)。
3. `packages/framework/core/tools/amadeus-audit.ts`: `GUARD_EXEMPTED` を VALID_EVENT_TYPES(Stage
   lifecycle)と EVENT_HEADINGS に追加。件数コメント 71→73。
4. `packages/framework/core/knowledge/amadeus-shared/audit-format.md`: header 71→73、Stage
   Lifecycle 6→7、GUARD_EXEMPTED 行追加。
5. `docs/reference/12-state-machine.md`: prose 71→73(同一文中2箇所)、Stage lifecycle 表へ
   GUARD_EXEMPTED 行(emitter=`tools/amadeus-state.ts`)。
6. `tests/unit/t28-audit-event-sync.test.ts`: CANONICAL_COUNT 72→73、baseline-pin タイトル、系譜コメント。
7. 新規 `tests/integration/t212-docs-only-exemption.test.ts`(番号は空きを確認して確定)。

## テスト(t185 の harness を踏襲、guard 有効化 = env から SKIP を delete)

- (a) 宣言なし + workspace 無作業 → code-generation approve 拒否(`workspace_requires` 文言、現行挙動保全)。
- (b) `declare-docs-only`(audit に DECISION_RECORDED を先行 seed)後、同条件で approve が rc=0、
  audit シャードに `**Event**: GUARD_EXEMPTED` + `**Stage**: code-generation` 行が記録される。
  → 修正一時 revert で RED 実測。
- (c) 不正 evidence: 形式不備(`"garbage"`)/ audit 不在(`"DECISION_RECORDED nonexistent-stage"`)/
  空(`--evidence ""`)で declare-docs-only が非0で拒否。
- (d) 免除が env 経路と独立: SKIP env を delete したまま、宣言のみで approve が通ること(b が実証)。
  逆に宣言なしでは env なしで拒否(a が実証)。

## 落ちる実証・閉包実測

- 落ちる実証: 免除分岐を一時 revert(元 error に戻す)→ (b) RED → 復元 GREEN。code-summary に exit code 記録。
- 閉包実測: #848 の再現手順(docs-only code-generation を workspace 無作業で approve → 拒否 →
  declare-docs-only → approve 通過 + GUARD_EXEMPTED)を verbatim 再適用。

## 同根棚卸し

- 「宣言(write=setIntentDocsOnly)⇔ 読み(check=docsOnlyDeclaration)」「emit(GUARD_EXEMPTED)⇔
  terminal(audit-format/state-machine/audit.ts の登録)」の対称対を grep 全数確認。
- 元修正 c8ddabffc の他ファイル面(audit-format.md 文書・audit.ts 件数・12-state-machine.md)の
  喪失も同一 PR で回復。B001(#498 codekbRepoName)/B003(#501 validator)は #848 スコープ外。

## 検証(全再実行 + exit code)

typecheck / lint / dist:check / promote:self:check / complexity-gate --check / 新規+t185/t28/t48 /
gen-coverage-registry --check(EXPECTED_NONE_TO_CLI 要否確認)。push 前 lcov で diff 追加行未カバー 0
(配線行・catch/brace・exit 隣接を個別確認)。
