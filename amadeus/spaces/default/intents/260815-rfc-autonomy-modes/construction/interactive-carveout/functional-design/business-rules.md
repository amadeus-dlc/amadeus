# Business Rules — unit interactive-carveout(U4)

> 上流入力: `requirements.md` FR-4(対話 arm、Q11)、`decisions.md` ADR-5(Q11=A、両票留保)・ADR-4、`components.md` C3、`component-methods.md` C1 / C3 / C4、`unit-of-work.md` U4、`unit-of-work-story-map.md` 背骨 4、`services.md` S1。各規則は `packages/framework/core/hooks/amadeus-stop.ts` 上で検査可能な述語として書く。

## 適用範囲(4 carveout × 2 軸)

以下の R-4〜R-8 は **carveout 2(pending-question)と 3(pending-compose)にのみ**掛かる。ADR-5 の認可範囲が逐語「質問提示・compose 保留」であること、および 1 / 4 へ新束縛を課すと既存 allow が block へ退行して R-10 と矛盾することが理由(business-logic-model.md「改修範囲の確定」の表が正)。

| # | carveout | 対話性 | 終端束縛 | 適用される規則 |
|---|---|---|---|---|
| 1 | human-wait(`isHumanWaitStop` :381-391 / :966) | 課さない | 課さない | R-11 のみ(保存) |
| 2 | pending-question(:448-463) | 課す | 課す(none を除く) | R-1〜R-10 |
| 3 | pending-compose(:481-514) | 課す | 人間専権として自動成立 | R-1〜R-6、R-8〜R-10 |
| 4 | conversational(:737-753) | 課さない | 課さない | R-12 のみ(保存) |

## 規則

| ID | 規則 | 出典 |
|---|---|---|
| R-1 | Stop hook の対話/非対話判定は C3 の実効判定関数(`resolveSessionInteractivity`)のみを読み、hook 内に第 2 の判定を実装しない | ADR-5 Decision、components.md C3「全消費者が同一ソース」、FR-8(UI 真実性) |
| R-2 | 対話性判定が例外・読取不能・信号不明のときは非対話として扱う | ADR-5「判定不能は非対話へ fail-closed」、RFC-0001 Guide-level |
| R-3 | `transcriptIsConversational`(`amadeus-stop.ts:569`)は tier-3 の chat 判定の補助信号として現位置に残し、セッション対話性判定を上書き・代替しない | ADR-5 Decision 本文の逐語「transcriptIsConversational(amadeus-stop.ts:569)は補助信号のまま、セッション判定を上書きしない」、RFC-0001 Reference-level「Q3=A′ の実装シーム」、FR-2 |
| R-4 | carveout 2 / 3 の mode / grant 根拠の拒否(`isQuestionCarveoutIntent` :450、`isFullyAutonomousIntent` :485)を撤去する。撤去後、mode はこの 2 つの carveout の可否を単独で決めない。**carveout 4 の :744 は撤去対象に含めない**(R-12) | FR-4(D10 是正)、ADR-5、RFC-0001 付録 C D10(根拠列は :449-452 と `isPendingComposeStop` の 2 面) |
| R-5 | 対話セッションでは、裁定順序 3 到達(`RecommendationOutcome` 終端が contested / none)または裁定順序 1(人間専権)である裁定点についてのみ、carveout 2 / 3 が発火してターンを返す | ADR-5「carveout 判定は RecommendationOutcome の終端種別に束縛」、FR-4 |
| R-6 | 終端が unique(自動裁定可)の裁定点では carveout 2 / 3 を発火させない。梯子が AUTO_DECIDED で進む | ADR-9(通常進行 fixture で contested 発火 0 件)、RFC-0001 Q1 の頻度予算、#2974 |
| R-7 | mode `none` は梯子を通らないため、carveout 2 は既存の positive signal(未回答 `[Answer]:` タグ)のみで成立する。R-5 の終端束縛は要求しない | RFC-0001 ToBe 行 5(none は人間が回答)、現行 `hasPendingQuestion` :422-443 |
| R-8 | 非対話セッションでは carveout 2 / 3 を発火させず、既存の予算内 block(継続強制)を維持する。この 2 つが非対話で現行より狭くなることは ADR-5 が認可した唯一の narrowing であり、補償経路(engine の waiting → `parked` の terminal allow :947-949)を伴う | ADR-5「非対話は継続強制を維持し waiting へ」 |
| R-9 | hook は waiting を発行しない。非対話の停止は engine が発行し、hook は既存の `parked` 系 terminal allow(:947-949)で受ける | ADR-4(engine 発行専用・CLI verb なし)、project.md engine mutation 禁止 |
| R-10 | 1 回の hook 実行の内部では、carveout は allow を増やす方向にのみ作用する。判定内の例外は `false`(carveout 不発火)へ倒し、block を増やさない。版をまたぐ allow の縮小は R-8 が認可する 2 / 3 の非対話 arm に限り、それ以外の縮小は本 unit では行わない | 現行契約(:404-414、:533-541)の保存、NFR「fail-closed 保存」 |
| R-11 | carveout 1(human-wait)は**一切変更しない**。対話性・終端束縛・autonomy guard のいずれも新設せず、`isHumanWaitStop` は checkbox `[?]` / `[R]` のみで判定し続ける | ADR-5 の認可範囲外、R-10、RFC-0001 D5 / #1241(外部人間ゲート待ちを hook が塞がない) |
| R-12 | carveout 4(conversational)は**現行意味論を保存**する。`isFullyAutonomousIntent`(:744)の full guard をそのまま残し、semi / none で発火・full で不発火という現行の振る舞いを変えない。対話性判定も終端束縛も課さない | ADR-5 の認可範囲は逐語「質問提示・compose 保留」、R-10 |
| R-14 | 継続上限(`stopContinuationBlockCap` :141-147、`stopBudgetMode` :160-163)と hard cap 10(:158)は本 unit で変更しない。判定入力は `Intent Autonomy Mode` のままとし、U5 の `Construction Autonomy Mode` 投影変更に追随させない | unit-of-work.md U4 の owned 範囲、FR-5 との非干渉 |
| R-15 | carveout で allow したときは、対話性判定の根拠(`source`)と発火した carveout 種別を `recordHookDrop` に残す | RFC-0001 Guide-level「判定結果と根拠は使用のたび監査へ記録」、FR-8 |
| R-13 | engine 相談不能時の fail-open allow(:925-929)は不変。carveout 判定はその後段に置く | 現行契約の保存(hook がターンを罠にしない) |

> 付番注記(§12a iteration-2 是正): 旧・重複 R-11(継続上限)/ R-12(recordHookDrop)は R-14 / R-15 へ再付番。R-11 / R-12 は human-wait / conversational の保存規則のみを指す。

## 落ちる実証(Red で示すべきこと)

TDD 必須(`requirements.md` NFR)。実装前に次を赤で実測し、赤の原因が本 unit の患部であることを file:line で示す。

1. **R-4 / R-5 の Red(質問 carveout)**: `Intent Autonomy Mode: full` + active grant の projection、現在ステージ `[-]`、`<slug>-questions.md` に未回答 `[Answer]:` タグあり、**対話セッション**(実 HUMAN_TURN あり)の fixture で `isPendingQuestionStop` が `false` を返す。原因は :450-452 の autonomy guard。改修後は `true`(ターンを返す)。
2. **R-4 の Red(compose carveout)**: 同じ full + active grant で compose marker が fresh、対話セッションの fixture で `isPendingComposeStop` が `false`(:485)。改修後は `true`。
3. **R-8 の pin(非対話 arm)**: 実 HUMAN_TURN のない非対話 fixture で、未回答タグがあっても carveout 2 が発火せず block へ落ちること。改修が非対話を緩めていない証明。
4. **R-6 の Red(過剰発火の防止)**: 終端が unique の裁定点(通常進行 fixture)で carveout 2 が発火しないこと。R-4 の撤去だけを行い R-5 の束縛を入れない実装では、この検査が赤になる(full が未回答タグだけでターンを返す)。
5. **R-2 の fail-closed**: 対話性判定が例外を投げる fixture で、carveout 2 / 3 が発火しない(= 非対話扱い)こと。

### 保存する 2 carveout の無退行 pin(狭める変更を課さないことの対の証明)

R-11 / R-12 は「変えない」規則なので Red は存在しない。代わりに、改修が誤ってこの 2 面を狭めていないことを**改修前後で同一結果**として固定する pin を対で置く(狭める側の変更には無退行 pin を対で置く、という §12a iteration-1 の要求への応答)。

6. **R-11 の無退行 pin(human-wait)**: 次の 4 組み合わせで `isHumanWaitStop` が現行と同一の真偽を返すこと — {mode: full + active grant, semi, none} × {対話セッション, 非対話セッション}、現在ステージ `[?]` と `[R]`。とくに **非対話 full × `[?]` が allow であり続ける**ことを名指しで pin する(ここが退行すると RFC-0001 D5 / #1241 の膠着を hook 側で再生産する)。あわせて `isHumanWaitStop` のシグネチャに `projectDir` 相当の引数が増えていないこと(= 対話性・投影を読んでいないこと)を型・引数で固定する。
7. **R-12 の無退行 pin(conversational)**: 会話ターン(直近の実 HUMAN_TURN 以後に engine 呼出ゼロ)の transcript fixture に対し、`isConversationalStop` が **semi と none で true、full + active grant で false** を返すこと。対話 / 非対話の両セッションで同じ結果になること(= セッション対話性判定を読んでいないこと)も同じ pin で固定する。

7 の「semi で true」は現行実測の保存である(`:744` の guard は `isFullyAutonomousIntent` — full のみを殺す)。6 / 7 が緑のまま 1 / 2 が赤→緑へ動くことが、本 unit の変更が認可範囲に収まっている機械的な証拠になる。

## 検証上の注意

- テストは in-process で `isPendingQuestionStop` / `isPendingComposeStop` / `isConversationalStop` を直接呼ぶ(hook 本体は spawn 実行で bun --coverage が観測できないため、既存の t209 / #758 と同じ「判定関数は export して in-process で検査する」方式に従う。`amadeus-stop.ts:543-546` のコメントがその先例)。
- fixture の projection は `readProductionAutonomyProjection` が読む面へ実書込みする(project.md Learnings の `applyProductionAutonomyMode` 注意 — `Construction Autonomy Mode` フィールドを持つ seed を使う)。
- 新規テストファイルを足すため `tests/.coverage-registry.json` の regen を同一変更に同梱する(project.md `cid:build-and-test:c1`)。
