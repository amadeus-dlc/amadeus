# Business Logic Model — unit waiting-interruption(U3)

> 対応設計: C4(park guard 廃棄 + waiting 状態 + 3 終端分離 + レート制約)。対応 FR: FR-3(+ Q7 / Q8 / Q14 裁定)。裁定出典: ADR-4。
>
> 現行コードの引用はすべて本起草時(2026-08-15、ブランチ bugfix-0815-0)の実読による。

## 1. 現行の中断機構(改修対象の実像)

中断は 2 つの層に分かれて存在する。

### 1.1 state 層の park(利用者都合の中断)

`packages/framework/core/tools/amadeus-state.ts` の `handlePark`(`:1596-1626`)。`Parked` / `Parked At Stage` を Runtime State へ書き(`:1620-1621`)、`WORKFLOW_PARKED` を監査へ出す(`:1616-1619`)。解除は `unparkLocked`(`:1631-1662`)で、`WORKFLOW_UNPARKED`(`:1657`)を出して両フィールドを削除する。

この park には **autonomy guard**(`:1600`)がある:

```
if (isAutonomousMode(content) && outstandingHumanTurns(pd).length === 0) {
  error("Refusing to park: Construction Autonomy Mode is autonomous and no unconsumed HUMAN_TURN is on record. ...");
}
```

先行するコメント(`:1565-1595`)がこの guard の前提を逐語で述べている — 「an unattended run has no human to resume it and must keep moving」。RFC-0001 の D1 / D5 が是正対象とするのはこの前提そのものであり、`outstandingHumanTurns`(`amadeus-lib.ts:3923-3936`。台帳不在時は `[]` を返す fail-closed)が 0 件になる非対話 full 実行では、park が構造的に不可能になっている。

### 1.2 autonomy projection 層の suspension(engine 都合の中断)

`ParkEnvelope`(`amadeus-intent-autonomy.ts:156-163`)が `parkTransactionId` / `triggerOccurrenceId` / `reason: StopReason` / `resumeCondition` / `monitorLatchIdentity` / `beforeProjectionDigest` を持ち、projection の不変条件(`:209-213`)が `workflowExecutionState === "suspended"` と `parkEnvelope !== null` の同値、および `validateResumeCondition` の適合を要求する。

`StopReason` は 4 値(`:15`)で、`validateResumeCondition`(`:1097-1108`)が resume 条件種別との対応を強制する:

| StopReason | ResumeCondition kind | 現在の発行元 |
|---|---|---|
| `AWAITING_HUMAN` | `human-or-capability` | `amadeus-intent-autonomy-runtime.ts:490-503` の `parkForHuman`(呼び出しは `:595` 効果認可の拒否、`:623` 権限の拒否) |
| `REPAIR_STALLED` | `quality-evidence-or-human` | 品質修復ループの停止(`amadeus-intent-autonomy-production.ts:1048-1064`) |
| `NORM_CONFLICT` | `norm-change` | 梯子 norm 段の競合(`amadeus-intent-autonomy.ts:943`) |
| `USER_PARKED` | `human-unpark` | 利用者の park |

### 1.3 終端の潰れ(3 終端分離が必要な理由)

directive の層では、REPAIR_STALLED が `parked` directive として提示されている — `amadeus-orchestrate.ts:3177-3188` の `emitRepairStalledIfSuspended` が `emit(parkedDirective(repairStalledReason(stall), stall.stageInstanceId))` を実行し(`:3186`)、`stageFailureDirective`(`:6150-6162`)も同じ `parkedDirective` を使う(`:6156`)。`ParkedDirective`(`amadeus-directive.ts:395-399`)は `reason` と `stage` の 2 フィールドしか持たないため、**終端の種別は自由文の reason 文字列にしか現れない**。

つまり「利用者が止めた」「欠陥で止まった」の 2 種がすでに同じ提示形に潰れており、ここに waiting を第 3 の相乗りとして足すと区別が完全に失われる。ADR-4 の 3 終端分離はこの状況への是正である。

## 2. 永続面の確定(WaitingCause の格納先)

ADR-4 は admission の事由束縛・同内容再提示・レート鍵のセッション跨ぎ照合の 3 つを要求するが、これらはいずれも `WaitingCause` を **書ける面と読める面** が実在して初めて成立する。本節でその面を 1 つに確定する。

### 2.1 確定した格納先 — Intent autonomy トランザクション台帳(audit-first)

`WaitingCause` は **`AutonomyRuntimeEvent` の新しい判別子として、既存の Intent autonomy トランザクション台帳に格納する**。新しい保存場所を作らない。

この台帳の実体は次のとおり(すべて既存機構):

| 面 | 実体 | 位置 |
|---|---|---|
| 書込 | `AutonomyRuntimeEvent` を `IntentAutonomyTransaction.events` に載せて commit → `INTENT_AUTONOMY_TRANSACTION_COMMITTED` 監査行として append | `amadeus-intent-autonomy-runtime.ts:49-87`(イベント union)、`:89-99`(トランザクション)、`amadeus-intent-autonomy-replay.ts:138-166`(commit 時の監査放出) |
| 直列化 | canonical JSON → base64url。`Transaction` 属性へ格納 | `amadeus-intent-autonomy-replay.ts:48-51`(`encodeIntentAutonomyTransaction`)、`:64-70`(`intentAutonomyAuditFields`) |
| 読出 | 監査シャードを replay してトランザクション列を復元 | 同 `:127-136`(`readIntentAutonomyTransactionsFromAudit`)、`:95-121`(`readIntentAutonomyTransactions`) |
| 完全性 | 復元時に `Transaction Digest` と `autonomyDigest(transaction)` の一致を検査し、不一致は throw | 同 `:102-109` |

**park との役割分担(ParkEnvelope 不変宣言との整合)**: `ParkEnvelope`(`amadeus-intent-autonomy.ts:156-163`)は 6 フィールド固定のまま変えない。envelope が持つのは **固定幅の識別子** だけで、可変幅の事由本体は台帳イベント側が持つ。両者は次のように接続する:

| WaitingCause の要素 | どこに置くか |
|---|---|
| `occurrenceId` | `ParkEnvelope.triggerOccurrenceId`(既存フィールド) |
| `basisFingerprint` | `ParkEnvelope.resumeCondition.evidenceFingerprint`(SHA-256 を受ける既存フィールド) |
| 台帳イベントへの参照 | `ParkEnvelope.parkTransactionId`(既存フィールド — join 鍵) |
| `outcome` / `derivationTranscript` / `interactivityBasis` | 台帳イベントの payload |
| resume 条件の identity | `ResumeCondition.identity`。`SAFE_ID` 検査(`:1104`)を満たすよう `autonomyStableId` で導出する(`parkForHuman` が `amadeus-intent-autonomy-runtime.ts:496-497` で行っているのと同じ形)。自由文はここへ入れない |

これは **REPAIR_STALLED がすでに採っている形と同一** である。`readProductionRepairStall`(`amadeus-intent-autonomy-production.ts:1143-1165`)は、envelope から `reason` と `resumeCondition.evidenceFingerprint` を読み(`:1147-1148`)、品質修復トランザクション台帳を replay して `event.type === "REPAIR_STALLED" && event.latch.evidenceFingerprint === evidenceFingerprint` を満たすイベントを引き当て(`:1154-1159`)、envelope 側の識別子と台帳側の payload(`qualityScopeId`)を合成して返す(`:1160-1165`)。waiting はこの経路を Intent autonomy 台帳に対して踏襲する。

`AutonomyProjection` に新しい **永続フィールドを足さない** という前回の宣言も維持される。resume 時に事由を得る手段は「projection の新フィールドを読む」ではなく「`parkEnvelope.parkTransactionId` を鍵に台帳を引く」だからである。`transactionShape`(`amadeus-intent-autonomy-replay.ts:34-46`)は payload に `assertLegalAutonomyProjection` 適合と digest 一致を要求するため、projection の形を変えない選択はこの検査を通す条件でもある。

### 2.2 監査イベント 2 種の位置づけ

component-methods.md C4 が要求する `WORKFLOW_WAITING_ENTERED` / `WORKFLOW_WAITING_RESUMED` は、ADR-4 の「監査イベントを分離する」を満たす **人間可読のライフサイクルマーカー** であり、事由の格納先ではない。属性は Stage / Occurrence Id / Basis Fingerprint / Transaction Id(台帳への参照)/ Timestamp に限り、`outcome` などの可変幅 payload を持たない。

マーカーは台帳から導出可能な投影であって独立の真実ではない — マーカーと台帳が食い違った場合は台帳が正である。これは park が state 層の `WORKFLOW_PARKED`(`amadeus-state.ts:1616-1619`)と autonomy 層の `WORKFLOW_PARKED` ランタイムイベント(`amadeus-intent-autonomy-runtime.ts:79`)の 2 面を持つのと同じ構造で、waiting だけが新しい二重化を導入するわけではない。

### 2.3 他の 2 候補を採らない理由

**(a) record 配下の専用 runtime ファイル**(例 `<record>/.amadeus-waiting/<occurrenceId>.json`)を採らないのは、事由が **監査可能性を要求される情報** だからである。ADR-4 の自己 park 脅威対策(Q8=B)は「反復中断の検知」を成立させるためにレート鍵をセッション跨ぎで照合するが、`.amadeus-*` 配下は `.gitignore` で除外される per-clone のスクラッチ領域であり(CLAUDE.md Git Integration の除外列 `amadeus/spaces/*/intents/*/.amadeus-*`)、消せば履歴が消える。「止まった理由の記録を消せば再び止まれる」経路を作ることは、脅威対策そのものを無効化する。append-only の監査台帳に置けば、消去は監査シャードの改竄として検出対象になる(P2)。

**(c) Runtime State の新フィールド** を採らないのは、`amadeus-state.md` のフィールドが `Key: value` のスカラ面であり、候補配列と導出過程トランスクリプトを持つ構造化 payload を表現できないからである。JSON をスカラ値へ押し込む形は、`setOrInsertField` / `getField` の素朴な行パースを構造化データの符号化器として転用することになり、既存の state ファイル契約を壊す。加えて state ファイルは人間がレビューするバージョン管理下の文書であり、機械 payload の置き場としては誤りである。

いずれの候補も「新しい保存場所を 1 つ増やす」点で共通し、org.md Forbidden(要求されていない二重実装の禁止)と衝突する。既存の audit-first 台帳がこの用途をすでに満たしている以上、新設は正当化されない。

## 3. 改修後の処理フロー

### 3.1 waiting への進入(admission)

```
裁定点で終端が unique 以外(U1 の contested / none)、または人間専権事項
  │
  ├─ 対話セッション(U2 の判定が interactive)  → U4 の carveout(ターン返却して人間裁定) ※本 unit の対象外
  └─ 非対話セッション(fail-closed の既定)
        │
        ▼
   WaitingCause を組み立てる
     { occurrenceId, outcome(contested|none), derivationTranscript, basisFingerprint }
        │
        ▼
   admitWaiting(cause) — レート制約
     読み口: 監査シャードを replay してトランザクション列を復元し(readIntentAutonomyTransactionsFromAudit)、
             events 中の waiting 進入イベントを occurrenceId + basisFingerprint で照合する
     ├─ 同鍵の既存 waiting が無い / 根拠が実質変化している → 許可
     └─ 同鍵の反復到達                                    → RateRefusal → エスカレーション
        │(許可)
        ▼
   enterWaiting(projectDir, cause)
     ├─ 台帳: WaitingCause を載せた waiting 進入イベントを含むトランザクションを commit
     │        → INTENT_AUTONOMY_TRANSACTION_COMMITTED(encode + Transaction Digest)
     ├─ projection: workflowExecutionState = "suspended"、parkEnvelope に waiting 用 StopReason
     │              (parkTransactionId が上記トランザクションを指す)
     ├─ 監査: WORKFLOW_WAITING_ENTERED(マーカー。Transaction Id を属性に持つ)
     └─ 戻り: WaitingReceipt
        │
        ▼
   次の `next` が waiting directive を出して終端
```

レート制約の鍵の後半 `basisFingerprint` が「根拠が実質変化した再到達は正当」(ADR-4)を担保する。前半 `occurrenceId` の同一性判定は、`amadeus-intent-autonomy-production.ts:805` の既存重複判定(`projection.autoDecisions.some((decision) => decision.occurrenceId === target.occurrenceId)`)と同じ鍵概念の再利用である(components.md C4)。`basisFingerprint` の正規化規則は ADR-11 が code-generation への申し送りとしており、本 unit は **与えられた fingerprint を鍵として使う** ところまでを設計する。

鍵の照合が **セッションを跨いで成立する** のは、読み口が §2.1 の台帳(disk 上の監査シャード)であって実行中プロセスのメモリではないからである。前セッションで waiting へ入った実行の事由は、次セッションの replay で同じ鍵として復元される。照合対象の列挙は `readProductionRepairStall` が REPAIR_STALLED の latch を引く走査(`amadeus-intent-autonomy-production.ts:1154-1159`)と同形で、`.filter(... events.some(...))` による全走査である。

超過時に自動続行の分岐を作らないことが ADR-4 の明示条件である。エスカレーション先は人間または REPAIR の 2 つのみで、「レート超過だから進む」は存在しない。

### 3.2 3 終端の分離

| 終端 | 意味 | StopReason | ResumeCondition | 監査イベント | directive |
|---|---|---|---|---|---|
| park | 人間の都合で止める | `USER_PARKED` | `human-unpark` | `WORKFLOW_PARKED` / `WORKFLOW_UNPARKED` | `parked`(既存・不変) |
| waiting | 裁定を待って止まる | **新設** | **新設** | **`WORKFLOW_WAITING_ENTERED` / `WORKFLOW_WAITING_RESUMED`** | **新設** |
| REPAIR_STALLED | 欠陥で止まった | `REPAIR_STALLED` | `quality-evidence-or-human` | 既存(quality repair transaction) | `parked`(既存・**本 unit では不変**) |

REPAIR_STALLED の提示面を本 unit で変えないことは functional-design-questions.md Q2 で明示したスコープ判断である(ADR-4 の分離対象 3 面に directive は含まれないため、提示面の変更は承認済み設計の外)。

### 3.3 park guard の廃棄

`amadeus-state.ts:1600-1605`(条件 `:1600` と `error(...)` 呼び出し `:1601-1605`)の拒否を削除する。削除に伴い、`:1574-1595` の guard を説明するコメント塊(前提「an unattended run has no human to resume it and must keep moving」を含む)も同時に除去する — 実装から消えた規則の説明文が残ることは FR-8(UI 真実性)の乖離クラスにあたる。

**保持するもの**: `handlePark` の他の拒否(`Status === "Completed"` — `:1608-1610`、`Current Stage` 不在 — `:1612-1614`)、`WORKFLOW_PARKED` の発行(`:1616-1619`)、HUMAN_TURN の 1 turn = 1 park 会計(components.md C4 が無改変と明示)。

**順序制約**: FR-5(semi の Bolt 自律化)は本 unit の guard 廃棄に先行依存する。requirements.md Constraints が「誤順で semi が park 能力を失う」と述べるとおり、semi の投影を autonomous にする改修(U5)を先に着地させると、guard がまだ生きている間 semi が park できなくなる。本 unit が先である。

### 3.4 resume

```
resumeInterruption(projectDir) — 単一入口
  ├─ 記録種別が park            → 既存 unpark 経路(WORKFLOW_UNPARKED)
  ├─ 記録種別が waiting         → RulingPresentation を復元して再提示 → 人間の裁定を受ける
  │                                → WORKFLOW_WAITING_RESUMED
  └─ 記録種別が repair-stalled  → remediationEvidence を要求。欠くと refuse(fail-closed)
```

waiting の再提示内容は §2.1 の台帳から次の順で得る:

1. projection の `parkEnvelope` を読み、`reason` が waiting 用の `StopReason` であることを確認する(`readProductionRepairStall:1146-1147` と同形)
2. `parkEnvelope.parkTransactionId` を鍵に、replay したトランザクション列から該当トランザクションを引く
3. その `events` から waiting 進入イベントを取り出し、payload の `WaitingCause` を得る
4. `WaitingCause.outcome` を U1 の `parse` で復元し `presentationOf` へ通して `RulingPresentation` を作る

RFC-0001 の UX 契約「非対話中断時も同内容を park 理由へ記録して復帰時にその場で裁定できる形で再提示する」は、この **1〜4 の往復が内容を保つこと** として本 unit が検証する(R-19)。往復の完全性は台帳側の `Transaction Digest` 検査(`amadeus-intent-autonomy-replay.ts:102-109`)と U1 側の `parse` の 2 段で担保され、どちらの段でも不一致は fail-closed である。

## 4. 他 unit との統合シーム

unit-of-work-dependency.md「統合ポイント」に従う。

| 相手 | シーム | 方向 |
|---|---|---|
| U1 recommendation-core | `WaitingCause.outcome` に載る `RecommendationOutcome`(contested / none のみ)と `parse` / `presentationOf` | U1 → U3(blockedBy) |
| U2 presence-detection | 対話性の実効判定。非対話であることが admission の前提 | U2 → U3(blockedBy) |
| U4 interactive-carveout | 対話 arm の倒し先が本 unit の waiting(U4 は非対話 arm をここへ倒す) | U3 → U4 |
| U5 semi-authority-projection | park guard 廃棄後の state 契約。U5 の semi 投影 autonomous 化はこれに依存 | U3 → U5 |
| 共有台帳 | Intent autonomy トランザクション台帳のイベント union(§5.1)、event-registry + audit-format.md の新イベント 2 種(§5.2)、`tests/.coverage-registry.json`(新規テスト時 regen) | U3 → 全体 |

`amadeus-orchestrate.ts` は U5 と共有するため、delivery-planning が直列 Bolt として順序を固定する(unit-of-work.md「共有ファイルの直列化」)。

## 5. 登録・同期すべき面(同一変更で揃えるもの)

### 5.1 トランザクション台帳側(§2.1 の格納面)

| 面 | 位置 | 更新内容 |
|---|---|---|
| ランタイムイベント union | `packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts:49-87`(park 対は `:79-86`) | waiting 進入 / 再開の 2 判別子を追加。進入側が `WaitingCause` を payload に持つ |
| 形状ガード | `amadeus-intent-autonomy-replay.ts:34-46`(`transactionShape`) | 変更不要。`events.length > 0` と projection 適合のみを見るため、新判別子は追加検査なしで通る |
| 直列化 | 同 `:48-51` / `:53-62`(codec) | 変更不要。canonical JSON なので新フィールドは自動的に往復する。**R-19 の round-trip 検証対象はここ** |

codec とガードが変更不要であることは、この格納先を選ぶ根拠の一部である — 新しい保存場所は増えず、既存の完全性検査(`Transaction Digest` 一致、`:102-109`)がそのまま新 payload にも効く。

### 5.2 監査語彙側(マーカー 2 種)

`WORKFLOW_WAITING_ENTERED` / `WORKFLOW_WAITING_RESUMED` の追加は、次の面をすべて同じ変更で更新しないと既存の drift ガードが赤化する(project.md `cid:build-and-test:bt-ledger-resync` と同族)。

| 面 | 位置 | 更新内容 |
|---|---|---|
| 監査語彙 | `packages/framework/core/tools/amadeus-audit.ts:64-113` の `VALID_EVENT_TYPES`(park 対は `:82-83`) | 2 件追加 |
| 見出し表 | 同 `:236-237` 近傍の `EVENT_HEADINGS` | 2 件追加 |
| Event Registry | `packages/framework/core/otel/event-registry.ts:118-134`(park 対の定義)と同形 | `category: "workflow-lifecycle"`、`durability: "canonical"` で 2 件追加 |
| 文書 | `packages/framework/core/knowledge/amadeus-shared/audit-format.md:33`(`## Event Registry (93 events, 21 categories)`)、`:35`(`### Workflow Lifecycle (7 events)`)、park 対の行 `:40-41` | 見出しの件数を更新し、表へ 2 行追加 |
| 件数ピン | `tests/unit/t28-audit-event-sync.test.ts:83`(`const CANONICAL_COUNT = 93;` — 直前の `:61-82` が増減の履歴コメント) | 95 へ更新し、履歴コメントへ追記 |
| sensor | `packages/framework/core/sensors/amadeus-event-registry-drift.md`(matches が `event-registry` / `amadeus-audit` を捕捉) | 変更不要。四集合一致で自動的に検査される |

この台帳同期の不足は「実装は正しいのに CI が赤い」型の失敗を生むため、本 unit の落ちる実証の 1 本(FP-5)として **先に赤を観測する** 対象にする。

## 6. エラーパス(fail-closed の意味論)

| 事象 | 挙動 | 根拠 |
|---|---|---|
| 対話性判定が不能 | 非対話とみなす(waiting へ倒す) | RFC-0001 Guide-level「信号が不明・読めない場合も非対話へ fail-closed」、components.md C3 |
| `WaitingCause` のフィールド欠落・fingerprint 不正 | `enterWaiting` が `WaitingRefusal` を返し、状態を変えない | component-methods.md C4 の Result 型、construction.md の統合境界エラーハンドリング |
| レート制約の同鍵反復 | `RateRefusal` → エスカレーション。自動続行しない | ADR-4「超過はエスカレーションのみ(自動続行分岐なし)」 |
| waiting 中に `next` が来る | waiting directive を再提示して終端。ステージを進めない | 既存の Branch 2.4 / 2.5(`amadeus-orchestrate.ts:3317-3325` 以降)と同じ形 |
| REPAIR_STALLED の resume に是正証跡がない | refuse(loud、exit 非 0) | component-methods.md C4「remediationEvidence 必須、欠くと refuse」 |
| waiting の記録が壊れて種別を判定できない | resume を refuse。推測で park 扱いにしない | 3 終端分離の意味(ADR-4 Alternatives Rejected の Q14-B「欠陥終端と健全待ちの混同を型で防げない」) |
| `parkTransactionId` が指すトランザクションが台帳に無い | resume を refuse(理由付き)。envelope 側の識別子だけで再提示を組み立てない | §2.1(envelope は識別子、台帳が payload の正)。部分情報での再提示は「同内容の再提示」契約に反する |
| replay 時の `Transaction Digest` 不一致 | 既存の throw(`amadeus-intent-autonomy-replay.ts:106-109`)をそのまま伝播させる。waiting のために握り潰さない | P2(監査・attestation の非偽装)、construction.md「サイレントな失敗は許容しない」 |

環境変数による迂回路は作らない。`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` が park guard で honour されていない現行の態度(`amadeus-state.ts:1585-1588` のコメント)は、guard 廃棄後も新しい admission 経路へ引き継ぐ — レート制約に off-switch を設けない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:31:07Z
- **Iteration:** 1
- **Scope decision:** none

現行機構の引用精度は高く 3 終端分離も筋が通るが、WaitingCause の永続面がどこにも宣言されておらず、ParkEnvelope 不変・projection 無追加の宣言と両立しないため admission/再提示/レート判定が実装不能。

### Findings

- BLOCKER | WaitingCause の永続面が未宣言 | business-logic-model.md:55-68 と :106 は事由オブジェクトを「格納 → 復元 → 再提示」すると繰り返し述べ、R-19 はその往復を round-trip プロパティで検証すると定めるが、格納先がどこにも書かれていない。同時に domain-entities.md:68 は `ParkEnvelope`(amadeus-intent-autonomy.ts:156-163)を「形は不変」、:71 は「新しい状態フィールドを projection に足さない」と宣言する。実読では ParkEnvelope の 6 フィールドに任意ペイロード枠はなく、`ResumeCondition.identity` は SAFE_ID 検査(:1104)で自由文字列を許さない。domain-entities.md:77-78 が定める監査イベント属性も Stage / Occurrence Id / Basis Fingerprint / Timestamp のみで、outcome・derivationTranscript・interactivityBasis を運べない。結果として (1) ADR-4 の「admission を事由オブジェクトへ束縛」 (2) R-19 の同内容再提示 (3) R-9/R-10 のレート鍵(occurrenceId + basisFingerprint)のセッション跨ぎ照合 の 3 つが、いずれも読み書き面のないまま宣言されている。格納面(Runtime State の新フィールド / 別記録ファイル / 監査属性の拡張のいずれか)を確定し、ParkEnvelope 不変の宣言と整合させること。
- FOLLOW-UP | functional-design-questions.md Q4 | 「ADR-4 の Decision『waiting resume → `RulingPresentation` を再提示して裁定を受ける』」は誤帰属 — この逐語は component-methods.md C4 のコード注釈にあり、decisions.md の ADR-4 Decision 本文には存在しない(ADR-4 が定めるのは「resume 入口は単一で記録種別により型 dispatch、REPAIR resume は是正証跡必須」)。内容自体は承認済み成果物に裏付けがあるので出典表記の訂正で足りる。
- FOLLOW-UP | 書込面が unit の owned files を超過 | business-logic-model.md:122-134 と domain-entities.md:69 は amadeus-directive.ts(4 箇所)、amadeus-audit.ts(VALID_EVENT_TYPES / EVENT_HEADINGS)、tests/unit/t28-audit-event-sync.test.ts(CANONICAL_COUNT)の改変を要求するが、unit-of-work.md U3 行の owned files は amadeus-state.ts / amadeus-orchestrate.ts(directive)/ audit-format.md + event-registry のみ。共有ファイルの直列化制約はこの一覧を基に敷かれているため、超過分を unit-of-work.md 側へ反映して衝突判定に載せること。
- FOLLOW-UP | domain-entities.md:10-19 と business-rules.md R-7 の不整合 | `WaitingCause` は component-methods.md C4 の 4 フィールドへ `interactivityBasis` を加えた 5 フィールドを必須で持つが、R-7 の admission 必須集合は 4 フィールドのままで、欠落時の refuse 対象に interactivityBasis が入っていない。追加自体は R-20 / RFC の判定根拠要求から筋が通るので、承認済み型定義の拡張として申告したうえで必須集合を一致させること。
- NIT | business-logic-model.md:90 / business-rules.md R-5 | 削除対象コメント塊を `:1574-1595` とするが、AUTONOMY GUARD ブロックの実際の起点は amadeus-state.ts:1573(`// AUTONOMY GUARD (issue #365, salvaged from the suspend branch; reshaped by`)。指示どおり削ると先頭 1 行が孤立して残る。同一文書の :23 は同じ塊を `:1565-1595`(park 全体の説明を含む範囲)と書いており、文書内でも範囲が割れている。
- NIT | 監査文書の行ずれと上流 drift | audit-format.md の `## Event Registry (93 events, 21 categories)` は :32、`### Workflow Lifecycle (7 events)` は :34(business-logic-model.md:131 / R-21 は :33 と :35)。件数 93 と park 対の行 :40-41、t28 の `CANONICAL_COUNT`(:83)、event-registry.ts:118-134、amadeus-audit.ts:82-83/:236-237、handlePark 周辺(:1596-1626 / :1600 / :1601-1605 / :1608-1610 / :1612-1614 / :1616-1619 / :1620-1621)、amadeus-lib.ts:3923-3936、orchestrate.ts:3177-3188/:3186/:6156、directive.ts:56/:395-399/:466/:568/:668-671 は実測一致。あわせて、本 unit が実測した park guard 行 :1600 に対し components.md C4 と requirements.md FR-3 は :1599 と記しており(実測は :1600 が正)、この drift を明記しておくと実装時の取り違えを防げる。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:52:46Z
- **Iteration:** 2
- **Scope decision:** none

BLOCKER は解消 — 格納先が Intent autonomy トランザクション台帳 1 つに確定し、ParkEnvelope 不変・projection 無追加との整合が識別子/payload 分割で成立、join 鍵・codec 不変・round-trip 束縛のいずれも実読で裏付けられた。iteration-1 の FOLLOW-UP 3 件は未着手のまま残る。

### Findings

- FOLLOW-UP | functional-design-questions.md:31(iteration-1 から未修正) | 「ADR-4 の Decision『waiting resume → `RulingPresentation` を再提示して裁定を受ける』」の誤帰属が残存。この逐語は component-methods.md C4 のコード注釈(`// waiting resume → RulingPresentation を再提示して裁定を受ける`)にあり、decisions.md の ADR-4 Decision 本文には存在しない。内容の裏付けはあるので出典表記のみの訂正で足りる。
- FOLLOW-UP | 書込面が unit の owned files を超過(iteration-1 から未修正、かつ今回拡大)| 本改訂で `amadeus-intent-autonomy-runtime.ts:49-87`(イベント union へ 2 判別子)が書込面に加わり、既出の amadeus-directive.ts(4 箇所)・amadeus-audit.ts(VALID_EVENT_TYPES / EVENT_HEADINGS)・tests/unit/t28-audit-event-sync.test.ts(CANONICAL_COUNT)と合わせて、unit-of-work.md U3 行の owned files(amadeus-state.ts / amadeus-orchestrate.ts / audit-format.md + event-registry)を 4 ファイル超過する。とくに intent-autonomy 系は U1(`amadeus-intent-autonomy.ts` / `-production.ts`)・U2・U5 と近接するため、直列化制約の判定材料として unit-of-work.md 側へ反映すること。
- FOLLOW-UP | domain-entities.md:10-17 と business-rules.md R-7 の不整合(iteration-1 から未修正)| `WaitingCause` は 5 フィールド必須(`interactivityBasis` を含む)だが、R-7 の admission 必須集合と検証(「4 フィールドをそれぞれ 1 つずつ欠いた 4 入力」)は 4 件のままで、`interactivityBasis` 欠落時の refuse が規定されていない。R-20 が同フィールドの非空を要求する以上、必須集合と落ちるケース表を 5 件へ揃える必要がある。
- FOLLOW-UP | business-rules.md R-9 / R-9a | レート鍵と resume の関係が未定義 — 読み口が append-only の台帳(`readIntentAutonomyTransactionsFromAudit`)で waiting 進入イベントを occurrenceId + basisFingerprint で全走査するため、いったん resume され人間の裁定を受けた waiting の進入イベントも永続的に一致し続ける。同一裁定点へ同一根拠で再到達した場合、R-9 の述語では常に `RateRefusal` になり、正当な再待機が構造的に不能になる。ADR-4 の「根拠が実質変化した再到達は正当」だけでは resume 済みの扱いが決まらないため、waiting 再開イベント(またはその後続トランザクション)が鍵を解消するのかを明示し、R-9/R-9a の検証行列に『resume を挟んだ同鍵 2 回目』のセルを追加すること。
- NIT | 新規引用の軽微なずれ 3 件 | (a) `readIntentAutonomyTransactionsFromAudit` の実体は amadeus-intent-autonomy-replay.ts:129-136(business-logic-model.md §2.1 表は `:127-136` — 127 は直前 `replayIntentAutonomyAudit` の閉じ括弧)。(b) イベント union の park 対は amadeus-intent-autonomy-runtime.ts:80-86、`WORKFLOW_PARKED` 判別子は :80(business-logic-model.md §2.2/§5.1 と domain-entities.md は `:79-86` / `:79`)。(c) domain-entities.md の役割分担の記述は `qualityScopeId` を `:1164` とするが実体は :1163(:1164 は `};`)、また envelope 側識別子を `:1160-1163` とするが :1163 は台帳由来フィールドで envelope 側は :1160-1162。今回追加された他の引用は実測一致 — `transactionShape`(:34-46)、`encodeIntentAutonomyTransaction`(:48-51)、decode(:53-62)、`intentAutonomyAuditFields`(:64-70)、`readIntentAutonomyTransactions`(:95-121)、digest 一致検査(:102-109)、commit 時の監査放出(:138-166)、`IntentAutonomyTransaction`(:89-99)、`AutonomyRuntimeEvent`(:49-87)、`parkForHuman` の `autonomyStableId`(:496-497)、`readProductionRepairStall`(:1143-1165 / :1146-1148 / :1154-1158)、`validateResumeCondition` の SAFE_ID・SHA256 検査(:1104 / :1105)。
- NIT | business-logic-model.md §2.3 | 「他の 2 候補」として (a) record 配下の専用 runtime ファイルと (c) Runtime State の新フィールドを列挙するが (b) が本文に現れない。(b) にあたる『監査イベント属性の拡張』は §2.2 と R-7d で実質的に棄却されているので、そこへの相互参照を張るか採番を揃えると、3 候補すべてに選定理由がある事実が読み取れる。
- NIT | iteration-1 の NIT 2 件が未修正 | guard 解説コメントの削除範囲は business-logic-model.md §3.3 / R-5 とも `:1574-1595` のままだが、AUTONOMY GUARD ブロックの実起点は amadeus-state.ts:1573(指示どおり削ると先頭 1 行が孤立)。audit-format.md の件数見出しも R-21 / §5.2 が `:33` `:35` とするが実測は :32(`## Event Registry (93 events, 21 categories)`)と :34(`### Workflow Lifecycle (7 events)`)。件数 93・park 行 :40-41・t28 の :83 は一致。
- NIT | 退行なしの確認(記録のみ)| iteration-1 で実測一致を確認した引用(handlePark :1596-1626 / :1600 / :1601-1605 / :1608-1610 / :1612-1614 / :1616-1619、StopReason :15、ParkEnvelope :156-163、projection 不変条件 :209-213、`validateResumeCondition` :1097-1108、amadeus-lib.ts:3923-3936、orchestrate.ts:3177-3188 / :3186 / :6156、directive.ts:56 / :395-399 / :466 / :568 / :668-671)と R-1〜R-6・R-13〜R-18・FP-1〜FP-5 は改訂後も維持されており、今回の追記による退行は認められない。あわせて設計の中心主張 2 点を実読で裏付けた — join 鍵は `commitPark` が `commit(projection, planned.after, planned.envelope.parkTransactionId, [...])`(amadeus-intent-autonomy-runtime.ts:433-436)としてトランザクション ID に parkTransactionId を渡すため成立し、`AutonomyRuntimeEvent` を網羅的に分岐する switch は存在せず(消費側は replay.ts:71/:78、runtime.ts:735、production.ts:1156 の find/some のみ)、R-21a の「codec と形状ガードは変更不要」は構造的に正しい。
