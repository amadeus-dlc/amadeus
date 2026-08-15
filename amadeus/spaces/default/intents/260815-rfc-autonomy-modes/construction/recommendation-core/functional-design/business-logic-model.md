# Business Logic Model — unit recommendation-core(U1)

> 対応設計: C1(`amadeus-recommendation.ts` 新設)+ C2(梯子・ゲートの実配線)。対応 FR: FR-1、FR-4(梯子縮退除去・AUTO_DECIDED 条件)。裁定出典: ADR-1、ADR-9、ADR-11(basisFingerprint 申し送り)。
>
> 現行コードの引用はすべて本起草時(2026-08-15、ブランチ bugfix-0815-0)の実読による。

## 1. 現行の処理構造(改修対象の実像)

### 1.1 梯子(`resolveAutoDecision`)

`packages/framework/core/tools/amadeus-intent-autonomy.ts:930-975` が梯子の本体で、段の順序は次のとおり:

| 段 | 実装位置 | 現行の戻り |
|---|---|---|
| ① confirmed-policy | `:936-937`(`resolveConfirmedPolicy`) | `AutoDecisionResolution` またはヌル通過 |
| ② norm | `:938-947`(`uniqueOption` → `:943` で conflict → park) | `decided` / `park(NORM_CONFLICT)` |
| ③ history(過去人間裁定) | `:948-955` | `decided`。**conflict は黙って次段へ落ちる**(`:952` の `history !== "conflict"`) |
| ④ solo-election | `:956-965` | `decided`(不正結果は `invalid`) |
| ⑤ agent-recommendation | `:966-974` | 常に `decided`(不正結果は `invalid`) |

戻り型は `AutoDecisionResolution = decided | park("NORM_CONFLICT") | invalid`(`:807-810`)であり、「候補が複数ある」を表現する枝が構造的に存在しない。候補供給側の `DecisionCapabilityPort`(`:801-806`)も `elect` / `recommend` がともに単一の `{ optionId, evidenceFingerprint }` を返す型で、複数候補を返す語彙を持たない。これが FR-1 の落ちる実証が指す「推奨導出が常に 1 件」の実体である。

D4(RFC-0001 付録 C)の縮退進行は、③ の `:952` と ⑤ の無条件 `decided` の 2 箇所に具体化している。とくに ③ は「過去の人間裁定が割れている」という最も裁定を要する状態を、次段のエージェント推奨へ無音で委譲している。

### 1.2 ゲート(`commitProductionStageGateDecision`)

`packages/framework/core/tools/amadeus-intent-autonomy-production.ts:794-843`。`soloElectionAvailable: false`(`:834`)、`recommend: () => ({ optionId: "approve", ... })`(`:836`)、`unavailableReason: "stage-gate-is-deterministic"`(`:837`)という定数 approve の形で、選択肢の概念そのものを持たない。重複裁定の抑止は `projection.autoDecisions.some((decision) => decision.occurrenceId === target.occurrenceId)`(`:805`)による occurrenceId 一致判定で行われている。

### 1.3 質問(`commitProductionQuestionDecision`)

同ファイル `:869-921`。`recommend` は入力 `recommendedOptionId` をそのまま返す閉包(`:906-909`)、`elect` は入力 `election` があればそれを返す(`:911-914`)。ここも 1 件固定である。

## 2. 改修後の処理フロー

### 2.1 導出フロー(入力 → 決定 → 出力)

```
入力: DecisionAuthority + InteractionOccurrence + applicableNormFacts + pastHumanRulings + DecisionCapabilityPort
  │
  ├─ ① confirmed-policy 一致        → RecommendationOutcome.unique(optionId, basis{source:"prior-ruling"})
  ├─ ② norm 段
  │     ├─ 一意                     → unique(optionId, basis{source:"norm"})
  │     └─ conflict                 → (裁定順序 4)既存 park("NORM_CONFLICT") ※型を通さず現行維持
  ├─ ③ history 段
  │     ├─ 一意                     → unique(optionId, basis{source:"prior-ruling"})
  │     └─ conflict                 → contested(候補 = 競合した各 optionId, reason:"past-rulings-conflict")
  ├─ ④ solo-election
  │     ├─ 単一 optionId            → unique(optionId, basis{source:"election"})
  │     └─ hold(5 事由)            → contested または none(RFC-0001 Q1=A の写像)
  └─ ⑤ agent-recommendation
        ├─ 推奨が一意               → unique(optionId, basis{source:"agent"})
        ├─ 推奨が割れる             → contested(候補列挙, 事由)
        └─ 導出不能                 → none(事由)
  │
  ▼
終端判定(resolveAutoDecision)
  ├─ unique       → AUTO_DECIDED を放出(既存 decisionRecord 経路。`:818-849`)
  └─ contested / none → escalate 枝(outcome 同梱)。AUTO_DECIDED は放出しない
```

**AUTO_DECIDED 放出条件の一本化**が本 unit の中心的な出力契約である。現行は ③〜⑤ のどこで終わっても `decisionRecord` が呼ばれ AUTO_DECIDED 相当のレコードが生まれるが、改修後は unique 終端のみが `decisionRecord`(`:818-849`)へ到達する。これが FR-4「梯子⑤の『決められなくても進む』縮退を除去」を型で保証する経路である。

`decisionRecord` の `reviewState` 決定(`:836-838` — solo-election / agent-recommendation は `"unreviewed"`)は無改変で保持する。unique 終端の basis.source がこの分岐の入力に一致するため、U8(completion-report)の集計母集団は変わらない。

### 2.2 ゲート導出フロー

```
gateContext → deriveGateRecommendation → 常に unique("approve", basis{source:"norm", fingerprint})
```

ADR-1(Q2=B)により、ゲート導出器は型を実配線で返しつつ常に unique を返す。`commitProductionStageGateDecision` の定数 approve(`production.ts:836`)は削除ではなく **型の背後へ移す** 改修であり、外から見た挙動は不変である(無退行テストの対象)。blocking sensor 未解決・NORM_CONFLICT は導出器に到達する前に既存 fail-closed 経路で止まるため、導出器の戻り値では表現しない。

occurrenceId 重複判定(`production.ts:805`)は無改変。U3 のレート制約はこの判定を鍵の一部として再利用するが(C4)、判定そのものの意味論は変えない。

### 2.3 提示ペイロードの生成と往復

```
contested/none の outcome
  ├─ presentationOf(outcome) → RulingPresentation(候補 + 各候補の根拠 + 非一意事由 + 推奨順)
  │     ├─ 対話 arm(U4)  → 人間へ提示
  │     └─ 非対話 arm(U3) → WaitingCause.outcome として直列化・格納
  └─ parse(json) ← 復元(U3 の resume 時、同内容で再提示)
```

RFC-0001 Reference-level の UX 契約(「contested の提示は候補+各候補の根拠+一意に決まらなかった理由+推奨順で行い、非対話中断時も同内容を park 理由へ記録して復帰時にその場で裁定できる形で再提示する」)は、**直列化 → 格納 → 復元 → 再提示の往復が内容を保つこと**として本 unit が担保する。往復の保証は round-trip プロパティで検証する(project.md「新設・変更する永続化境界(write⇔read、発行⇔消費)には round-trip プロパティを標準観点として付ける」)。

## 3. 状態遷移

本 unit 自体は永続状態を持たない。`RecommendationOutcome` は値であり、遷移は各裁定点の 1 回の導出内で完結する。永続化されるのは (a) unique 終端が生む `AutoDecisionRecord`(既存)と (b) contested/none 終端を U3 が `WaitingCause` として格納したもの(U3 所有)の 2 つで、どちらも本 unit の外にある。

## 4. 他 unit との統合シーム

unit-of-work-dependency.md「統合ポイント」に従う。

| 相手 | シームの実体 | 方向 |
|---|---|---|
| U3 waiting-interruption | `WaitingCause.outcome`(contested / none のみ)+ `parse` による復元 | U1 → U3(U3 が blockedBy U1) |
| U4 interactive-carveout | `RulingPresentation` と終端種別。ADR-5「carveout 判定は RecommendationOutcome の終端種別に束縛」 | U1 → U4 |
| U5 semi-authority-projection | 裁定順序 1(人間専権)の表現。U5 は unique/contested の判定 **前** に人間専権を判定する | U1 → U5 |
| U8 completion-report | AUTO_DECIDED 監査レコードの集計。unique 終端のみが集計母集団に入る | U1 → U8 |
| U2 presence-detection | 対話/非対話の分岐先。**本 unit は seam(注入)として扱い、実行時依存を持たない** | 非 blocking(dependency 文書の disposition (2)) |

U2 との関係は unit-of-work-dependency.md の disposition (2) が「U1 の実装・テストは分岐先を seam(注入)で扱えるため build-blocking ではない」と明示しているため、本 unit は分岐先を関数注入で受ける形にし、`isInteractiveSession` 相当を直接 import しない。

## 5. エラーパス(fail-closed の意味論)

| 事象 | 挙動 | 根拠 |
|---|---|---|
| `parse` が未知形状・欠落フィールドを受ける | `Result` の error 枝で `DecodeError` を返す。例外送出も暗黙の既定値補完もしない | component-methods.md C1「parse は DecodeError(fail-closed)」、construction.md「Parse, Don't Validate」 |
| `contested` を候補 1 件以下で構築 | 構築時に例外(表現不能化) | component-methods.md C1「candidates < 2 は構築時例外」 |
| 導出結果の optionId が `occurrence.optionIds` に無い | 既存 `invalid`(`:958-960` / `:967-968`)を保持 | FR-15 効果天井の無退行 |
| norm 段の conflict | 既存 `park("NORM_CONFLICT")`(`:943`)を保持 | FR-15、ADR-1「red は既存 fail-closed のまま」 |
| unique 以外の終端で AUTO_DECIDED を放出しようとする | 型で到達不能。`decisionRecord` の呼び出しが unique 枝からしか届かない | FR-4、ADR-1 |

いずれも無音バイパスを作らない(requirements.md NFR「新分岐は無音バイパス・環境変数逃げ道を作らない」)。

## 6. ADR-9 の contested-0 fixture 基盤

unit-of-work.md「ADR-9 の contested-0 件 fixture 群は U1 が基盤・U3/U4 が経路側を追加」に従い、本 unit は fixture の **共通土台**(裁定点クラス別の occurrence 生成と、そこへ流す norm / history / election / 推奨の入力集合)を提供する。ADR-9 の受け入れ形は「機構起因クラス(phase-gate / WS の 172 件クラス、§13 0 件確認の 79 件クラス)および通常進行 fixture で contested 発火 0 件」であり、割合閾値は導入しない。fixture が返す実測件数は集計コマンド出力からの転記のみとする(team.md 検証・実測規律)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:31:07Z
- **Iteration:** 1
- **Scope decision:** none

ADR-1/9/11 の裁定と留保を忠実に運び梯子の引用も実測一致だが、直列化の書き手が公開面から欠落し、presentationOf の入力狭化が未申告の契約変更として残る。

### Findings

- FOLLOW-UP | domain-entities.md:69-77 コンパニオン | 永続化境界の write 側が不在 — R-5 の検証は `parse(serialize(o))` を要求し、business-logic-model.md:78-85 は U3 への「直列化・格納」を hand-off として宣言し、components.md C1 の責務も「提示ペイロード…の直列化/復元」を C1 に置くが、宣言されたコンパニオンは unique/contested/none/parse/presentationOf の 5 つのみで直列化関数を持たない。書き手の所有者(C1 の公開面か、U3 側か)を明示しないと round-trip 契約(R-5 / U3 R-19)が呼び先不定のまま実装へ渡る。
- FOLLOW-UP | domain-entities.md:81 | `presentationOf` の入力を `contested | none` に絞る判断は、component-methods.md C1 の承認済みシグネチャ `presentationOf(o: RecommendationOutcome): RulingPresentation` の変更にあたる。構成的安全性の観点では妥当だが、本文では「精緻化」として提示されるのみで逸脱としての申告・裁定・正本同期がない(cid:requirements-analysis:implementation-deviation-election)。
- FOLLOW-UP | 引用行の実測不一致 3 件(base: 本ブランチ bugfix-0815-0 の作業ツリー) | (a) `decisionRecord` の実体は amadeus-intent-autonomy.ts:830-859 だが business-logic-model.md:61-63 と business-rules.md R-7 は `:818-849`(818-829 は空行 + `DecisionRecordInput` interface)。(b) `AutoDecisionResolution` は :808-811 だが FDQ Q1 / business-logic-model.md:21 / domain-entities.md:87 は `:807-810` で `invalid` 枝(:811)を範囲外にしている。(c) production の `recommend` 閉包は amadeus-intent-autonomy-production.ts:915-918 だが FDQ Q3 / business-logic-model.md:31 は `:906-909`(実際は scopeLineageFingerprint〜`capability: {` 行)。なお梯子側(:936-937/:943/:952/:956-965/:958-960/:966-974)、`DecisionCapabilityPort`(:801-806)、`DecisionBasisKind`(:766-773)、production の :805/:834/:836/:837、`elect` 閉包(:911-914)、amadeus-bolt.ts:1334-1336、Result 3 箇所(election-model.ts:10 / plugin-compose.ts:640 / stage-stats.ts:1114)は実測一致。
- FOLLOW-UP | business-rules.md R-12 | 人間専権判定の所有は U5 で、unit-of-work-dependency.md では U5 が U1 を blockedBy(= U1 が先)。U1 実装時点で専権判定は存在しないため、R-12 の検証をどの seam で成立させるか(U2 に対して採った関数注入と同形か)を明示しないと、実装できない受け入れ条件として残る。
- NIT | 上流参照 | 4 成果物のいずれも services.md に言及しない(本 stage の consumes は services を required 宣言。upstream-coverage sensor の対象)。
- NIT | 命名の上流不一致 | components.md C1 の公開面は `parseOutcome(json)`、component-methods.md C1 は `parse(value: unknown)`。U1 は後者を採用しているが、上流 2 文書の不一致自体に触れていないため code-generation で名前が割れうる。
