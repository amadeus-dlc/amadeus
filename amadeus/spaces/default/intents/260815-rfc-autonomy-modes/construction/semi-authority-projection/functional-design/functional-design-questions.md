# Functional Design — Questions(unit semi-authority-projection)

> 承認: 2026-08-15T16:50:00Z — full 梯子 AUTO_DECIDED auto-decision-e12ac85dc9b1f60a37ea07aa12d2b556(全 unit の定型質問は RFC-0001 + 選挙 E-260815-RFC0001-DESIGN + ADR 留保 + Q6/Q9 人間裁定から一意導出 — 既決事項の再質問回避)。

## 上流入力

本 unit(U5 semi-authority-projection)の設計は次を上流とする。`unit-of-work.md`(U5 = C5 + C6、対応 FR-5 / FR-6 / FR-10、owned files は `amadeus-intent-autonomy.ts` / `-production.ts` / `amadeus-orchestrate.ts`(読取)/ `amadeus-advisory-choice.ts`、見積 ~280 行)、`unit-of-work-story-map.md`(背骨 5「semi が軽くなる」)、`requirements.md`(FR-5 / FR-6 / FR-10、順序制約 FR-3 → FR-5)、`components.md`(C5 mode-authority、C6 projection-truthfulness)、`component-methods.md`(C5 の 4 シグネチャ、C6 の 2 シグネチャ)、`services.md`(S3 可視化が C5/C6 の実効関数を読取専用で合成)、`decisions.md`(ADR-2 = Q4=A + 落ちる実証 2 本の留保、ADR-10 = Q9=A、ADR-1 の「semi の phase-boundary/WS は裁定順序 1 で表現」)。

## 質問

### Q1: `SEMI_ROUTINE_INTERACTIONS` は列挙の差し替えか、導出か

[Answer]: 導出にする。`component-methods.md` C5 の注記逐語「差し替え: stage-gate, question, §13, batch-boundary…(phase-gate / walking-skeleton を除く全種)」が意味するのは「semi = full − 人間ゲート 2 種」(RFC-0001 Guide-level のモード定義)であり、kind の全集合から milestone 2 種を除いた**補集合として導出**すれば、将来 `InteractionKind` が増えたときに semi が自動的に full に追随する。ただし全集合は現在 production 層の private const(`amadeus-intent-autonomy-production.ts:76-81`)にあり、`SEMI_ROUTINE_INTERACTIONS` は pure 層の export(`amadeus-intent-autonomy.ts:581`)で、依存の向きは production → pure(`-production.ts:21`)である。そのまま pure 層で補集合を書くと循環 import になるため、全集合を pure 層(`InteractionKind` 定義 :14 の直下)へ `ALL_INTERACTION_KINDS` として移し、production 側はそれを import する(両ファイルとも U5 owned)。現行の手書き列挙 `["stage-gate", "question"]`(`amadeus-intent-autonomy.ts:581`)は、新種が増えるたびに semi だけが取り残される構造(RFC-0001 動機の「milestone 種が構成上不在」と同型の欠陥)。なお `§13` と advisory は既存の `question` 種に載っており(`amadeus-advisory-choice.ts:332-338` が `kind: "question"` で occurrence を作る)、swarm の batch 境界は `InteractionKind` ではなく scheduling 投影で決まる(`amadeus-orchestrate.ts:3928-3934` の `owedBatchGate` が `AutonomyMode` のみを見る)。したがって新しい `InteractionKind` は本 unit では追加しない。

### Q2: 第 2 ガード `occurrence.phase !== "phase-boundary"`(`amadeus-intent-autonomy.ts:639`)はどう改修するか

[Answer]: **kind に基づく milestone 判定へ置き換える**。`component-methods.md` C5 の逐語「phase-boundary 一律拒否 → 「phase-boundary | walking-skeleton のみ人間」へ」に従う。現行述語は `occurrence.phase` を見るが、production 経路が渡す `phase` は lifecycle phase(`amadeus-intent-autonomy-production.ts:203-216` の `occurrence()` が `phase: input.phase` を渡し、呼び元 `amadeus-state.ts:3703-3712` は `stage.phase` を渡す)であり、`"phase-boundary"` という値は production 経路には現れない(全数検索: `grep -rn --include="*.ts" '"phase-boundary"' packages/framework/core/ tests/` の 3 hit は当該述語 1 件と unit test 2 件のみ)。よって現行の第 2 ガードは production では発火せず、caller が供給する `semiScope`(`authorizeInteraction` の第 3 引数、`amadeus-intent-autonomy.ts:728`)に milestone 種が含まれた場合の backstop として機能していない。改修後は scope の内容に依らず milestone 2 種を semi 権限から締め出す不変条件とする。

### Q3: advisory 延期の効果分類はどう扱うか

[Answer]: ADR-2(Q4=A)の逐語に従い、`EffectClassification`(`amadeus-intent-autonomy.ts:516`)へ `advisory-deferral` を新設し、`ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS`(`amadeus-advisory-choice.ts:300-303`)の `defer-with-risk` を `quality-waiver` から `advisory-deferral` へ移す。**構築点で限定**するため、`advisory-deferral` を割り当てる箇所はこの定数ただ 1 つとし、他の効果構築点(例: `amadeus-intent-autonomy-production.ts:812-820` の stage gate effect)は `workflow-reversible` のまま。`PROHIBITED_EFFECTS`(同 :102-108)の 5 種は不変(FR-15)。semi 側の認可上限 `SemiAuthority.authorizeEffect`(`amadeus-intent-autonomy.ts:644-654`)と grant 側 `authorizeDecisionEffect`(同 :987-996)が `advisory-deferral` を追加で許す。ADR-2 の留保「落ちる実証 2 本(advisory 自動裁定 Green / blocking 系拒否 Red)」は business-rules.md の落ちる実証節で固定する。

### Q4: WS ゲートの Stance 従属(Q9=A)はどの面に配線するか

[Answer]: フラグの**供給点ではなく、共通下流の種別解決点**に配線する。`walkingSkeleton` を組み立てて production へ渡す呼出は 2 箇所ある(`amadeus-state.ts:3711` と `amadeus-orchestrate.ts:2820-2821` — 全数実測は business-logic-model.md「WS ゲートの配線点」)。片方だけを書き換えると engine 経路の occurrence が degrade でも `walking-skeleton` のままになり、FR-10 が片肺になる。両者は `occurrence()`(`-production.ts:203-217`)を経て `interactionKind()`(同 :189-192)へ合流し、`interactionKind` は refusal 記録側(同 :252)からも呼ばれるため、**ここが唯一の単一決定点**である。したがってゲートは `interactionKind` の内側に置き、2 つの供給点は**変更不要**とする。この配線は `amadeus-state.ts`(U3 owned)への書込を要求せず、U5 の owned files 内で閉じる(team.md P3 の owned 範囲遵守)。`firesWalkingSkeletonGate(stance: SkeletonStance): boolean`(`component-methods.md` C5)は解決済み 2 値を受ける純関数として pure 層 `amadeus-intent-autonomy.ts` に置き、生値からの解決(I/O)は `-production.ts` 側で行う。stance の解決は既存の scope マッピング `SKELETON_ON_SCOPES`(`amadeus-lib.ts:4010-4018` — `self-fix` / `self-refactor` / `self-document` を含まない)を正本として再利用し、新しい対応表を作らない。`amadeus-orchestrate.ts:2262-2280` の `resolveSkeletonGate` は「どちらのセレモニーでも Bolt 1 にゲートは存在する」ため常に `true` を返す別問題(ゲートの**有無**)であり、本 unit が変えるのはそのゲートの**種別**(`walking-skeleton` か否か = 誰が裁定するか)である。ADR-10 の逐語「WS ゲートは Skeleton Stance に従属(degrade 不発火・greenfield 無退行)」に一致する。
