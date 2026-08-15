# Component Methods — intent 260815-rfc-autonomy-modes

> 公開シグネチャの水準(詳細な業務規則は functional-design 相当を code-generation plan へ委譲 — 本 intent は設計ステージ縮約構成)。エラー処理は既定で Result/判別ユニオン + fail-closed(project.md Code Style)。

## C1 amadeus-recommendation.ts

```ts
type RecommendationOutcome =
  | { kind: "unique"; optionId: string; basis: RecommendationBasis }
  | { kind: "contested"; candidates: readonly Candidate[]; reason: string }
  | { kind: "none"; reason: string };
type Candidate = { optionId: string; rationale: string; rank: number };
type RecommendationBasis = { source: "norm" | "prior-ruling" | "election" | "agent"; fingerprint: string };

const RecommendationOutcome: {
  unique(optionId: string, basis: RecommendationBasis): RecommendationOutcome;
  contested(candidates: readonly Candidate[], reason: string): RecommendationOutcome;  // candidates.length >= 2 を強制
  none(reason: string): RecommendationOutcome;
  parse(value: unknown): Result<RecommendationOutcome, DecodeError>;  // parse-don't-validate
  presentationOf(o: RecommendationOutcome): RulingPresentation;       // 候補+根拠+非一意事由+推奨順
};
```

- エラー: parse は DecodeError(fail-closed)。contested の candidates < 2 は構築時例外(表現不能化)。

## C2 梯子(amadeus-bolt.ts / intent-autonomy*.ts)

```ts
// 各段の導出: 旧「常に 1 件」→ RecommendationOutcome
deriveLadderRecommendation(input): RecommendationOutcome;          // 段ごと
resolveAutoDecision(input): AutoDecisionResolution;                // unique のみ AUTO_DECIDED、それ以外は escalate(outcome 同梱)
deriveGateRecommendation(gateContext): RecommendationOutcome;      // Q2=B: 常に unique("approve", basis) — red は到達前に既存 fail-closed
```

- エラー: 選挙 hold → contested/none 写像。unique 以外は AUTO_DECIDED を emit しない(縮退進行の除去を型で保証)。

## C3 対話性判定

```ts
resolveSessionInteractivity(projectDir): { interactive: boolean; source: "human-turn-pipeline"; measuredAt: string };
// 消費者: Stop hook / FR-4 分岐 / --status。全員この関数のみ。判定不能は { interactive: false }(fail-closed)
```

## C4 waiting 状態(state.ts / orchestrate.ts)

```ts
enterWaiting(projectDir, cause: WaitingCause): Result<WaitingReceipt, WaitingRefusal>;   // engine 内部専用(export しない/CLI verb なし)
type WaitingCause = { occurrenceId: string; outcome: RecommendationOutcome /* contested|none のみ */;
                     derivationTranscript: string; basisFingerprint: string };
resumeInterruption(projectDir): ResumeDispatch;   // 単一入口 — 記録種別で park | waiting | repair-stalled へ型 dispatch
// waiting resume → RulingPresentation を再提示して裁定を受ける
// repair-stalled resume → 是正証跡(remediationEvidence)必須、欠くと refuse(fail-closed)
admitWaiting(cause): Result<void, RateRefusal>;   // 鍵 = occurrenceId + basisFingerprint。同鍵反復はエスカレーションへ
```

- park guard(state.ts:1599 の HUMAN_TURN 前提)は削除。park の 1-turn=1-park 会計は無改変。
- 監査イベント: `WORKFLOW_WAITING_ENTERED` / `WORKFLOW_WAITING_RESUMED`(audit-format.md へ登録、event-registry 更新)。

## C5 mode 権限

```ts
SEMI_ROUTINE_INTERACTIONS: readonly InteractionKind[];   // 差し替え: stage-gate, question, §13, batch-boundary…(phase-gate / walking-skeleton を除く全種)
allowsOccurrence(authority, occurrence): boolean;        // phase-boundary 一律拒否 → 「phase-boundary | walking-skeleton のみ人間」へ
type EffectClassification = "workflow-reversible" | "advisory-deferral" | ProhibitedEffectClassification;
// advisory-deferral は plugin advisories 宣言由来の defer-with-risk のみが持てる(構築点で限定)
firesWalkingSkeletonGate(stance: SkeletonStance): boolean;  // Q9=A — stance のみが決める
```

## C6 投影真実性

```ts
projectConstructionAutonomy(mode): "autonomous" | "gated";      // none→gated, semi→autonomous, full→autonomous
detectProjectionDivergence(state): DivergenceReport | null;      // 全 mode。非 null は loud fail(exit 非 0)
```

## C7 config

```ts
// LEGACY_KEY_REPLACEMENTS へ 3 エントリ追加(solo-election.trigger.mode → 廃止案内 / *.mode → *.consent ×2)
deriveSoloElectionTrigger(mode): "manual" | "auto";   // none→manual, semi|full→auto(キーは存在しない)
```

## C8 可視化

```ts
statusAutonomyFacet(projectDir): { mode; projection; interactive; mirrorConsent; findingConsent };  // C3/C5/C6/C7 の実効関数から直結
```

## C9 完了レポート

```ts
buildAutoDecisionSummary(recordDir): SummaryDoc;   // 入力は AUTO_DECIDED 監査行 + list-auto-decisions のみ。件数は機械集計
```

## C10 §13

```ts
confirmZeroCandidates(surfaceOutput): ZeroReceipt;         // digest 束縛。0 件なら選定裁定をスキップ
addConductorCandidate(candidate, diskEvidencePath): …;      // 増やす方向のみ。disk 再導出必須
```

## C11 マージ委任 provenance

```ts
recordDelegatedMerge(evidence: { standingRulingRef: string; ciConclusion: string; convergedDigest: string }): AuditReceipt;
```

## C12 grant ceremony

```ts
// preview-autonomy 出力末尾に貼り付け可能な完全形コマンドを印字(挙動不変)
```

## C13 presence-closure

```ts
// amadeus-bolt.ts approve-batch 経路
verifyBatchApprovalPresence(projectDir): Result<PresenceReceipt, PresenceRefusal>;
// 未消費 HUMAN_TURN を要求。欠くと approve-batch は state 編集・GATE_APPROVED 放出の前に refuse(fail-closed)

// amadeus-lib.ts presence 検査
scanPresenceLedger(...): PresenceScan;   // 既存 — 「empty buffer → fail open」の帰結分岐を呼出側で fail-closed 化
resolveGatePresence(scan): PresenceVerdict;  // ledger 不在/読取不能 → { present: false, reason: "ledger-absent" }(素通り廃止)
```

- エラー: refuse はいずれも loud(exit 非 0 + 理由)。既存の正当経路(実 HUMAN_TURN あり)の無退行テストを対で置く。
