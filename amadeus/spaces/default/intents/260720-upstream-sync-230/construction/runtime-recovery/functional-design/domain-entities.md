# Domain Entities — runtime-recovery

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Domain boundary

U02は長寿命database entityを持たない。canonical dependency artifact、runtime graph cache、workflow state、audit ledgerをimmutable snapshotとして読み、回復判定と最終transaction planを返すinvocation-local domainである。

## Bolt DAG model

```ts
type UnitName = string;
type BoltBatch = readonly UnitName[];
type BoltDag = { batches: readonly BoltBatch[] };

type BoltDagSource =
  | { kind: "absent"; path: string }
  | { kind: "parsed"; path: string; dag: BoltDag; digest: string }
  | { kind: "invalid"; path: string; reason: "unreadable" | "missing-block" | "unknown-unit" | "self-edge" | "cycle" | "malformed"; detail: string };

type BoltDagCache =
  | { kind: "missing" }
  | { kind: "empty" }
  | { kind: "invalid"; detail: string }
  | { kind: "present"; dag: BoltDag; digest: string };

type BoltDagRecovery =
  | { kind: "ok"; dag: BoltDag; healed: boolean; source: "cache" | "canonical" }
  | { kind: "none" }
  | { kind: "malformed"; reason: string; detail: string };
```

`digest`は比較用のcanonical serializationから導出し、filesystem mtimeやruntime graph生成時刻をfreshness根拠にしない。`healed`はread-sideの選択結果であり、graph write済みを意味しない。

### Relationships

- `BoltDagSource.parsed` 1件は`BoltDagCache.present` 0..1件と比較される。
- equalならcache由来`ok`、不一致/不在/invalid cacheならcanonical由来`ok`。
- source absentは`none`、source invalidは`malformed`。
- 1つの`BoltDagRecovery.ok`をper-unit、coverage、swarmの3 consumerが共有する。

## Audit evidence model

```ts
type RevisionEventKind =
  | "STAGE_AWAITING_APPROVAL"
  | "STAGE_STARTED"
  | "GATE_REJECTED"
  | "HUMAN_TURN"
  | "ARTIFACT_CREATED"
  | "ARTIFACT_UPDATED";

type RevisionEvidenceEvent = {
  timestamp: string;
  bufferPosition: number;
  kind: RevisionEventKind;
  stage: string | null;
  file: string | null;
  recovered: boolean;
};

type GateRevisionEvidence = {
  anchor: { kind: "gate-open" | "stage-start"; index: number };
  firstHumanIndex: number;
  wroteBeforeHuman: boolean;
  wroteAfterHuman: boolean;
  recordedReject: boolean;
};
```

eventは全shardから抽出した後に`timestamp, bufferPosition`でtotal order化する。timestamp同値時のpositionは決定的tie-breakであり、clone filenameをchronologyに使わない。

## Recovery result and transaction plan

```ts
type GateRevisionRecovery =
  | { kind: "not-needed"; reason: "clean" | "recorded" | "insufficient-evidence" | "autonomous" | "disabled" | "unsupported-stage" }
  | {
      kind: "recovered";
      nextRevisionCount: number;
      events: readonly [RecoveredGateRejected, RecoveredStageRevising, RecoveredGateReentry];
    };

type RecoveredGateRejected = {
  event: "GATE_REJECTED";
  stage: string;
  recovered: true;
};

type RecoveredStageRevising = {
  event: "STAGE_REVISING";
  stage: string;
  revisionCount: number;
  recovered: true;
};

type RecoveredGateReentry = {
  event: "STAGE_AWAITING_APPROVAL";
  stage: string;
  recovered: true;
};

type ApprovalAuditBatch = {
  transactionId: string;
  blocks: readonly [
    RecoveredGateRejected,
    RecoveredStageRevising,
    RecoveredGateReentry,
    GateApproved,
    StageCompleted,
  ];
  expectedAuditDigest: string;
  nextAuditDigest: string;
};

type ApprovalCommitPlan = {
  auditBatch: ApprovalAuditBatch;
  nextStateBytes: Uint8Array;
};
```

`GateRevisionRecovery`はstateを直接変更しない。approve adapterは既存lock内で5 blockと最終stateを全て事前生成・検証し、`ApprovalCommitPlan`を作る。`ApprovalAuditBatch`は5 block全体を一つのtransaction identityで識別し、呼出前audit digestとの一致を前提に単一atomic commitする。これは既存1行emitの5回呼出や、partial write可能な単純appendではない。audit batch成功後に最終completed stateを1回writeする。

## Lifecycle and idempotency

```text
organic gate-open ─ human turn ─ revision write ─ approve
       │                                      │
       └──────── missing reject detected ─────┘
                       │
                       v
Recovered reject → Recovered revising → Recovered re-entry → normal approve
```

完全なaudit batchとstateがcommit済みなら、次のpredicateは`recordedReject=true`となり`not-needed(recorded)`を返す。audit batch成功後にstate writeだけが失敗した場合、次回はtransaction identity、5 blockの完全性、対象state transitionを照合し、同じbatchを再appendせずstate writeだけを再試行する。不完全な1〜4 blockは成功batchとして扱わない。Revision Countも追加増加しない。DAG recoveryも同じcanonical source/cacheから同一結果を返し、persistent mutationを行わないため再評価でaudit/stateを増殖させない。

## Validation and compatibility

- Unit名はdependency artifactの宣言集合に存在し、self edge/cycle/重複edgeを拒否する。
- empty cacheとempty canonical artifactを同一視しない。canonical artifactなしだけが`none`である。
- Revision Count欠落/非数値は既存state contractに従い0から一度増加するが、unknown state shapeを成功へ捏造しない。
- path判定はforward-slash normalized suffixとstage produces contractを使い、絶対worktree pathへ固定しない。
- `transactionId`は同一stage、revision window、approval intentから決定的に導出し、時刻や乱数だけに依存しない。
- batch生成・検証・atomic commit失敗ではaudit/stateの呼出前bytesを維持する。
- audit detailは回復理由を示すがhuman input本文やsecretを複製しない。
- U02にfrontend/UIはないため`frontend-components.md`を生成しない。
