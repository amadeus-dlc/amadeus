# Domain Entities — unit waiting-interruption(U3)

> シグネチャは component-methods.md C4 を正本として再利用し、必要な箇所のみ精緻化する。スタイルは project.md Code Style(class-free、type + コンパニオンオブジェクト、判別ユニオン Result)に従う。

## 本 unit が所有する型

### `WaitingCause`

```ts
type WaitingCause = {
  readonly occurrenceId: string;
  readonly outcome: RecommendationOutcome;   // contested | none のみ(U1 所有の型)
  readonly derivationTranscript: string;
  readonly basisFingerprint: string;
  readonly interactivityBasis: InteractivityBasis;
};
```

「なぜこの実行が裁定を待って止まったか」を完全に説明する値。component-methods.md C4 の 4 フィールドに `interactivityBasis` を加えている — RFC-0001 Guide-level が「中断を駆動した場合は park 理由に判定根拠を含め、誤判定を利用者が反証・是正できる形にする」と要求しており、この根拠を事由オブジェクトの外に置くと再提示時に失われるためである(R-20)。

**永続表現**: `WaitingCause` は値として持ち回るだけでなく、**Intent autonomy トランザクション台帳の waiting 進入イベントの payload として永続化される**(business-logic-model.md §2.1、R-7a)。すなわちこの型は台帳の直列化対象であり、`autonomyCanonicalJson` で符号化できる形(プレーンなデータのみ、関数・クラスインスタンス・循環参照を含まない)でなければならない。復元は `readIntentAutonomyTransactions`(`amadeus-intent-autonomy-replay.ts:95-121`)による replay 経由で、`Transaction Digest` の一致検査(同 `:102-109`)が完全性を担保する。

**不変条件**
- `outcome.kind !== "unique"`(R-8)。一意に決まった裁定は中断理由になりえない。
- `basisFingerprint` は SHA-256 形式。算出規則は本 unit の外(ADR-11 の code-generation 申し送り — 「導出過程の正規形 digest」で、空白・順序の自明摂動で変わらないこと)。
- `derivationTranscript` は非空。どの段まで導出を尽くしたかを人間が読める形で持つ(RFC-0001 の「導出(ノルム・過去裁定・選挙)を尽くした後にのみ contested を返せる」の事後検証材料)。
- `occurrenceId` は既存 `InteractionOccurrence.occurrenceId` と同一の識別子空間に属する。新しい ID 体系を作らない。

### `InteractivityBasis`

```ts
type InteractivityBasis = {
  readonly interactive: false;               // waiting は非対話でのみ成立する
  readonly source: "human-turn-pipeline" | "headless-signal" | "undetermined";
  readonly measuredAt: string;
};
```

U2(C3)の `resolveSessionInteractivity`(component-methods.md C3)が返す判定を、中断記録へ転記した形。`source: "undetermined"` は fail-closed で非対話とみなした場合を表し、利用者が「判定を誤った」と反証できる情報を残す。`interactive` を `false` リテラルに固定することで、対話セッションの記録が waiting へ入る形が型として構築できない。

### `WaitingReceipt` / `WaitingRefusal` / `RateRefusal`

```ts
type WaitingReceipt = { readonly waitingId: string; readonly enteredAt: string; readonly cause: WaitingCause };
type WaitingRefusal = { readonly reason: "malformed-cause" | "not-suspendable" | "rate-refused"; readonly detail: string };
type RateRefusal   = { readonly key: string; readonly priorWaitingId: string; readonly escalation: "human" | "repair" };
```

`RateRefusal.escalation` が 2 値であることが ADR-4 の「超過はエスカレーションのみ(自動続行分岐なし)」を型で表す(R-11)。「続行」を表す第 3 の値を持たない。

### `ResumeDispatch`

```ts
type ResumeDispatch =
  | { readonly kind: "park";           readonly stage: string }
  | { readonly kind: "waiting";        readonly presentation: RulingPresentation; readonly cause: WaitingCause }
  | { readonly kind: "repair-stalled"; readonly requiresRemediationEvidence: true }
  | { readonly kind: "none" };
```

`resumeInterruption` の単一入口が返す判別ユニオン(R-16)。3 終端が resume 経路でも型として分かれることを、この判別子が担保する。判定不能な記録は `none` ではなく **refuse**(例外ではなく loud なエラー戻り)として扱い、park へフォールバックしない(R-18)。

## 本 unit が拡張する既存型

| 型 | 位置 | 拡張内容 |
|---|---|---|
| `StopReason` | `amadeus-intent-autonomy.ts:15` | waiting 用の値を 1 つ追加。既存 4 値(`AWAITING_HUMAN` / `REPAIR_STALLED` / `NORM_CONFLICT` / `USER_PARKED`)は不変 |
| `ResumeCondition` | 同 `:1091-1096` | waiting 用の種別を 1 つ追加。既存 4 種は不変 |
| `validateResumeCondition` の対応表 | 同 `:1097-1108` | 1 行追加。`Record<StopReason, ...>` が全域であるため、`StopReason` の追加だけではコンパイルが通らず、対応表の更新が構造的に強制される |
| `ParkEnvelope` | 同 `:156-163` | **6 フィールド固定のまま不変**(下記「envelope と台帳の役割分担」) |
| `AutonomyRuntimeEvent` | `amadeus-intent-autonomy-runtime.ts:49-87` | waiting 進入 / 再開の 2 判別子を追加。**進入側が `WaitingCause` を payload に持つ = 事由の永続面**。park 対(`:79-86`)と同様式 |
| `DirectiveKind` と付随表 | `amadeus-directive.ts:56` 近傍、`VALID_KINDS`(`:466`)、フィールド集合表(`:568`)、検証テーブル(`:668-671`) | waiting 用 kind を 1 つ追加。`ParkedDirective`(`:395-399`)と同様式 |

### envelope と台帳の役割分担

`ParkEnvelope` の 6 フィールドは **固定幅の識別子** を持ち、可変幅の事由本体は台帳イベントが持つ。両者は `parkTransactionId` で join する。

| WaitingCause の要素 | 置き場所 | 型上の制約 |
|---|---|---|
| `occurrenceId` | `ParkEnvelope.triggerOccurrenceId` | 既存フィールド、変更なし |
| `basisFingerprint` | `ParkEnvelope.resumeCondition.evidenceFingerprint` | SHA-256 を受ける既存フィールド。`validateResumeCondition`(`:1103-1105`)の検査を満たす |
| 台帳への参照 | `ParkEnvelope.parkTransactionId` | 既存フィールド、join 鍵 |
| resume 条件の識別子 | `ResumeCondition.identity` | `SAFE_ID` 検査(`:1104`)があるため **自由文不可**。`autonomyStableId` による導出 ID のみ(`parkForHuman` が `amadeus-intent-autonomy-runtime.ts:496-497` で行うのと同形) |
| `outcome` / `derivationTranscript` / `interactivityBasis` | 台帳イベントの payload | canonical JSON で直列化可能であること |

この分割は `readProductionRepairStall`(`amadeus-intent-autonomy-production.ts:1143-1165`)が REPAIR_STALLED に対してすでに採っている形と同一で、envelope の識別子(`:1147-1148`、`:1160-1163`)と台帳イベントの payload(`:1154-1159` の `event.latch`、`:1164` の `qualityScopeId`)を fingerprint で突き合わせて合成している。waiting は同じ形を Intent autonomy 台帳に対して踏襲する。

`AutonomyProjection` の不変条件(`amadeus-intent-autonomy.ts:209-213` — `workflowExecutionState === "suspended"` と `parkEnvelope !== null` の同値、および resume 条件の検査)は **無改変**、かつ projection に新しい永続フィールドを足さない。resume 時に事由を得る手段は projection の新フィールドではなく `parkTransactionId` 経由の台帳参照だからである。この選択は `transactionShape`(`amadeus-intent-autonomy-replay.ts:34-46`)が payload の projection に `assertLegalAutonomyProjection` 適合と digest 一致を要求することとも整合する — projection の形を変えなければ、この既存検査が新 payload に対してそのまま効く。

## 監査イベント(本 unit が登録する語彙)

これらは **ライフサイクルマーカー** であり、事由の格納先ではない(R-7d)。可変幅の payload は台帳イベント側にあり、マーカーは `Transaction Id` でそこを指す。

| イベント | いつ | 必須属性 | 任意属性 | 発行元 |
|---|---|---|---|---|
| `WORKFLOW_WAITING_ENTERED` | 非対話の実行が裁定を待って中断した | Stage、Occurrence Id、Basis Fingerprint、Transaction Id | Timestamp | engine(waiting admission 経路) |
| `WORKFLOW_WAITING_RESUMED` | waiting の記録が再提示され裁定を受けた | Stage、Transaction Id | Timestamp | engine(resume 経路) |

属性の形は既存 park 対(`otel/event-registry.ts:118-134`、`audit-format.md:40-41`)に揃える — category は `workflow-lifecycle`、durability は `canonical`、`schemaVersion: 1`。登録は R-21 が列挙する 5 面すべてを同一変更で行う。

マーカーと台帳の二面構成は park の既存構造と同型である — park も state 層の `WORKFLOW_PARKED` 監査行(`amadeus-state.ts:1616-1619`)と autonomy 層の `WORKFLOW_PARKED` ランタイムイベント(`amadeus-intent-autonomy-runtime.ts:79`)の 2 面を持つ。waiting が新しい二重化を導入するわけではない。マーカーは台帳から導出可能な投影であり、食い違った場合は台帳が正である。

## 意図的にモデル化しないもの

- **`RecommendationOutcome` の型定義そのもの**: U1(C1)の所有。本 unit は import して格納・復元するだけで、判別子の追加・提示形の変更を行わない。
- **対話 / 非対話の判定関数**: U2(C3)の所有。本 unit は判定 **結果** を `InteractivityBasis` として受け取るだけで、判定ロジックを持たない(UI 真実性 — 全消費者が同一ソースから読む)。
- **`basisFingerprint` の正規化アルゴリズム**: ADR-11 の code-generation 申し送り。本 unit は鍵として使うのみ。
- **対話 arm の carveout**: U4(ADR-5)の所有。本 unit は非対話 arm の倒し先を提供するだけで、Stop hook の分岐を持たない。
- **semi の権限表現・投影**: U5(C5 / C6)の所有。本 unit は park guard を廃棄して U5 の前提を作るところまで。
- **REPAIR_STALLED の提示面の再設計**: functional-design-questions.md Q2 で本 unit のスコープ外と確定(ADR-4 の分離対象 3 面に directive が含まれないため)。現行の `parked` directive 経由の提示を無退行で保つ。
- **park の HUMAN_TURN 会計の再設計**: components.md C4 が「無改変」と明示。1 turn = 1 park の意味論に触れない。
- **waiting 用の CLI verb**: components.md C4 が「engine 発行専用(AI/利用者向け CLI verb なし)」と明示(R-6)。
- **旧 guard の互換フラグ・段階移行**: org.md Forbidden(要求されていない後方互換レイヤー・移行シムの追加禁止)により、guard を残したまま新経路を並走させる形は作らない。置換のみ。
- **新しい永続ストア**: record 配下の専用 runtime ファイル、Runtime State の新フィールド、waiting 専用のインデックスファイルはいずれも作らない(business-logic-model.md §2.3 に不採用理由)。事由の格納先は既存の Intent autonomy トランザクション台帳ただ 1 つである。
- **台帳の codec / 形状ガードの改造**: `encodeIntentAutonomyTransaction` / `decodeIntentAutonomyTransaction`(`amadeus-intent-autonomy-replay.ts:48-62`)と `transactionShape`(同 `:34-46`)は変更しない。canonical JSON なので新判別子は自動的に往復する。ここに変更が要るなら格納先の選定が誤っている(R-21a)。
