上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# 性能設計 — U3 移設選定台帳と層別カバレッジ整合計画

本設計は `performance-requirements.md` の単一走査、`security-requirements.md` のリポジトリ内信頼境界、`scalability-requirements.md` の再生成、`reliability-requirements.md` の決定性、`tech-stack-decisions.md` の既存型再利用、および `business-logic-model.md` の選定・coverage整合フローを具体化する。実移設、実コード実装、classifier/runner/CI変更、per-tier lcov生成、強制ゲート、#1157は対象外である。

## PERF-D1: evidence 収集と純粋評価を分離する

U3 は source を意味判断する収集境界と、記録済み evidence を読む純粋評価境界を分ける。planned evidence 収集は候補 file ごとに同一 observed ref の source を最大1回読み、ledgerが既に持つ各emitted signalをkeyとして、人間/curatorがlocator・fact・dispositionを `CandidateEvidence` へ記録する。現行 `classifyTestSize` は `{ size, signals }` だけを返しlocatorを持たないため、収集済みと偽装せずplanned gapとする。収集側はprivate `SIGNAL_PATTERNS` を複製してmatch offsetを再導出せず、size/signalの真実源を増やさない。

質問Q1の決定により、候補群のpayloadと、その生成後に別HUMAN_TURNで得るproofを分離する。今回のQ1/Q3はこの設計方式だけを承認しており、将来のpayload内容を承認していない。

```text
EvidencePayload = {
  schemaVersion: 1,
  observedRef,
  candidates: CandidateEvidence[],
  evidenceDigest
}

ApprovalProof = verified-human-turn { approvedAt, auditRef, approvedDigest }
ApprovedEvidenceSet = { payload: EvidencePayload, approval: ApprovalProof }
```

`evidenceDigest` は `{ schemaVersion, observedRef, candidates }` のcanonical JSONをSHA-256でdigestした値とする。candidatesはfile順、signalsはKnownSignal順、object fieldはschema順でcanonicalizeする。payload生成後の人間承認eventは同じdigestを明示的に記録する。Audit Approval Resolverがeventの実在、人間origin、digestを確認して初めてbranded `ApprovalProof` を返し、純粋validatorは `approvedDigest === evidenceDigest` の場合だけ受理する。`auditRef` はそのeventを指すrepository相対参照であり、Candidate/Signalごとに複製しない。これにより、mutableなenvelope内field同士の自己比較や、同じrefでの内容変更への承認流用を防ぐ。

`CandidateEvidence` と `SignalEvidence` の field は `tech-stack-decisions.md` TECH-2 を維持する。`SourceLocator` は同じ observed ref における `{ file: LogicalRepoPath, startLine, endLine }` とし、line は1始まり・両端を含む。fact は表示・監査専用で、final state の分岐は閉じた disposition だけを読む。

## PERF-D2: 単一 pipeline と計算量

N を `SizeLedger` 行数、C を unit非small候補数、S を emitted signal総数、B を候補source総byte数、E をcanonical `EvidencePayload` の総byte数とする。

1. completeなU1 ledgerを1回走査し、`tier === "unit" && measured !== "small"` のC件を抽出する: O(N)。
2. planned evidence収集は候補sourceを各1回だけ読み、canonical payloadを構成する: O(B + E)。network、child process、LLM fan-out、cache、workerを使わない。
3. Audit Approval ResolverはauditRefが指す別HUMAN_TURNを解決し、payload digestとevent記録digestを照合する。続いてEvidence validatorが候補集合・signal集合・ref・branded proofを1回照合し、payload digestをstreaming再計算する: O(C + S + E)。1件でも不正なら REL-D1 のatomic `invalid-input` とし、queue構築へ進まない。
4. valid evidenceをTECH-2の決定表で各1回分類し、`reviewQueue` と `migrationQueue` の候補を同時に作る: O(C + S)。
5. `reviewQueue` はfile、`migrationQueue` は `(rank, file)` の比較sortを行う: O(C log C)。

したがって収集を含む全体は O(N + B + E + S + C log C) とする。materializeされる `EvidencePayload` 自体はO(E)、それを除く追加作業メモリはO(C + S)である。現行measurement refでは N=442、C=163、S=254だが、いずれも回数上限や配列定数へ埋め込まない。

## PERF-D3: queue と閉包の投影

`classification-review` はnumeric rankを持たず、normalized repository相対fileのcase-sensitive code-unit昇順で `reviewQueue` に置く。確定remediationは `seam-to-small=0`、`retier-to-integration=1`、`retier-to-e2e=1` とし、同rankをfile昇順でtie-breakする。

valid inputでも `reviewQueue` が非空なら result は `open-review` である。migration候補を同時に算出してもactionableではなく、review解消後に更新した `EvidencePayload` を別HUMAN_TURNで再承認し、新しい `ApprovalProof` で全体再評価して `ready` となった `migrationQueue` だけを後続intentが消費する。入力不正時は質問Q2どおり診断だけを返し、partial queueを構成しない。

## PERF-D4: coverage binding の有界な生成

coverage planはledger matrixを1回読み、4 NamedTierを固定順 `unit → integration → e2e → smoke` で各1 bindingへ投影する。`ledgerKeys[]` は各tierの非ゼロkeyだけを既存 `SIZE_VALUES` 順 `small → medium → large` で並べ、該当keyがなければ空配列を許す。binding自体は4件を維持し、補助tierを自動追加しない。

現行combined `coverage/lcov.info` はbinding外の `existing + executed` 観測である。4 bindingのper-tier pathはすべてpendingのため、ファイル生成、読取、容量集計を行わない。unit/integration/smokeのCI参加はexecuted、e2eはnot-executedであり、手動 `--e2e --coverage` の存在をCI参加へ読み替えない。

## PERF-D5: 採用しない最適化と予算

候補数163・排他的bucket 62/1/9/90/1・signal数153/99/1/1は regression oracleであり性能定数ではない。incremental cache、shard、parallel source read、DB index、queue service、CDN、connection poolは、単発のrepository内計画生成には複雑性だけを増やすため採用しない。

p95/p99、RPS、service SLO、FR-5のtier別時間予算はU3に適用しない。per-tier lcovの生成時間・保存量も未実装なのでPENDINGとし、follow-upで経路実装後に実測する。

## PERF-D6: 受け入れ条件

- 同一ledger・`EvidencePayload`・verified `ApprovalProof` から同じ2 queue、rank、順序、coverage bindingを得る。
- source読取は候補ごとに最大1回で、純粋評価側はFS・network・classifierを呼ばない。
- invalid-inputは診断のみ、open-reviewはactionable queueなし、readyだけがactionable migrationQueueを持つ。
- queue sortとdigestを含む計算量は O(N + B + E + S + C log C)、`EvidencePayload` を除く作業メモリは O(C + S) を超えない。
- 現行combined coverageと未実装per-tier pathを同じ状態として扱わない。

## Review

**Reviewer:** amadeus-architecture-reviewer-agent
**Iteration:** 1
**Verdict:** READY

### 検証要点

- `EvidencePayload` のcanonical digest、別HUMAN_TURN、Audit Approval Resolver、verified `ApprovalProof` の順で承認境界が閉じており、今回の設計承認を将来の実データ承認へ流用しない。
- input failureは閉じたdiagnostic unionとtotal sortを経てatomic `invalid-input` となり、`open-review` と `ready` のqueue actionabilityもresult variantで区別されている。
- 4 final state、独立した2 queue、coverageの`PathState` / `CiParticipation` 2軸は上流NFRと整合し、同一入力からの決定性・安定順序・完全性を保つ。
- per-tier path、follow-up Issue番号、実移設、classifier/runner/CI変更、#1157はPENDING / Outのままであり、本intentの設計境界を越えていない。
