# Component Methods — Election CLI 多問対応

## 契約の前提

本書は [Requirements](../requirements-analysis/requirements.md)、[Components](components.md)、CodeKB の [Architecture](../../../../codekb/amadeus/architecture.md) と [component-inventory](../../../../codekb/amadeus/component-inventory.md) を実装可能な公開境界へ落とす。型名は application design 上の契約であり、詳細 business rule は Functional Design で確定する。

```ts
type QuestionId = string & { readonly __brand: "QuestionId" };
type Question = { questionId: QuestionId; text: string; choices: Choice[] };
type Response = {
  questionId: QuestionId;
  choiceInternalNo: number;
  goa: Goa;
  reservation: string | null;
  rationale: string | null;
};
type ElectionV2 = {
  schemaVersion: 2;
  electionId: string;
  kind: string;
  questions: Question[];
  voters: string[];
};
type BallotV2 = OriginalBallotV2 | AmendBallotV2;
type OriginalBallotV2 = {
  schemaVersion: 2;
  kind: "original";
  electionId: string;
  voter: string;
  voterKind: VoterKind;
  responses: Response[];
  submittedAt: string;
  receivedAt?: string;
};
type AmendBallotV2 = {
  schemaVersion: 2;
  kind: "amend";
  ref: BallotRef;
  electionId: string;
  voter: string;
  voterKind: VoterKind;
  responses: Response[];
  submittedAt: string;
  receivedAt?: string;
};
type QuestionResult =
  | { questionId: QuestionId; kind: "established"; winner: Winner; choiceCounts: ChoiceCount[]; goa: GoaCounts }
  | { questionId: QuestionId; kind: "hold"; reason: HoldReason; counts: GoaCounts };
type ElectionTallyV2 = {
  schemaVersion: 2;
  runId: string;
  targetQuestionIds: QuestionId[];
  results: QuestionResult[];
  preservedResultDigest: string;
  talliedAt: string;
};
```

## C1: Election Model / Codec

| Method | Input → Output | 目的 | Error |
|---|---|---|---|
| `decodeElection(raw)` | `unknown → Result<ElectionV2, DecodeError>` | v2 または legacy definition を canonical v2 に正規化 | schema 判別不能、空/重複 ID、空 choices、重複 voter を拒否 |
| `decodeBallot(raw, election, targetIds)` | `unknown × ElectionV2 × QuestionId[] → Result<BallotV2, BallotError>` | response の ID、choice、GoA、coverage、amend 対象を検証 | 未知/重複/欠落 response、対象外 amend を拒否 |
| `decodeTally(raw, election)` | `unknown × ElectionV2 → Result<ElectionTallyV2, DecodeError>` | legacy/new tally を canonical result 配列へ正規化 | result 欠落/重複、未知 ID、破損 mixed state を拒否 |
| `buildDistributionView(election, voter)` | `ElectionV2 × VoterId → DistributionViewV2` | 全問の blind view を決定的に生成 | unknown voter は呼出前検証、関数は純粋 |
| `resolveResponses(ballots)` | `BallotV2[] → ResolvedResponse[]` | `voter × questionId` ごとに receipt axis 上の最新 response を選ぶ | validation 済み入力のみ受理 |
| `classifyLateResponses(boundaries, receivedAt, ballot)` | `Map<QuestionId, string> × string × BallotV2 → {onTime; late}` | response ごとに当該 question の tally boundary と receipt time を比較 | established question の late response は tally 対象へ戻さない |
| `canEarlyTally(election, resolved, targetIds)` | `… → Map<QuestionId, boolean>` | question ごとの早期確定可能性を返す | target 外は返さない |
| `tallyQuestions(election, resolved, targetIds, preserved)` | `… → Result<ElectionTallyDraft, TallyError>` | 対象問だけを集計し、preserved result と結合する | target/preserved 重複、不完全 coverage、digest 不一致を拒否 |
| `deriveLifecycle(results)` | `QuestionResult[] → "partial" | "tallied"` | hold 混在なら partial、全問 established なら tallied | result 集合は事前検証済み |
| `canonicalResultDigest(results)` | `EstablishedQuestionResult[] → string` | definition 順の canonical JSON から digest を生成 | 非決定的 object 順に依存しない |

Legacy decode は scalar `question/choices` を `questions:[{questionId:"legacy-question",…}]` に、scalar ballot fields を `responses:[{questionId:"legacy-question",…}]` に持ち上げる。legacy global `hold` は canonical result を decode した後に `partial` へ正規化する。内部演算には legacy union を残さない。

## C2: Election Store

| Method | Input → Output | 目的 | Error / recovery |
|---|---|---|---|
| `load(root, electionId)` | `string × string → Result<StoredElectionV2, StoreError>` | definition と state を canonical decode | missing/corrupt/ambiguous を fail-closed |
| `appendPending(root, id, ballot)` | `… → Result<void, StoreError>` | voter ごとの response 配列を blind lane に原子的保存 | duplicate/IO error。共有 ledger は変更しない |
| `integratePending(root, id, targetIds)` | `… → Result<BallotV2[], StoreError>` | arrival order を保って対象問の pending を ledger へ統合 | 全成功前に pending を削除しない |
| `tallySnapshot(root, id)` | `… → Result<ElectionTallyV2 | null, StoreError>` | current snapshot を typed decode | malformed snapshot を null 扱いしない |
| `commitTallyRun(root, id, tally)` | `… → Result<CommitOutcome, StoreError>` | immutable history 作成後に current snapshot を atomic 更新 | 同 runId/同 digest は repair、異 digest は conflict |
| `appendTimeline(root, id, event)` | `… → Result<void, StoreError>` | question IDs と runId を含む監査 event を追記 | append failure を返す |
| `setState(root, id, expected, next)` | `… → Result<void, StoreError>` | compare-before-write で lifecycle を遷移 | expected mismatch を拒否 |

`commitTallyRun` の順序は、(1) canonical bytes 生成、(2) `tallies/<runId>.json` create-only、(3) current `tally.json` atomic replace、(4) registry state 更新、である。途中失敗は同 runId の内容照合により前進回復する。

## C3: Election CLI Application Service

| Method | 主要出力 | 契約 |
|---|---|---|
| `handleOpen(root, definitionPath)` | `{ opened, schemaVersion:2 }` | decode 成功後に canonical definition/view を保存 |
| `handleVote(root, electionId, ballotPath)` | `{ accepted, targetQuestionIds }` | current directive の target coverage と一致する ballot のみ受理 |
| `handleStatus(root, electionId)` | current lifecycle、question statuses、pending voters | raw tally を返さず canonical snapshot から生成 |
| `handleTally(root, electionId)` | runId、target IDs、question results、preserved digest | target question のみ集計し immutable run を保存 |
| `handleNext(root, electionId)` | machine-readable directive | partial では `targetQuestionIds=hold IDs` と preserved digest を返す |
| `handleReport(root, electionId, result, resolution?)` | committed state | expected state、runId、target IDs、digest の一致後だけ commit |
| `handleRender(root, electionId)` | record draft path | mixed result 全体を一度に描画 |
| `handleVerify(root, electionId)` | findings または verified | decode、再 tally、history、record の独立検証 |

Directive の共通 field:

```ts
type ElectionDirective = {
  kind: "distribute" | "collect-wait" | "tally-ready" | "render" | "verify" | "hold" | "done";
  electionId: string;
  targetQuestionIds: QuestionId[];
  preservedResultDigest: string | null;
  verb: string | null;
  report: string | null;
};
```

`hold` directive は単一 reason へ丸めず、`held: Array<{questionId, reason}>` を追加する。

## C4: Record Renderer / Verifier

| Method | Input → Output | 契約 |
|---|---|---|
| `renderPersistDraft(election, tally, ballots, timeline)` | canonical values → Markdown | definition 順に question section を出力 |
| `verifyReservations(election, ballots, document)` | `… → Result<void, VerifyFinding[]>` | voter × question の必要留保と記録行を照合 |
| `verifyQuestionResults(election, stored, recomputed)` | `… → VerifyFinding[]` | ID、順序、counts、GoA、hold、digest を比較 |
| `verifyHistory(current, runs)` | `… → VerifyFinding[]` | current が history の fold と一致し、established が不変か検証 |
| `verifySelf(counts, ballots, tally, timeline)` | `… → VerifyResult` | ledger/materialized/question coverage/timeline を独立ソース間で検証 |

## C5-C7: Ports と検証

- Transport の `distribute`, `reportDelivery` signature は維持し、view path の内容だけを v2 にする。
- Migration の fidelity 関数は移動前後を `decodeElection/decodeBallot/decodeTally` した canonical digest で比較する。
- Formal model の検証 adapter は module/cfg/source identities と run receipt を model-map へ結び、TLC `NOT_DETECTED` を完了証拠とする。
- Norm update は実装・テスト完了証拠を入力に `cid:requirements-analysis:always-elect` の本文だけを更新する。source scan は active memory に `E-SRA-RAS13` / `election-cli-canonical` がないことを distillation 前後で検査する。

## Error taxonomy

Domain/codec error、store IO/corrupt/conflict、invalid transition、verification finding を混ぜない。CLI は分類済み error を stderr の一行と exit code 1 へ写像し、部分的に解釈した値で処理を継続しない。read-only verb は一切の repair write を行わない。
