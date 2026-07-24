# Code Generation Plan — mirror-state-provenance

> 上流入力（consumes 全数）: `functional-design/business-logic-model.md`、`functional-design/business-rules.md`、`functional-design/domain-entities.md`、`nfr-design/logical-components.md`、`nfr-design/performance-design.md`、`nfr-design/security-design.md`、`nfr-design/reliability-design.md`、`nfr-design/scalability-design.md`、`nfr-requirements/performance-requirements.md`、`nfr-requirements/security-requirements.md`、`nfr-requirements/scalability-requirements.md`、`nfr-requirements/reliability-requirements.md`、`nfr-requirements/tech-stack-decisions.md`、`units-generation/unit-of-work.md`、`units-generation/unit-of-work-dependency.md`、`requirements-analysis/requirements.md`

## 目的

`mirror-state-provenance` Unit が所有する C3 Mirror State Store（設計 S1〜S4／S7）と C4 Mirror Provenance Verifier（S5〜S6）を、既存 TypeScript／ESM／Bun 構成へ実装する。対象は「Intent record 正本とその Issue marker の identity を安全に結ぶ、pure codec ＋ atomic transition ＋ marker/ownership 検証」に限定し、GitHub mutation・mode 判断・lifecycle advance・Issue 解釈は**実装しない**（それらは Unit 4 `mirror-operation-lifecycle` が所有）。

依存は `mirror-contract-policy` の C0（`amadeus-mirror-types.ts`）のみ。Gateway／lifecycle を import しない（`unit-of-work-dependency.md`: state-provenance は contract-policy のみに依存）。

User Stories ステージは SKIP のため traceability は各 FR（FR-3/5/6/7/10）と NFR、`business-rules.md` の SP-* ID、`nfr-requirements` の PERF/SEC/SCAL/REL-SP-* ID を使う。

## 裁定と C0 補完（Opt1 執行 — within-Bolt 補完）

- **C0 auditOutbox 補完（leader 裁定 #3、Opt1）**: `packages/framework/core/tools/amadeus-mirror-types.ts` へ `MirrorAuditOutbox` 型と `MirrorStateSnapshot.auditOutbox: MirrorAuditOutbox | null` を追加する。これは `logical-components.md:9`（S0=C0 が "outbox unions" を所有）と `business-logic-model.md:27`（block wire format の root 9 キー = `schema/revision/issueNumber/provenance/receipts/warnings/repairChallenges/expectedPrompt/auditOutbox`）、`reliability-design.md:30` の S4 `appendArtifactUpdatedIdempotent({ transactionId, digest, payload })` が指定する **C0 の完成**であり、contract-policy unit の builder/reviewer 双方が見逃した omission の within-Bolt 補完である。形は `{ transactionId: string; digest: string; fields: Readonly<Record<string, string>> }`（`fields` = 完全な `ARTIFACT_UPDATED` projection = `appendAuditEntry` が取る event fields）。
- **これ以外の C0 追加は行わない。** 設計が名指す `committed-audit-pending` / `durability-unknown` / `recovered` は C0 `WriteOutcome`（5 kind）にも `domain-entities.md` の State Outcomes 表（`ok/written/unchanged/conflict/invalid/io-failure` の 6）にも存在しない **内部 commit-state-machine のラベル**であり、公開 C3 outcome へは次の faithful mapping で写像する（新 outcome 型を作らない・C0 を触らない）:
  - `committed-audit-pending`（business commit 済み・audit 未 append）→ **`written`**（new snapshot を返し、outbox は disk に残す。次 mutate 呼び出しの drain で audit を収束）。
  - `durability-unknown`（rename 後の directory fsync 失敗 = 新旧不確定）→ **`io-failure`**（redacted summary に `durability-unknown` を符号化。次 read で新旧実体へ収束、REL-SP-09）。
  - `recovered`（entry 時に既存 outbox を検出 → drain＋clear のみ実行し新 transition を続行しない、rename 最大 1、PERF-SP-06）→ **`conflict(actualRevision=currentRevision)`**（caller に「re-read して再実行」を通知。Unit 4 の conflict 処理 = 再 parse＋再 decide＋再 mutate が、outbox clear 済みの clean state に対して transition を正しく再試行する）。

この mapping は `domain-entities.md` の 6 種 State Outcomes を公開契約として厳守し、reliability/performance-design の細かい commit 状態を内部で表現・reconcile するもので、検証劇場ではない（各 mapping は実 failure injection test で赤を踏む — Step 8 参照）。

## 現状と実装上の前提

- 正本は `packages/framework/core/tools/`。`dist/`・self-install 面は生成物で、正本編集後に `bun scripts/package.ts` ＋ `bun run promote:self` で同期（本 Unit では手編集しない）。
- C0 `amadeus-mirror-types.ts` は commit `1fa11c353`（gateway async 化）時点でコミット済み。`MirrorStateSnapshot`・`MirrorOperationReceipt`・`MirrorCreateIdentity`・`MirrorProvenance`・`MirrorWarning`・`MirrorRepairChallenge`・`MirrorRepairProof`・`MirrorExpectedPrompt`・`MirrorAuditContext`・`WriteOutcome`・`MarkerOutcome`・`OwnershipOutcome`・`CandidateOutcome`・`RepositoryIdentity`・`RemoteMirrorIssue`・`MirrorRepairPlan` を既に所有する。本 Unit は上記 auditOutbox 補完を除き C0 を再定義せず import のみ。
- **本 Unit 所有の型（C0 ではなく C3/C4 契約）**: transition 入力 union `MirrorTransition`（reducer 入力）、`MirrorMutateInput`、store port `MirrorStateStorePorts`、S4 idempotent append 結果、repair plan wire helper。これらは `unit-of-work-dependency.md` の Integration Contract 表で "state transition／receipt schema" ＝ mirror-state-provenance 所有と明記されており、Unit 4 が C3 公開 API 経由で消費する（C0-only 規則は共有 DTO の話であり、C3 の transition 契約は C3 が所有する）。
- 既存インフラ再利用（TS-SP-02）: state lock ＝ `acquireAuditLock`/`releaseAuditLock`（`amadeus-lib.ts`、mkdir ベース）、audit shard 解決 ＝ `auditShardDir`/`readAllAuditShards`、audit append ＝ `appendAuditEntryUnlocked`（`ARTIFACT_UPDATED` は既存 VALID event type、`amadeus-audit.ts:103`）、directory fsync ＝ `openSync(dir,"r")+fsyncSync+closeSync` idiom。新規 database/lock dependency は追加しない。
- runtime dependency 追加 0（TS-SP-06、SHA-256/base64url は Bun/Node 標準 `node:crypto`/`Buffer`）。
- active test strategy は Comprehensive（unit＋integration＋property/security/scalability 検証）。fast-check（`package.json` ^4.9.0 実在）を property test に使う。

## 対象ファイル

| 種別 | ファイル | 予定 |
|---|---|---|
| C0 補完 | `packages/framework/core/tools/amadeus-mirror-types.ts` | **編集**。`MirrorAuditOutbox` 追加＋`MirrorStateSnapshot.auditOutbox` 追加（裁定 #3 Opt1、上記のみ） |
| App code (S1) | `packages/framework/core/tools/amadeus-mirror-state-codec.ts` | 新規。sentinel finder、duplicate-aware tokenizer、entity 検証、canonical render、block splice、byte preservation |
| App code (S2) | `packages/framework/core/tools/amadeus-mirror-state-reducer.ts` | 新規。`MirrorTransition` union、pure `reduceMirrorState`、invariants、no-op、warning coalesce/capacity |
| App code (S7) | `packages/framework/core/tools/amadeus-mirror-repair.ts` | 新規。repair plan wire codec＋SHA-256 digest、`MirrorProvenanceV1` canonical、challenge issue/consume/prune（fake-clock 可能） |
| App code (S3+S4) | `packages/framework/core/tools/amadeus-mirror-state-store.ts` | 新規。`MirrorStateStorePorts`＋real factory、`readMirrorState`、`mutateMirrorStateAtomic`（11 手順 atomic transition）、S4 `appendArtifactUpdatedIdempotent` |
| App code (S5+S6) | `packages/framework/core/tools/amadeus-mirror-provenance.ts` | 新規。marker canonical render/parse、ownership verify、candidate classification decision table |
| Unit test (S1) | `tests/unit/t274-amadeus-mirror-state-codec.test.ts` | 新規。golden wire、duplicate key/unknown field/status、sentinel 0/1/2、limits、byte preservation、property（任意 prefix/suffix round-trip） |
| Unit test (S2) | `tests/unit/t275-amadeus-mirror-state-reducer.test.ts` | 新規。receipt transition matrix、invariants、no-op `unchanged`、warning coalesce/capacity 999+1、property（revision monotonicity/idempotency） |
| Unit test (S7) | `tests/unit/t276-amadeus-mirror-repair.test.ts` | 新規。plan wire golden（relink/abandon）、digest 安定、provenance canonical、TTL 10 分（fake clock）、one-time consume、prune、phrase exactness |
| Unit test (S5/S6) | `tests/unit/t277-amadeus-mirror-provenance.test.ts` | 新規。marker render/parse golden、ownership verify matrix、candidate decision table（0/1/複数、順序独立、mismatch/zero-after-attempt/ambiguous） |
| Integration test (S3/S4) | `tests/integration/t278-amadeus-mirror-state-store.integration.test.ts` | 新規。temp fs 実 atomic、byte preservation、32-writer CAS、failure injection（temp write/file fsync/rename/dir fsync/audit/outbox-clear）、outbox drain→conflict、committed-audit-pending→written、durability-unknown→io-failure、idempotent audit |

`t274`〜`t278` は計画時点の次空き番号（実測: 現在最高 t273）。PART 2 完了時に runner の `Ran ... across M files` と照合する。

## 実装手順

### Step 0: C0 `auditOutbox` を補完する（裁定 #3 Opt1）

- [ ] `amadeus-mirror-types.ts` に `MirrorAuditOutbox = Readonly<{ transactionId: string; digest: string; fields: Readonly<Record<string, string>> }>` を追加。
- [ ] `MirrorStateSnapshot` に `auditOutbox: MirrorAuditOutbox | null` を追加。
- [ ] `bun run typecheck` で contract-policy C1/C2・既存テスト（t257/t268/t269）が壊れないこと（auditOutbox は additive、既存 snapshot 生成箇所で必須化する影響を実測）を確認。壊れる場合は既存 snapshot literal に `auditOutbox: null` を補う最小修正のみ。
- 対象: `amadeus-mirror-types.ts`
- Trace: business-logic-model.md:27、reliability-design S4、裁定 #3

### Step 1: S1 Document Codec を実装する

- [ ] `amadeus-mirror-state-codec.ts` に duplicate-key-aware な小さな JSON tokenizer を実装（depth ≤16、string UTF-8 ≤256 KiB、key ≤128 bytes、aggregate ≤2 MiB を超過前に停止＝SEC）。duplicate key/unknown schema/unknown field/unknown status/型不正/entity invariant 違反を **全件 path 付き issue** へ集約。
- [ ] sentinel `<!-- amadeus:mirror-state:v1:start -->` / `...:end -->` を start/end 各 1 個だけ許可。block なしは revision 0 empty snapshot（`auditOutbox:null`、未 link、receipt/warning/challenge なし）。
- [ ] `parseMirrorStateDocument(document): { kind:"ok"; snapshot; block:{start,end}|null } | { kind:"invalid"; issues }`。valid block を C0 DTO へ変換し、receipt map key = receipt.key = canonical event key、`issueNumber` と `provenance.issueNumber` は両 null または同一 positive integer を検証。
- [ ] `renderMirrorStateBlock(snapshot): string`（root 9 キー固定順・各 entity 定義順・空白なし・LF・末尾改行あり）と `spliceMirrorBlock(document, block|null, newBlock): string`（既存 block は範囲置換、なし時は末尾改行を保持した prefix に「空行 1 行＋block」を append）。Mirror block 外は substring として不変。
- 対象: `amadeus-mirror-state-codec.ts`
- Trace: SP-C01〜C07、REL-SP-06、SEC parser controls、PERF-SP-01

### Step 2: S7 Repair codec を実装する（S2 の前に：reducer が digest/canonical を使う）

- [ ] `amadeus-mirror-repair.ts` に `encodeProvenanceV1(...)`（field 順 `schema,intentUuid,intentDir,repository,issueNumber,operationId,preparedAt`、whitespace なし UTF-8 JSON）と `encodeRepairPlanV1(plan)`（root key 順 `schema,kind,intentUuid,repository,operationId,issueNumber,provenanceDigest,action`、全 key 必須・非該当 null、relink/abandon の必須値/null/action literal matrix、`security-design.md` 準拠）を実装。
- [ ] `sha256Hex(bytes): string`（lowercase hex）、`repairPlanDigest(plan)`、`provenanceDigest(prov)`。JSON number は leading zero なし 10 進、whitespace/LF なし。variant invariant 違反・unknown action・64 hex 以外を発行前に拒否。
- [ ] challenge lifecycle helper（pure）: `issueRepairChallenge(snapshot, input, now)`（発行前に expired prune→proof を戻す、active 100 件で拒否、challenge ID 一意）、`consumeRepairChallenge(snapshot, input, now)`（challenge ID/Intent/repo/operation/digest/exact phrase/未消費/`issuedAt<=now<=issuedAt+10m` を全検証、消費で map から削除＋`MirrorRepairProof` を返す）、`pruneExpiredChallenges(snapshot, now)`。時刻は注入 clock 由来 RFC 3339 UTC を instant へ parse。
- 対象: `amadeus-mirror-repair.ts`
- Trace: SP-R01〜R09、SEC repair/marker、REL challenge closure

### Step 3: S2 Pure Reducer を実装する

- [ ] `amadeus-mirror-state-reducer.ts` に `MirrorTransition` 判別 union（`prepare` / `mark-attempted` / `claim-create-attempt` / `retry-after-no-effect` / `claim-observed-retry` / `complete` / `skip-for-event` / `set-warning` / `set-global-warning` / `clear-global-warning` / `mark-pending` / `mark-safety-blocked` / `abandon-attempt` / `set-expected-prompt` / `consume-expected-prompt` / `repair-link` / `issue-repair-challenge` / `consume-repair-challenge`）を定義。
- [ ] `reduceMirrorState(snapshot, transition, now): { kind:"changed"; snapshot } | { kind:"unchanged" } | { kind:"invalid"; issues }`。`business-rules.md` の Receipt Transition Rules 表を exhaustive に実装（terminal からの通常 transition・別 operation warning・create identity 差替え・成功 receipt abandon を拒否、idempotent 完全一致再入は `unchanged`）。
- [ ] prepare は create で `MirrorCreateIdentity` を同時生成、mark-pending は attempted からのみ＋effect certainty、retry-after-no-effect は pending+no-effect-confirmed のみ、complete は create で provenance 必須確定。
- [ ] warning key canonical tuple（operationId+classification+occurredAt）で重複しない、同 operationId+classification+effect は最新へ coalesce（旧値は Step 4 の audit outbox 用に caller へ返さず reducer は snapshot のみ更新）、通常 999 slot＋予約 `state-capacity` singleton 1、receipts 1000 上限。repair-link/issue-repair-challenge/consume-repair-challenge は Step 2 の helper へ委譲。
- 対象: `amadeus-mirror-state-reducer.ts`
- Trace: FR-3/6/10、SP-A03、REL transition closure、SCAL capacity、業務ルール全表

### Step 4: S3 Atomic File Store ＋ S4 Audit Outbox を実装する

- [ ] `amadeus-mirror-state-store.ts` に `MirrorStateStorePorts` interface（`acquireLock():boolean` / `releaseLock():void` / `readDocument():string` / `writeDocumentAtomic(text):{kind:"ok"}|{kind:"io-failure";summary} | {kind:"durability-unknown";summary}` / `appendArtifactUpdated(tx):{kind:"appended"|"already-present"}|{kind:"conflict"}|{kind:"io-failure";summary}` / `clearOutboxAtomic(text):{kind:"ok"}|{kind:"io-failure";summary}`）を定義し、`createMirrorStateStorePorts({projectDir,statePath,intent,space})` real factory を実装（lock=acquire/releaseAuditLock、atomic write=same-dir temp+owner-only+symlink 非追跡+file fsync+rename+dir fsync、S4=shard 全走査で transactionId 検索し ID なし append/同 ID+digest+payload 一致 already-present/不一致 conflict）。
- [ ] `readMirrorState(ports): { kind:"ok"; snapshot; document } | { kind:"invalid"; issues } | { kind:"io-failure"; summary }`（lock 内 exactly 1 read→codec parse）。
- [ ] `mutateMirrorStateAtomic(ports, input): WriteOutcome` を `business-logic-model.md` の 11 手順で実装。① lock ② re-read ③ parse（invalid→write せず終了）④ **outbox drain**: outbox あれば idempotent append→成功で outbox のみ atomic clear→**`conflict(currentRevision)` を返し新 transition を続行しない**（recovered mapping、rename ≤1）、append 失敗は `written`（committed-audit-pending mapping）維持 or `io-failure` ⑤ CAS（expected≠current→conflict(actual)）⑥ reduce 1 回（unchanged→write せず `unchanged`、invalid→`invalid`）⑦ transaction ID `mirror-state:{intentUuid}:{eventKey}:{operationId}:{transitionKind}:{nextRevision}:{digest}` 生成＋完全 `ARTIFACT_UPDATED` projection を single auditOutbox へ格納 ⑧ 全 invariant 再検証＋Mirror block のみ canonical 置換 ⑨ temp write+file fsync+rename+dir fsync（commit point。rename 前失敗→`io-failure`・元 file 不変、dir fsync 失敗→`io-failure`(durability-unknown mapping)）⑩ committed outbox を idempotent append（失敗→`written`／outbox 残置）⑪ audit 成功後 outbox を revision 不変 atomic clear（失敗→`written`／再入で収束）→ new snapshot＋document を `written` で返す。
- [ ] outbox 未 drain 中は別 transition を開始しない（④で保証）。CAS 無条件 retry しない（SP-A09）。
- 対象: `amadeus-mirror-state-store.ts`
- Trace: SP-A01〜A12、REL-SP-01〜09、PERF-SP-02〜04/06、SEC file safety、SCAL 32-writer

### Step 5: S5 Marker Codec ＋ S6 Provenance Verifier を実装する

- [ ] `amadeus-mirror-provenance.ts` に `renderMirrorMarker(identity): string`（`<!-- amadeus-intent-mirror:v1 {base64url(canonical-json)} -->`、payload field 順 `schema,intentUuid,intentDir,repository.owner,repository.name,repository.canonical,operationId,preparedAt`、UTF-8 JSON→base64url padding なし。永続済み `MirrorCreateIdentity` のみ受理）。
- [ ] `parseMirrorMarker(body): MarkerOutcome`（完全一致 marker が body 内 0 件→`missing`、1 件→schema/encoding/field/canonical repository 検証で `parsed`、2 件以上/malformed→`invalid`。payload 256 KiB 上限。別 version を v1 と推測しない）。
- [ ] `verifyOwnership(input): OwnershipOutcome`（① remote repo vs local provenance repo canonical 比較→不一致 `wrong-repository` ② marker parse→欠落 `missing-marker`/invalid `mismatch` ③ marker identity vs local create identity 全 field ④ remote Issue number vs local provenance Issue number ⑤ 全一致で `verified`）。
- [ ] `classifyCandidates(input): CandidateOutcome`（`business-rules.md`/`requirements.md` FR-3 の順序付き decision table。verified candidate を Issue number 昇順に正規化してから件数判断、入力順非依存、曖昧時に先頭採用しない。create 前に receipt create identity の Intent UUID/dir/canonical repo を current context と完全一致検証、不一致は candidate search せず `safety-blocked: mismatch`）。
- 対象: `amadeus-mirror-provenance.ts`
- Trace: FR-3/5、SP marker/ownership/candidate 表、SEC spoofing/disclosure

### Step 6: pure unit test（S1/S2）を作成する

- [ ] `tests/unit/t274-amadeus-mirror-state-codec.test.ts`: empty→revision 0、golden 9-key wire render/parse round-trip、duplicate receipt key→invalid、unknown field/status→invalid、sentinel 2 個→invalid、depth/string/key/aggregate 上限＋1→invalid、非 Mirror prefix/suffix byte 保持、issueNumber/provenance.issueNumber 整合。property（fast-check）: 任意 prefix/suffix + valid block の parse→render→splice が prefix/suffix bytes を保持。
- [ ] `tests/unit/t275-amadeus-mirror-state-reducer.test.ts`: 全 receipt transition matrix（Receipt Transition Rules 表 verbatim）、未定義 edge→invalid、同値再入→unchanged（revision 不変）、mark-pending は attempted のみ、retry-after-no-effect は pending+no-effect のみ、warning coalesce/999+1 capacity、terminal 拒否。property: state-changing は revision を exactly +1、idempotent は不変。
- [ ] 期待値は被検実装を再利用せず独立 golden（PBT オラクル相殺回避、`build-and-test:pbt-oracle-cancellation`）。各 file に `// covers:`＋`// size: small`。
- 対象: `tests/unit/t274-*`, `tests/unit/t275-*`
- Trace: SP-C*/A03、REL closure、SCAL capacity

### Step 7: pure unit test（S7/S5/S6）を作成する

- [ ] `tests/unit/t276-amadeus-mirror-repair.test.ts`: relink/abandon の完全 wire golden（`security-design.md:27,31` の 2 例 verbatim）、各 variant の null/action/digest mutation 拒否、digest 決定性、provenance canonical bytes、fake clock で TTL 10 分境界（issuedAt/±/+10m+1ε）、one-time consume 後の replay 拒否（state 不変）、別 plan/Intent/repo/operation/phrase 大小空白差の拒否、prune＋active 100 件拒否。
- [ ] `tests/unit/t277-amadeus-mirror-provenance.test.ts`: marker render golden＋base64url round-trip、parse 0/1/2 件、malformed/別 version→invalid、ownership verify matrix（wrong-repository/missing-marker/mismatch/verified）、candidate decision table 全行（fresh0→create-new、1→adopt、attempted0→zero-after-attempt、2+→ambiguous、mismatch→safety-blocked、順序独立 shuffle）。
- [ ] 独立 golden。`// covers:`＋`// size: small`（fs/process 不使用、fake clock は関数注入）。
- 対象: `tests/unit/t276-*`, `tests/unit/t277-*`
- Trace: SP-R*/marker/ownership/candidate、SEC STRIDE

### Step 8: real store integration test（S3/S4、failure injection）を作成する

- [ ] `tests/integration/t278-amadeus-mirror-state-store.integration.test.ts`: temp dir（`mkdtempSync`）で real ports の happy path（prepare→attempted→complete の revision 1..N、document byte 検分）、非 Mirror prefix/suffix byte-for-byte 保持、32 並列 fixture で written exactly 1・lost update 0（同 revision CAS）。
- [ ] injected ports で failure injection を **実際に踏む**（検証劇場禁止）: temp write 失敗/file fsync 失敗/rename 失敗→元 file byte 不変＋`io-failure`、dir fsync 失敗→`io-failure`（durability-unknown mapping、summary に符号化）、audit append 失敗→`written`＋outbox 残置（committed-audit-pending mapping）、次 mutate で既存 outbox drain→`conflict`（recovered mapping）＋outbox clear 実在、audit idempotent（同 tx 二重 append→already-present、outbox clear のみ）、CAS conflict/invalid/no-op で temp file 0・remote call 0。
- [ ] fs/process を使うため integration suite。`// covers:`＋`// size: medium`。fake port は本番分岐を作らず interface を実装するのみ（construction.md: 本番コードにテスト分岐を置かない）。
- 対象: `tests/integration/t278-*`
- Trace: REL-SP-01〜09、PERF-SP-02〜04/06、SEC file safety、SCAL 32-writer、commit-machine mapping の落ちる実証

### Step 9: 正本→配布同期と品質 gate を実行する

- [ ] `packages/framework/core/tools/` を編集したため `bun scripts/package.ts`＋`bun run promote:self` を実行し `bun run dist:check`／`bun run promote:self:check` を green（初回 drift = 本 Unit の core .ts 追加分のみ・無関係 drift 0 を実測確認）。
- [ ] 対象 test 5 ファイルを直接実行し全件実行を `Ran ... across M files` で照合。contract-policy テスト（t257/t268/t269）で C0 auditOutbox 追加の回帰無しを実測。
- [ ] `bun run typecheck`（source/tests strict）、`bun run lint`（Biome、formatter/import organizer 不実行）を通す。push 前 lcov で新規行の未カバー 0 を確認（in-process seam、`local-lcov-pre-push`）。
- [ ] `bash tests/run-tests.sh --ci` を最終収束確認として実行。本 Unit 外の既存 failure（t257/t258 integration/t259 = Issue #1455 `currentGitSha` worktree loose-ref、mirror 非 import、決定的／coverage gate の DROP/MISSING = coverage-project-gate fixture 出力の red herring）は assertion 実文で帰属確認し baseline と分離報告。
- 対象: 上記 application code／test files＋生成物同期
- Trace: 全対象要件、Comprehensive、project testing posture、Mandated dist/self-install sync

## 要件／Slice トレーサビリティ

| 要件／ID | 実装 Step | 主な検証 Step |
|---|---|---|
| SP-C01〜07（codec） | 1 | 6 |
| SP-A01〜12（atomicity/CAS） | 4 | 8 |
| Receipt Transition Rules / FR-3/6/10 | 3 | 6 |
| SP-R01〜09（repair） | 2 | 7 |
| marker/ownership/candidate（FR-3/5） | 5 | 7 |
| REL-SP-01〜09 | 4 | 8 |
| PERF-SP-01〜06 | 1、4、5 | 6、8 |
| SEC STRIDE / disclosure | 1、2、4、5 | 6、7、8 |
| SCAL capacity/32-writer | 3、4 | 6、8 |
| C0 auditOutbox 補完（裁定 #3） | 0 | 8（貫通）、9（回帰） |

## 明示的な非対象

- GitHub mutation・`gh` 呼出し（C5 Gateway = Unit 3）、mode 判断・operation executor・lifecycle coordinator・status/prompt renderer（C6〜C8 = Unit 4）、配布同期の docs/skill/manifest（Unit 5）。
- `amadeus-orchestrate.ts`／`amadeus-state.ts`／`amadeus-lib.ts` の一般的分割・周辺 refactor（NFR-3）。
- `dist/`（同期を除く直接編集）、self-install tree、6 harness manifest、skill、Guide／Reference。
- **C0 auditOutbox 以外の C0 型追加**（発生時は再度実装前停止・報告）、boolean 互換 shim、generic external action、daemon/poller/scheduler、新規 runtime dependency。

## 完了条件

- [ ] S1〜S7 の公開 contract が設計どおり実装され、C0 は auditOutbox 補完のみ・他は import、Gateway/lifecycle を import しない。
- [ ] codec が 9-key wire を duplicate-aware に parse/canonical render し非 Mirror bytes を保持、reducer が全 transition を exhaustive・no-op を `unchanged`、store が 11 手順 atomic transition＋commit-machine→WriteOutcome mapping、marker/ownership/candidate を fail-closed に分類。
- [ ] auditOutbox が S1（wire）→S2（tx 生成）→S3（永続化/clear）→S4（idempotent append）で型一貫。
- [ ] failure injection（temp/fsync/rename/dir-fsync/audit/outbox-clear）が決定的 test で実際に赤を踏み、CAS 32-writer が written 1、marker mismatch/ambiguous/replay で remote call 0。
- [ ] typecheck / Biome / focused tests / dist:check / promote:self:check green、本 Unit 外を不要に変更しない。
