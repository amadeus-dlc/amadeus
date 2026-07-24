# Code Summary — mirror-state-provenance

> 上流入力（consumes 全数）: `functional-design/business-logic-model.md`、`functional-design/business-rules.md`、`functional-design/domain-entities.md`、`nfr-design/logical-components.md`、`nfr-design/performance-design.md`、`nfr-design/security-design.md`、`nfr-design/reliability-design.md`、`nfr-design/scalability-design.md`、`nfr-requirements/performance-requirements.md`、`nfr-requirements/security-requirements.md`、`nfr-requirements/scalability-requirements.md`、`nfr-requirements/reliability-requirements.md`、`nfr-requirements/tech-stack-decisions.md`、`units-generation/unit-of-work.md`、`units-generation/unit-of-work-dependency.md`、`requirements-analysis/requirements.md`

## 実装概要

Bolt1 の C3 Mirror State Store（S1〜S4／S7）と C4 Mirror Provenance Verifier（S5〜S6）を、`packages/framework/core/tools/` の TypeScript / ESM / Bun 構成へ実装した。GitHub mutation・mode 判断・lifecycle advance・Issue 解釈は実装せず（Unit 4 所有）、依存は C0（`amadeus-mirror-types.ts`）と既存 framework の state/audit lock（TS-SP-02）のみ。Gateway/lifecycle Mirror unit は import しない（実測: import 0）。

## C0 auditOutbox 補完（leader 裁定 #3 Opt1・within-Bolt 補完の明示申告）

`packages/framework/core/tools/amadeus-mirror-types.ts` へ次を追加した:

- `MirrorAuditOutbox = Readonly<{ transactionId: string; digest: string; fields: Readonly<Record<string, string>> }>`（`fields` = 完全な `ARTIFACT_UPDATED` projection = `appendAuditEntry` が取る event fields）。
- `MirrorStateSnapshot.auditOutbox?: MirrorAuditOutbox | null`（optional-with-null。既存 `expectedPrompt?` と同一慣習。codec が wire 上 undefined→null 正規化）。

**これは contract-policy unit の C0 実装が見落とした omission の within-Bolt 補完である**: `logical-components.md:9`（S0=C0 が "outbox unions" を所有）と `business-logic-model.md:27`（block wire format root 9 キーに `auditOutbox`）、`reliability-design.md:30` の S4 `appendArtifactUpdatedIdempotent({ transactionId, digest, payload })` が指定する **C0 の完成**であり、contract-policy unit の builder/reviewer 双方が見逃した。RE 段で私（builder）が発見し、実装前に停止・報告 →leader 裁定 #3（Opt1 執行・選挙不要=設計一意確定）により補完した。

`?` （optional）採用の根拠: 裁定の value 型指定 `MirrorAuditOutbox | null` を満たしつつ、既存 snapshot literal（t257/t268/t269 の contract-policy テスト）を壊さない surgical な additive 変更とするため（conductor の「optional 追加なので壊れない想定」に合致）。回帰無しを実測確認済み（t257 config 29 pass / t268 policy 30 pass / t268・t269 integration green）。

**これ以外の C0 追加は行っていない。** 設計が名指す `committed-audit-pending`／`durability-unknown`／`recovered` は C0 `WriteOutcome`（5 kind）にも `domain-entities.md` の State Outcomes 表（6 種）にも無い**内部 commit-state-machine のラベル**であり、公開 C3 outcome へ次の faithful mapping で写像した（新 outcome 型なし・C0 非改変。domain の 6 outcome を公開契約として厳守）:

| 内部状態 | 公開 WriteOutcome | 意味 |
|---|---|---|
| committed-audit-pending | `written` | business commit 済み・audit 未 append。outbox を disk に残し次呼び出しで drain |
| durability-unknown | `io-failure`（summary に符号化） | rename 後 dir fsync 失敗=新旧不確定。次 read で収束（REL-SP-09） |
| recovered | `conflict(actualRevision)` | entry 時に既存 outbox を drain+clear のみ実行（PERF-SP-06 rename≤1）→caller が re-read+再実行 |

各 mapping は t278 の failure injection で実際に赤を踏んで実証済み（検証劇場でない）。

## モジュール（新規、`packages/framework/core/tools/`）

### S1 `amadeus-mirror-state-codec.ts`

- `parseMirrorStateDocument(document): { kind:"ok"; snapshot; block } | { kind:"invalid"; issues }` — sentinel（start/end 各1）検出、duplicate-key-aware JSON tokenizer（depth≤16 / string≤256KiB / key≤128B / aggregate≤2MiB、prototype 汚染防止の null-proto accumulator）、全 entity 検証（unknown field/status・型不正・SP-C05 map key=canonical event key・SP-C06 issueNumber↔provenance 整合）を全件 path 付き issue へ集約。
- `renderMirrorStateJson(snapshot): string` — root 9 キー固定順・各 entity 定義順・空白なし・LF の canonical。
- `renderMirrorStateBlock(snapshot): string` / `writeMirrorStateDocument(document, block, snapshot): string` — Mirror block 外を substring として byte 保持する splice（既存置換／末尾 append）。
- `EMPTY_MIRROR_STATE`、`MIRROR_STATE_SENTINEL_START/END`、`MIRROR_CODEC_LIMITS`。

### S2 `amadeus-mirror-state-reducer.ts`

- `MirrorTransition`（17 kind の判別 union、C3 所有契約。reducer:34-88 を機械計数 — `changed`/`unchanged`/`invalid` は reduce 結果 kind で transition ではない）、`reduceMirrorState(snapshot, transition, now): { kind:"changed"; snapshot; auditFacts? } | { kind:"unchanged" } | { kind:"invalid"; issues }`。
- Receipt Transition Rules 表を exhaustive 実装（prepare/mark-attempted/claim-create-attempt/retry-after-no-effect/claim-observed-retry/complete/skip-for-event/set-warning/set-global-warning/clear-global-warning/mark-pending/mark-safety-blocked/abandon-attempt/set-expected-prompt/consume-expected-prompt/repair-link/issue-repair-challenge）。terminal 通常遷移・成功 receipt abandon・別 operation warning・create identity 差替えを拒否。idempotent 完全一致再入は `unchanged`（write なし）。revision は reducer では不変（store が +1）。
- warning coalesce（operationId+classification+effect で最新へ集約）＋通常 999slot＋予約 capacity singleton。repair 系は S7 helper へ委譲。
- 定数 `MAX_RECEIPTS=1000`、`MAX_NORMAL_WARNINGS=999`、`CAPACITY_WARNING_MARKER`。

### S7 `amadeus-mirror-repair.ts`

- `encodeProvenanceV1`/`encodeRepairPlanV1`（security-design.md の field 順・relink/abandon の必須値/null/action literal matrix）、`sha256Hex`/`provenanceDigest`/`repairPlanDigest`（node:crypto、lowercase hex）。
- `issueRepairChallenge`（発行前 expired prune→proof、active 100 件拒否、ID 一意）／`consumeRepairChallenge`（challengeId/Intent/repo/operation/planDigest/exact phrase/未消費/10分TTL を全検証、消費で map 削除＋`MirrorRepairProof` 返却）／`pruneExpiredChallenges`。clock 注入で決定的。
- `REPAIR_CHALLENGE_TTL_MS=600000`、`MAX_ACTIVE_CHALLENGES=100`。

### S3+S4 `amadeus-mirror-state-store.ts`

- `MirrorStateStorePorts`（acquireLock/releaseLock/readDocument/writeDocumentAtomic/appendArtifactUpdated）＋ `createMirrorStateStorePorts(config)` real factory（lock=`acquireAuditLock`/`releaseAuditLock`、atomic write=same-dir temp+owner-only(0o600)+file fsync+regular-file 再確認+rename+dir fsync、S4 idempotent append=shard 全走査で transactionId 検索→なし append/あり already-present）。
- `readMirrorState(ports)`、`mutateMirrorStateAtomic(ports, input): WriteOutcome` — business-logic-model の 11 手順（lock→re-read→parse→outbox drain→CAS→reduce→transaction+outbox 生成→invariant 再検証+block splice→atomic write=commit point→idempotent audit→outbox clear）。transaction ID = `mirror-state:{intentUuid}:{eventKey}:{operationId}:{transitionKind}:{nextRevision}:{digest}`（digest embeds → idempotency は ID 一致で判定）。
- `atomicWrite`（export、real fs 検証用）、`AtomicWriteResult`/`AuditAppendResult`/`MirrorMutateInput`。

### S5+S6 `amadeus-mirror-provenance.ts`（C4）

- `renderMirrorMarker`/`parseMirrorMarker`（`<!-- amadeus-intent-mirror:v1 {base64url} -->`、payload field 順固定、canonical round-trip guard、256KiB 上限、0=missing/1=parsed/2+=invalid）。
- `verifyOwnership`（repository→marker→identity→issue number の順序検証、fail-closed）、`classifyCandidates`（FR-3 decision table、Issue number 昇順正規化で入力順非依存、0/1/複数を丸めず zero-after-attempt/ambiguous/mismatch を分類）、`createIdentityMatchesContext`（remote 前 context guard）。

## auditOutbox の S1→S4 貫通（裁定留意 b）

wire 9 キー（S1 parse/serialize）→ reducer が transaction 開始時 `auditOutbox:null`（S2 changed は常に outbox クリア）→ store が commit で完全 projection を single outbox へ格納（S3/S4）→ audit append 成功後 clear（S4 idempotent）。型は C0 `MirrorAuditOutbox | null` で一貫。t278 の committed-audit-pending→drain→recovered シナリオで貫通を実測。

## テスト（t274 以降予約使用）

| ファイル | 層 | size | 内容 |
|---|---|---|---|
| `tests/unit/t274-amadeus-mirror-state-codec.test.ts` | unit | small | golden 9-key wire、empty、round-trip、duplicate key/unknown field/status、sentinel 2、depth 上限、SP-C05/C06、byte 保持、property(prefix/suffix round-trip) — 13 pass |
| `tests/unit/t275-amadeus-mirror-state-reducer.test.ts` | unit | small | prepare/attempt/complete/pending/retry/skip/warning/terminal、coalesce、999+1 capacity、property — 15 pass |
| `tests/unit/t276-amadeus-mirror-repair.test.ts` | unit | small | relink/abandon golden wire、digest 決定性、provenance canonical、TTL(fake clock)、one-time consume/replay、phrase exact、prune、capacity 100 — 10 pass |
| `tests/unit/t277-amadeus-mirror-provenance.test.ts` | unit | small | marker round-trip/0/2/malformed、ownership matrix、candidate decision table(順序独立) — 14 pass |
| `tests/integration/t278-amadeus-mirror-state-store.integration.test.ts` | integration | medium | 実 fs atomic(byte 保持+read-only-dir 失敗注入で元 file 不変)、commit-machine mapping(CAS/no-op/durability-unknown/committed-audit-pending→written/drain→conflict/idempotent audit/32-writer written=1) — 9 pass |

全 5 ファイル 61 pass / 0 fail。fake port は本番分岐でなく interface 実装（construction.md 準拠）。property test の期待値は独立 golden（PBT オラクル相殺回避）。failure injection は実際に失敗経路を踏む。

## dist / self-install 同期（project.md Mandated）

`packages/framework/core/tools/` を編集したため配布物を同期（決定済み規則の機械執行）:

- 初回 `dist:check` exit 1（43 problem = 6 harness × [新規 mirror 5 ファイル MISSING + mirror-types DIFFERS] 系。無関係 drift 0 を実測確認）。
- `bun scripts/package.ts`（exit 0）+ `bun run promote:self`（exit 0）→ `dist:check`/`promote:self:check` ともに exit 0。再生成後 typecheck/lint/complexity も green（回帰なし）。

## 検証（conductor 独立再実測用、実測 exit code）

| # | コマンド | exit | 備考 |
|---|---|---|---|
| 1 | `bun run typecheck` | **0** | source/tests strict（再生成後も 0） |
| 2 | `bun run lint` | **0** | Biome error 0（既存 baseline warning のみ） |
| 3 | `bun tests/complexity-gate.ts --check` | **0** | 0 new violation（全 mirror 関数 CCN≤15 へ refactor 済み） |
| 4 | `bun tests/gen-coverage-registry.ts --check` | **0** | fresh, guards green, ratchet held |
| 5 | 対象 5 テスト直接実行 | **0** | 61 pass（`Ran ... across 5 files` 照合） |
| 6 | 回帰 t257-config/t268/t269 | **0** | 71 pass（C0 auditOutbox 追加の回帰無し） |
| 7 | `bun run dist:check` | **0** | 再生成後 |
| 8 | `bun run promote:self:check` | **0** | 再生成後 |
| 9 | `bash tests/run-tests.sh --ci` | 3 (baseline のみ) | 下記 baseline 分離 |

### baseline 分離（local-ci-red-assertion-verbatim で帰属確認）

`--ci` の失敗は 3 件、すべて `currentGitSha` の worktree loose-ref 欠陥（Issue #1455、決定的、mirror 非 import、本変更と無関係）:

- t257-status-registry-migration.test.ts:214 — `cannot resolve Git ref refs/heads/team/20260724-181510-1d8e/engineer-2`
- t258-lifecycle-transaction.test.ts:455 — `Cannot resolve Git ref ...`
- t259-guard-integration.test.ts:96 — `Unable to resolve Git ref ...`

いずれも perf contract テストが git provenance 記録のため `currentGitSha` を呼び、worktree の loose ref を packed-refs 解決できず throw する #1455 の症状。assertion 実文で確認済み。私の 5 mirror suite は全て PASS。coverage gate の t229 no-such-ref は fixture 出力の red herring。

## 逸脱

- **なし**（C0 auditOutbox 補完は裁定 #3 Opt1 の指示範囲内で、逸脱ではなく指示執行）。他の C0 追加は不要（内部 commit-machine → 公開 WriteOutcome mapping で解決）。後方互換シムなし、surgical、検証劇場なし。
