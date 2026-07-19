上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# 論理コンポーネント設計 — U3 移設選定台帳と層別カバレッジ整合計画

本設計は `performance-requirements.md` の二段処理、`security-requirements.md` の信頼境界、`scalability-requirements.md` の4 NamedTier、`reliability-requirements.md` のfail-closed、`tech-stack-decisions.md` のversioned型、および `business-logic-model.md` のC4/C5フローを実装可能な責務へ割り当てる。

## LOG-D1: コンポーネント台帳

| 論理コンポーネント | 責務 | I/O | 現在地 |
| --- | --- | --- | --- |
| Ledger Admission Boundary | U1 complete/ref/row不変条件とunit非small母集団を検証 | U1 outcome → admitted ledger / failure | planned。U1型も未実装 |
| Evidence Collection Boundary | 同一refの候補sourceを各1回読み、人間/curatorがledger signalごとのlocator/fact/disposition候補を組む。private regexは複製しない | ledger candidates + source → unapproved EvidencePayload | planned。意味判断は人間所有 |
| Human Approval Boundary | 具体EvidencePayload生成後の別HUMAN_TURNにpayload digestを提示し、承認eventを記録する | payload digest + human response → audit event | 論理境界。今回の設計承認とは別 |
| Audit Approval Resolver | auditRefのevent実在・human origin・approvedDigestを検証しbranded proofを構成 | auditRef + expected digest → ApprovalProof / failure | planned I/O boundary |
| Evidence Validator | ledger/payload/proofの全単射、ref、digest、locator、fact、dispositionを検証 | ledger + EvidencePayload + ApprovalProof → valid input / diagnostics | planned純関数 |
| Migration Classifier | valid dispositionを閉じた決定表で4 final stateへ写像 | CandidateEvidence → final state | planned純関数 |
| Queue Projector | reviewとmigrationを分離し安定sort、閉包状態を投影 | final states → 2 queues | planned純関数 |
| Coverage Plan Projector | matrixから4 binding、ledgerKeys、path/CI状態を投影 | SizeLedger → CoveragePlan | planned純関数 |
| U3 Result Boundary | atomic invalid / open-review / readyを構成しactionabilityを制御 | validation + queues + coverage → U3PlanningResult | planned orchestration |
| Existing Coverage Runner | file別partをcombined lcovへ結合、CIで3 tierを実行 | repository tests → `coverage/lcov.info` | 現存。per-tier pathではない |
| Per-tier Coverage Follow-up | path命名、tier別lcov、CI fan-out、artifact/ゲートを後続決定 | PENDING plan → future implementation | 番号未定。本intent/Issue #683 Out |

これは11個のpackage/serviceを新設する指示ではない。planned code面はvalidator、classifier、queue/coverage projector、result組立の小さな純関数群と外側の収集/承認解決境界に留める。

## LOG-D2: 依存方向

依存は次の一方向とする。

`U3 Result Boundary → Ledger Admission Boundary`

`U3 Result Boundary → Audit Approval Resolver`

`U3 Result Boundary → Evidence Validator`

`U3 Result Boundary → Migration Classifier → Queue Projector`

`U3 Result Boundary → Coverage Plan Projector`

`Evidence Collection Boundary → Human Approval Boundary → Audit Approval Resolver`

`Per-tier Coverage Follow-up → Coverage Plan Projector`（将来consumer。逆依存なし）

Evidence Validator / Classifier / ProjectorはFS、network、GitHub、CI、LLMをimportしない。source読取、人間判断、audit event解決は外側に隔離し、validatorへはverified proofを渡す。記録済みdispositionからの写像だけを純粋にする。Coverage Projectorは既存runnerを呼ばず、observed stateを計画へ投影するだけである。

## LOG-D3: functional design からの承認済み精密化

`business-logic-model.md` のC4母集団、seam-first、C5のtierキー整合を土台として維持する。一方、後続NFR Requirementsの人間回答A/A/Aにより次を精密化済みであり、古い2区分・単一ledgerKey・具体coveragePathへ戻さない。

| Functional Designの初期形 | 承認済みNFR形 |
| --- | --- |
| signal主体の2 remediation | `ApprovedEvidenceSet` を介した4 final state |
| 単一priority列 | 独立reviewQueue + rank/file順migrationQueue |
| `ledgerKey` 1件 | 同tierの非ゼロ `ledgerKeys[]` |
| 計画上の具体 `coveragePath` | PathStateとCiParticipationの直交2軸、pathはPENDING |

本NFR Designの追加決定は、`EvidencePayload` のcanonical digestに対する別HUMAN_TURN承認とatomic invalid-inputである。実コードや公開adapterを先行追加せず、後続実装時に上記契約を一つの変更単位でmaterializeする。

## LOG-D4: failure domain と blast radius

| Failure / state | Blast radius | Logical result | Actionable |
| --- | --- | --- | --- |
| ledger/evidence/ref/approvalの構造的不正 | 計画全体 | invalid-input + safe diagnosticsのみ | なし |
| valid evidenceだがunknown/lexical false positive | 該当候補から計画閉包全体 | open-review | なし |
| valid seam/retier候補、reviewQueue非空 | 該当候補は確定、計画は未閉包 | open-review内migrationQueue | なし |
| reviewQueue空、全不変条件成立 | 計画全体 | ready | migrationQueueのみ |
| per-tier path未実装 | coverage binding | pending | 実装済みと扱わない |
| e2e CI非参加 | e2e binding | not-executed | PASSと扱わない |

partial input failureをclassification-reviewへ変換せず、正常候補だけを先行実行させない。open-review解消後も更新した `EvidencePayload` に対する新しい `ApprovalProof` と全体再評価を必要とする。

## LOG-D5: shared resource と所有権

| 共有資源 | owner | consumer契約 |
| --- | --- | --- |
| `classifyTestSize` / `SizeClassification` | 既存test-size module | U1だけがsize/signalsを導出。U3は再分類しない |
| `SizeLedger` | U1 planned module | U3はcomplete/ref付きledgerだけを受ける |
| `EvidencePayload` | Evidence Collection Boundary | validatorがschemaVersion=1とcanonical digestを消費 |
| `ApprovalProof` | Human Approval Boundary + Audit Approval Resolver | validatorがpayload生成後のverified HUMAN_TURN proofだけを消費 |
| `${tier}_${size}` matrix key | U1/test_pyramid | Coverage Projectorが非ゼロkeyをSIZE_VALUES順で投影 |
| combined `coverage/lcov.info` | Existing Coverage Runner | 観測のみ。per-tier binding pathに流用しない |
| per-tier coverage contract | 新規follow-up | #683を再オープンせず、PENDINGから開始 |

## LOG-D6: Infrastructure Designへの引き渡しとスコープ

U3はlocal Bun process、repository file、Git/auditだけを使う設計・計画であり、AWS account、VPC、IAM、compute/storage service、DB、cache、queue、load balancer、autoscaling、monitoring serviceを必要としない。Infrastructure Designへ渡すcloud componentはない。AWS Well-Architected各pillarは既存ローカル資源の最小使用・測定事実・不要資源不追加でN/Aまたは非適用とする。

本成果物はmarkdown設計のみで、`packages/`、`scripts/`、`tests/`、`dist/`、runner、classifier、CI、self-install、#1157を変更しない。実移設、`EvidencePayload` / `ApprovalProof` / API実装、per-tier lcov、follow-up Issue起票、path名、exit code、強制gateは後続の明示範囲に残す。
