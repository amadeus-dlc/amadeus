# Business Rules — unit semi-authority-projection(U5)

> 上流入力: `requirements.md`(FR-5 / FR-6 / FR-10 / FR-15)、`decisions.md`(ADR-1 / ADR-2 の留保「落ちる実証 2 本」/ ADR-10 の Q9=A)、`components.md` C5 / C6、`component-methods.md` C5 / C6、`unit-of-work.md` U5、`unit-of-work-story-map.md` 背骨 5、`services.md` S3。各規則は owned files 上で検査可能な述語として書く。

## 権限(FR-5)

| ID | 規則 | 出典 |
|---|---|---|
| R-1 | semi が人間へ回す interaction kind は `phase-gate` と `walking-skeleton` の 2 種のみ。他のすべての kind は semi が自動裁定する | RFC-0001 Guide-level モード定義 / ToBe 行 1〜5・16、FR-5 |
| R-2 | semi の許可集合は milestone 2 種の**補集合として導出**する。手書き列挙(`amadeus-intent-autonomy.ts:581`)を残さない。`InteractionKind` に新種が加わったとき、semi は追加作業なしで full に追随する | FR-5、component-methods.md C5、RFC-0001 動機(milestone 種が構成上不在) |
| R-3 | `SemiAuthority.allowsOccurrence`(:636-640)の第 3 項は、caller 供給の scope 内容に依らず milestone 2 種を拒む不変条件とする。`occurrence.phase` の値に基づく判定を残さない | component-methods.md C5「phase-boundary 一律拒否 → 「phase-boundary \| walking-skeleton のみ人間」へ」 |
| R-4 | semi の人間ゲートは裁定順序 1(人間専権)として表現し、`RecommendationOutcome` の contested では表現しない | ADR-1 Decision |
| R-5 | semi は grant-less のまま。issuance ceremony / TTL / revocation を semi へ持ち込まない | ADR-2(Q4=A、B 案棄却理由) |
| R-6 | semi の phase-boundary / WS 確認要求は 1 ゲートにつき 1 回。同一 occurrence への重複発火を新設しない | RFC-0001 ToBe 行 2「確認要求は 1 ゲート 1 回」 |

## 効果認可(FR-15 / ADR-2)

| ID | 規則 | 出典 |
|---|---|---|
| R-7 | `EffectClassification` へ `advisory-deferral` を新設する。`PROHIBITED_EFFECTS` の 5 種(new-permission / irreversible / scope-out / norm-waiver / quality-waiver)は不変 | ADR-2、FR-15、`-production.ts:102-108` |
| R-8 | `advisory-deferral` を割り当てる構築点は `ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS`(`amadeus-advisory-choice.ts:300-303`)の `defer-with-risk` ただ 1 つ。他の効果構築点は `workflow-reversible` のまま | ADR-2「対象は plugin.json advisories 宣言由来の defer-with-risk のみ(構築点で限定)」 |
| R-9 | semi(`SemiAuthority.authorizeEffect` :644-654)と grant(`authorizeDecisionEffect` :987-996)は `workflow-reversible` と `advisory-deferral` の 2 分類のみを許す。ノルム鮮度・scope 照合は不変 | ADR-2、FR-15 |
| R-10 | blocking sensor verdict・ノルム・カバレッジ系の延期は `advisory-deferral` を名乗れない。これは実行時検査ではなく、構築点が 1 つであることによる**構成上の不能**として担保する | ADR-2 の留保、components.md C5 |
| R-11 | advisory 延期は risk 記録つきで再提起可能であることを不変条件として保つ | ADR-2 Consequences |

## 投影の真実性(FR-6)

| ID | 規則 | 出典 |
|---|---|---|
| R-12 | 投影規則は `projectConstructionAutonomy(mode)` 1 関数のみ: `none → gated`、`semi → autonomous`、`full → autonomous`。書込(`-production.ts:713`)と読取(`amadeus-orchestrate.ts:2046`)が同じ関数を使い、規則を二重に書かない | component-methods.md C6、FR-6、FR-8(UI 真実性) |
| R-13 | 宣言と投影の乖離は **全 mode** で loud fail(exit 非 0 + 理由)。full 限定・stderr のみの現行 `announceAutonomyProjectionSkew`(:2070-2077)は撤去する | FR-6、RFC-0001 D3/D9 |
| R-14 | `Construction Autonomy Mode` フィールドの欠落・未知値も乖離として扱い、silent に「swarm 無効化」へ縮退させない。**例外は legal な第 3 値 `unset` のみ**(R-25) | FR-6、現行 :2047-2052 の縮退が患部 |
| R-15 | 投影変更(semi → autonomous)は、U3 の park guard 廃棄(`amadeus-state.ts:1600-1606`)が着地した後にのみ有効化する | requirements.md 順序制約、unit-of-work-dependency.md U5 `blockedBy` U3 |
| R-16 | 実効値関数は export された純関数として提供し、U7(`--status` / statusline)が別ソースから再計算しない | services.md S3、FR-8 |

## walking-skeleton の Stance 従属(FR-10 / ADR-10)

| ID | 規則 | 出典 |
|---|---|---|
| R-17 | occurrence kind が `walking-skeleton` になるのは、construction 最初の in-scope ステージであることに加え、解決後の Skeleton Stance が `on` のときに限る | ADR-10、FR-10 |
| R-17a | R-17 のゲートは `walkingSkeleton` フラグの**供給点**ではなく共通下流の `interactionKind()`(`-production.ts:189-192`)に置く。供給点は 2 箇所ある(`amadeus-state.ts:3711` と `amadeus-orchestrate.ts:2820-2821`)ため、片方だけを書き換える設計は R-17 の不変条件を満たさない。この 2 箇所は**変更不要**(下流で吸収) | 全数実測(business-logic-model.md「WS ゲートの配線点」)、`interactionKind` は refusal 記録側 :252 からも呼ばれる |
| R-17b | 本 unit は `amadeus-state.ts`(U3 owned)へ書き込まない。R-17 の実装は U5 owned files(`amadeus-intent-autonomy.ts` / `-production.ts` / `amadeus-orchestrate.ts` / `amadeus-advisory-choice.ts`)の内側で完結すること | `unit-of-work.md` の owned files、team.md P3(承認済み成果物からの逸脱は実装せず申告) |
| R-18 | stance の解決は `SKELETON_ON_SCOPES`(`amadeus-lib.ts:4010-4018`)を正本として再利用し、新しい scope 対応表を作らない。生値→2 値の写像は `amadeus-orchestrate.ts:2270-2279` の既存 fallback と同じ | project.md「canonical な 1 定義から導出」、construction phase ガードレール |
| R-18a | kind の全集合(`ALL_INTERACTION_KINDS`)は pure 層(`amadeus-intent-autonomy.ts`、`InteractionKind` 定義 :14 の直下)に置き、production 層の private const(`-production.ts:76-81`)はそれを import する。逆向き(pure が production を import)にすると循環になる — pure 層の import は `node:crypto`(:7)と型(:9)のみ、依存は production → pure(:21) | R-2 の導出を成立させる前提、モジュール設計原則(依存方向の制御) |
| R-19 | greenfield 系スコープ(`mvp` / `feature` / `self-feature` / `poc` / `enterprise` / `workshop` / `infra`)での WS ゲート発火は無退行 | ADR-10「greenfield 無退行」 |
| R-20 | stance が解決不能なときは `on` 側(= WS ゲートを人間に残す)へ倒す | fail-closed 保存(NFR)、安全側は人間へ回す方向 |

## 投影意味変更の消費者(FR-6 の副作用の封じ込め)

全数棚卸しは business-logic-model.md「投影意味変更の消費者棚卸し」の表(grep 述語つき)が正。規則としては次の 4 点を固定する。

| ID | 規則 | 出典 |
|---|---|---|
| R-21 | `amadeus-log.ts:278` の `QUESTION_ANSWERED` presence 迂回を semi へ広げてはならない。判定入力を `Construction Autonomy Mode` から切り離すこと。切り離しの方式(Intent mode `full` / 対話性 / `AUTO_DECIDED` 記録の実在)は複数の妥当解があるため本書では裁定せず、conductor の裁定を要する | FR-12(D7/D8 の presence 封鎖)と逆行させない、team.md P1(判断は単独で決めない) |
| R-22 | `amadeus-state.ts:4135` の gate revision 復元スキップを semi へ広げてはならない。semi は phase-gate / WS の人間ゲートと `[R]` revise ループを保持するため、復元は必要 | `amadeus-lib.ts:8932`(`autonomous` なら `not-needed`)、FR-5(semi は 2 種の人間ゲートを残す) |
| R-23 | R-21 / R-22 の対象ファイル(`amadeus-log.ts` は未割当、`amadeus-state.ts` は U3 owned)は本 unit の owned files 外である。**投影変更(R-12)の出荷は、この 2 件の是正が同一変更列に載ることを条件とする**。owned files の割当変更は conductor が行い、本 unit は単独で範囲を広げない | team.md P3、`unit-of-work.md` owned files |
| R-24 | `amadeus-utility.ts:5794-5800` の recompose guard が semi の Construction でも発火するようになる変化は**意図した追随**として受け入れる。guard の根拠は逐語「a running Construction swarm: re-shaping the plan under it would move work no human is watching」(`amadeus-lib.ts:563-571` のドキュメンテーションコメント)であり、semi の Bolt 自律化はその条件を満たす。ユーザー可視の挙動変化なので U12 の文書同期に含める | `assertRecomposeAllowed`(`amadeus-lib.ts:572-584`)、FR-14 |
| R-25 | **未投影の免除は pair で判定する** — 免除されるのは『宣言 `none`(テンプレート初期値 = 未宣言)**かつ**記録値 `unset`』の対(`amadeus-utility.ts:4979` / `:4981` の初期化対)のみ。この対では乖離判定をスキップし、消費者は不活性側(`gated` 相当)へ解決する。**`semi` / `full` × `unset`(宣言済みだが未投影)は乖離として loud fail する** — 現行ですら :2050 の `announceAutonomyProjectionSkew`(:2075 逐語 `AUTONOMY_PROJECTION_SKEW … swarm scheduling disabled`)が警告する状態であり、これを黙らせると RFC-0001 D9(#2483 の無言縮退)を再生産する。初期化時点で投影を書く代替案はテンプレート seed の全消費テスト・migration を巻き込むため採らない(最小変更) | §12a iteration-2/3 BLOCKER 是正。R-14 の『silent 縮退禁止』との整合 |

## 落ちる実証(Red で示すべきこと)

TDD 必須(`requirements.md` NFR)。実装前に赤を実測し、赤の原因を file:line で示す。

1. **R-3 の Red(第 2 ガードの fail-open)**: `allowedInteractionKinds` に `phase-gate` を含む `SemiAuthorityScope` と、`kind: "phase-gate"` かつ `phase: "construction"`(production が実際に渡す lifecycle phase)の occurrence で `SemiAuthority.allowsOccurrence` を呼ぶと、現行は **true を返す**(:637-639 の第 3 項が `occurrence.phase` を見るため発火しない)。改修後は false。
2. **R-2 は Red を作れない — 構造 pin として置く**: 現行の手書き列挙 `["stage-gate", "question"]` は、現在の `InteractionKind` 4 種の下では補集合と**値が一致する**ため、補集合性を主張するテストは改修前も緑になる。したがってこれは落ちる実証ではなく、「semi の許可集合が milestone 定義の補集合として導出されている」ことを固定する構造 pin(導出式そのものへの assert と、milestone 定義が単一箇所であることの grep 検査)として置く。この扱いを明記するのは、緑のまま通る検査を落ちる実証と偽らないため(team.md P2)。
3. **R-7 / R-9 の Red(ADR-2 留保の 1 本目)**: advisory の `defer-with-risk` を semi が自動裁定しようとすると、現行は `ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS` の `quality-waiver`(:302)により `SemiAuthority.authorizeEffect`(:649)で `semi-gate-effect-not-authorized` になる。改修後は Green(自動裁定成立)。
4. **R-10 の Red(ADR-2 留保の 2 本目 — 拒否側)**: blocking sensor verdict 由来の延期など、advisories 宣言に由来しない効果に `advisory-deferral` を与えようとした構築が拒まれること(構築点が 1 つであることの検査 = 他経路の分類が `workflow-reversible` 固定であることの pin)。この 1 本は Green 側を許さない検査であり、3 と対で置く。
5. **R-13 の Red(乖離の無検出)**: `Intent Autonomy Mode: semi` + `Construction Autonomy Mode: gated` の state で `readAutonomyMode` を呼ぶと、現行は `"gated"` を返して**何も報告しない**(:2046)。`none` + `autonomous` も同様に無検出。改修後はいずれも loud fail。
6. **R-17 の Red(WS の stance 非参照)— 2 経路とも赤にする**: degrade スコープ(`self-fix`)の最初の construction ステージで、現行はどちらの供給点からも `walkingSkeleton: true` が渡り、kind が `walking-skeleton` になって semi で `SCOPE_OUT` に至る。Red は**両経路で 1 本ずつ**取る — (a) state 経路(`amadeus-state.ts:3711` 由来のゲート承認 = `commitProductionStageGateDecision`)、(b) engine 経路(`amadeus-orchestrate.ts:2820-2821` 由来の directive 装飾 = `productionStageAutonomy`)。改修後はいずれも kind が `walking-skeleton` にならない。片方だけが緑になる実装(供給点の片側書換)はこの 2 本で機械的に検出できる。greenfield(`self-feature`)で両経路とも発火が変わらないことを対で pin(R-19)。
7. **FR-15 の無退行**: 既存の効果認可テスト群を無改変で Green に保ち、新経路から `PROHIBITED_EFFECTS` 5 種へ到達できないことを pin。
8. **R-21 の Red(presence 迂回の拡大)**: `Intent Autonomy Mode: semi` の intent で投影を `autonomous` にした state を用意し、未消費 HUMAN_TURN が無い状態で `QUESTION_ANSWERED` を記録しようとすると、R-21 の是正前は `amadeus-log.ts:278` の迂回に入って**記録が通る**。是正後は拒否されること。この Red は投影変更と同一変更列でのみ意味を持つ(R-23)。
9. **R-22 の pin(gate revision 復元)**: semi + `autonomous` 投影で `[R]` revise ループの gate revision 復元が `not-needed` へ落ちないこと。`none` / `full` の既存挙動は不変であることを対で pin。
10. **R-24 の pin(意図した変化の固定)**: semi + Construction で recompose が拒否されること(`assertRecomposeAllowed` が `denied`)。これは Red ではなく、意図した挙動変化を明示的に固定する pin。

## 検証上の注意

- mode 別マトリクス(FR-5)と WS / phase-gate の対応表は本 unit が所有する(`unit-of-work.md`「テスト ownership」)。
- 新規テストファイルを足す場合は `tests/.coverage-registry.json` の regen を同一変更に同梱する(project.md `cid:build-and-test:c1`)。
- `amadeus-orchestrate.ts` を触るため、`amadeus/spaces/default/specs/tla/model-map.json` の実装ハッシュピンと `tests/.coverage-patch-allowlist.json` の意味的セレクタの resync 要否を実装時に確認する(project.md `cid:build-and-test:bt-ledger-resync`)。
