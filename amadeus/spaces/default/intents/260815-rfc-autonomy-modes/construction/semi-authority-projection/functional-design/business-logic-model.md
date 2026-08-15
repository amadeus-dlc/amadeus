# Business Logic Model — unit semi-authority-projection(U5)

> 上流入力: `unit-of-work.md`(U5 = C5 + C6 / FR-5・FR-6・FR-10)、`unit-of-work-story-map.md`(背骨 5「semi が軽くなる」)、`requirements.md`(FR-5 / FR-6 / FR-10、順序制約「FR-3 の park guard 廃棄が先行依存」)、`components.md`(C5 / C6)、`component-methods.md`(C5 / C6 のシグネチャ)、`services.md`(S3 可視化)、`decisions.md`(ADR-1 / ADR-2 / ADR-10)。

## 1. semi の権限判定フロー

### 現行(改修前の実測)

裁定点は `authorizeInteraction`(`amadeus-intent-autonomy.ts:725-764`)を通る。semi arm は :735-749 で、(a) caller が `semiScope` を渡していること、(b) `SemiAuthority.of` が非 null(mode が semi かつ `modeProvenance.kind === "human-command"` — :620-635)、(c) `SemiAuthority.allowsOccurrence`(:636-640)が真、の 3 条件を要求する。(c) の述語は 3 項:

```ts
authority.scope.intentUuid === occurrence.intentUuid &&
  authority.scope.allowedInteractionKinds.includes(occurrence.kind) &&
  occurrence.phase !== "phase-boundary";
```

production 経路の `semiScope` は `semiAuthorityScope`(`amadeus-intent-autonomy-production.ts:532-539`)が作り、`allowedInteractionKinds` に `SEMI_ROUTINE_INTERACTIONS = ["stage-gate", "question"]`(`amadeus-intent-autonomy.ts:581`)を入れる。したがって実際に milestone を人間へ回しているのは第 2 項(kind 列挙)だけで、第 3 項は production 経路では発火しない(`occurrence()` が渡す `phase` は lifecycle phase — `-production.ts:203-216`、呼び元 `amadeus-state.ts:3703-3712` が `stage.phase`)。拒否は `{ kind: "human-required", reason: "SCOPE_OUT" }`(:740-742)となり、`emitAuthorizationRefusal`(`-production.ts:291-304`)が `INTENT_AUTONOMY_HUMAN_REQUIRED` を書く。RFC-0001 付録 B の実測 172 件(phase-gate 106 / walking-skeleton 66)はこの経路の出力である。

### 改修後

1. **milestone 集合の一元化(層の向きに注意)**: `SEMI_HUMAN_MILESTONES = ["phase-gate", "walking-skeleton"]` を唯一の定義とし、`SEMI_ROUTINE_INTERACTIONS` はその補集合として導出する。ただし現在 kind の全集合 `ALL_INTERACTIONS` は production 層の module-private const(`-production.ts:76-81`)で、`SEMI_ROUTINE_INTERACTIONS` は pure 層の export(`amadeus-intent-autonomy.ts:581`)である。pure 層の import は `node:crypto`(:7)と型(:9)だけで、依存の向きは production → pure(`-production.ts:21` が `SEMI_ROUTINE_INTERACTIONS` を import)。したがって**そのまま補集合を pure 層で書くと循環 import になる**。是正: kind の全集合を型定義と同じ pure 層(`amadeus-intent-autonomy.ts:14` の `InteractionKind` の直下)へ `ALL_INTERACTION_KINDS` として置き、`-production.ts:76-81` の private const はそれを import して置き換える(両ファイルとも U5 owned)。`autoDecidedKinds`(同 :86-90)/ `nonAutoDecidedKinds`(同 :94-97)は既に `SEMI_ROUTINE_INTERACTIONS` から導出しているため、grant preview の表示(`nonAutoDecidedKinds` の消費側)も自動で追随する。
2. **第 2 ガードの意味の是正**: `allowsOccurrence` の第 3 項を `!SEMI_HUMAN_MILESTONES.includes(occurrence.kind)` に置き換える。これにより、caller が milestone を含む `semiScope` を供給しても semi は milestone を自動裁定しない(scope 内容に依らない不変条件)。
3. **WS 種別の Stance 従属(ゲートは共通下流に置く)**: 下の「WS ゲートの配線点」節のとおり、`walkingSkeleton` フラグを組み立てる呼出は 2 箇所あるため、上流のどちらかを書き換える設計は片肺になる。ゲートは両者の共通下流である `interactionKind()`(`-production.ts:189-192`)に置く。degrade スコープ(`self-fix` 等 — `SKELETON_ON_SCOPES` 非収載)では kind が `walking-skeleton` にならず、`stage-gate` または `phase-gate` として扱われる。
4. **advisory 延期の効果分類**: `defer-with-risk` の分類を `advisory-deferral` へ移し、semi / grant の効果認可がこれを追加で許す(下の 3 節)。

裁定順序(RFC-0001 Guide-level)における位置づけは ADR-1 のとおり — semi の phase-boundary / WS は**裁定順序 1(人間専権)**として表現され、`RecommendationOutcome` の contested では表現しない。

### WS ゲートの配線点(全数)

`walkingSkeleton` フラグを組み立てて production へ渡す呼出は 2 箇所ある(全数実測: `grep -rn --include="*.ts" "walkingSkeleton" packages/framework/core/tools/` → 定義・型を除く供給点は次の 2 件のみ)。

| # | 供給点 | 逐語 | 所有 unit | 本 unit での扱い |
|---|---|---|---|---|
| 1 | `amadeus-state.ts:3711` | `walkingSkeleton: stage.phase === "construction" && firstConstruction?.slug === slug,` | **U3**(`amadeus-state.ts`) | **変更不要**(下流で吸収) |
| 2 | `amadeus-orchestrate.ts:2820-2821` | `walkingSkeleton:\n  directive.phase === "construction" && firstConstruction?.slug === directive.stage,` | U5(読取面) | **変更不要**(下流で吸収) |

両者は `productionStageAutonomy`(`-production.ts:237-265`)または `commitProductionStageGateDecision`(同 :794-844)へ入り、いずれも `occurrence()`(同 :203-217)を経て `interactionKind()`(同 :189-192)で kind に変換される。`interactionKind` は refusal 記録側(同 :252)からも呼ばれるため、**ゲートを `interactionKind` の内側に置くことが唯一の単一決定点**になる。

- `interactionKind` の入力へ解決済みの `skeletonGateFires: boolean` を加え、`walkingSkeleton && skeletonGateFires` のときだけ `"walking-skeleton"` を返す。
- `skeletonGateFires` の供給は -production.ts の 2 つの入口が行う。`commitProductionStageGateDecision` は既に持つ `input.stateContent` から、`productionStageAutonomy` は `input.projectDir` から state を読んで、`Skeleton Stance` と `Scope` を解決する。どちらも U5 owned files の内側で完結する。
- stance の生値(`on` / `off` / `scope-dependent` / 未記入)から 2 値への解決は、`SKELETON_ON_SCOPES`(`amadeus-lib.ts:4010-4018`)を正本として再利用する(`amadeus-orchestrate.ts:2270-2279` の既存 fallback と同じ写像。新しい対応表を作らない)。読取不能・未知値は `on` 側へ倒す(R-20)。
- 純関数 `firesWalkingSkeletonGate(stance)`(`component-methods.md` C5)は pure 層 `amadeus-intent-autonomy.ts` に置き、解決済みの 2 値のみを受ける。pure 層は `node:crypto` と型しか import していない(`amadeus-intent-autonomy.ts:7` / `:9`)ため、ファイル I/O を要する stance 読取を pure 層へ持ち込まない。
- **owned files 制約の遵守**: この配線は `amadeus-state.ts`(U3 所有)への書込を要求しない。`unit-of-work.md` の U5 owned files(`amadeus-intent-autonomy.ts` / `-production.ts` / `amadeus-orchestrate.ts`(読取)/ `amadeus-advisory-choice.ts`)の内側で閉じる。
- 副次的影響: kind が降格すると `occurrence()` が組む `interactionId` / `selector`(`${kind}-${stage}`、同 :211-212)と occurrenceId が変わる。既存 `autoDecisions` の重複判定鍵(同 :805)と一致しなくなるが、これは「別の裁定点になった」という正しい帰結であり、移行処理は要らない(degrade スコープで WS 裁定が記録済みの intent は、以後 stage-gate として新規に裁定される)。

## 2. 投影(Construction Autonomy Mode)のフロー

### 現行

- **書込**: `writeAutonomyStateProjection`(`-production.ts:704-723`)が :713 で `mode === "full" ? "autonomous" : "gated"` を書く。semi は `gated`。
- **読取**: `readAutonomyMode`(`amadeus-orchestrate.ts:2042-2054`)が :2046 で `none` / `semi` を無条件に `"gated"` へ落とす(state の記録値を読まない)。full のときだけ記録値を照合し、不一致なら `announceAutonomyProjectionSkew`(:2070-2077)で **stderr へ 1 回だけ**出して `null` を返す(swarm 無効化 = silent degrade)。
- 帰結: 宣言 semi / full 以外の乖離は検出ゼロ、full の乖離も exit code に出ない(RFC-0001 付録 C の D3 / D9)。

### 改修後

- `projectConstructionAutonomy(mode)`(`component-methods.md` C6)を単一の投影規則とする: `none → "gated"`、`semi → "autonomous"`、`full → "autonomous"`。書込(:713)と読取(:2046)の両方がこの 1 関数を使い、規則を二重に書かない。
- `detectProjectionDivergence(state)` が全 mode で `Intent Autonomy Mode` と `Construction Autonomy Mode` を突き合わせ、`DivergenceReport | null` を返す。非 null は **loud fail**(exit 非 0 + 理由)。`announceAutonomyProjectionSkew` の stderr 一回きり・full 限定の縮退は撤去する。
- semi の投影が `autonomous` になることで `owedBatchGate`(`amadeus-orchestrate.ts:3928-3934`、`autonomy !== "gated"` なら null)が batch 境界ゲートを要求しなくなる — RFC-0001 ToBe 行 16「semi = 自動(Bolt 自律維持)」の実体。

### 投影意味変更(semi: gated → autonomous)の消費者棚卸し(全数)

`cid:application-design:dual-key-consumer-inventory` に従い、既存表からの複製ではなく grep 出力から作り直す。検索述語(いずれも 2026-08-16 に本 worktree の作業ツリーで実行。対象集合 = `packages/framework/core/`、`--include="*.ts"`):

- P1: `grep -rn --include="*.ts" "isAutonomousMode" packages/framework/core` → 6 hit
- P2: `grep -rn --include="*.ts" '"Construction Autonomy Mode"' packages/framework/core` → 4 hit
- P3: `grep -rn --include="*.ts" "AUTONOMY_MODE_FIELD" packages/framework/core` → 8 hit(うち 1 件は別定数 `INTENT_AUTONOMY_MODE_FIELD` :2031)
- P4: `grep -rn --include="*.ts" "readAutonomyMode" packages/framework/core` → 4 hit
- P5(テスト面): `grep -rln --include="*.ts" 'Construction Autonomy Mode\|isAutonomousMode' tests/` → 37 ファイル
- P6(テンプレート/markdown リテラル軸 — §12a iteration-2 で追加。TS 文字列リテラル述語はテンプレート内 `**Construction Autonomy Mode**` に一致しない盲点への対処): `grep -rn --include="*.ts" '\*\*Construction Autonomy Mode\*\*' packages/framework/core` → state テンプレート seed(`amadeus-utility.ts:4981` — 初期値 `unset`)

| # | 消費者(file:line) | 何をしているか | semi での変化 | 判定と根拠 | 所有 |
|---|---|---|---|---|---|
| 1 | `amadeus-lib.ts:5184` / `:5186-5187` | `AUTONOMY_MODE_FIELD` 定数と `isAutonomousMode` 述語の定義 | 述語自体は不変(入力値が変わる) | **変化しない** — 定義に手を入れない | U6(lib.ts) |
| 2 | `amadeus-log.ts:21` / `:278` | `QUESTION_ANSWERED` 記録時に `if (isAutonomousMode(content))` で人間 presence 検査(`humanActedSinceLastAnswer`)を**丸ごと迂回** | 迂回が semi の全回答記録へ拡大 | **変化させない(必須)** — 同 intent が FR-12 / C13 で閉じようとしている presence fail-open を逆向きに広げるため。判定入力を `Construction Autonomy Mode` から切り離す(下の「申し送り A」) | どの unit にも未割当 |
| 3 | `amadeus-state.ts:42` / `:1600` | park guard(`isAutonomousMode(content) && outstandingHumanTurns(pd).length === 0` で park 拒否) | — | **U3 が廃棄**(FR-3)。本 unit の先行依存(R-15) | U3 |
| 4 | `amadeus-state.ts:4135` | `recoverGateRevision({ autonomous: isAutonomousMode(content) })` → `amadeus-lib.ts:8932` が `autonomous` なら復元を `not-needed` でスキップ | semi で gate revision 復元がスキップされる | **変化させない** — semi は phase-gate / WS の人間ゲートを残すため、その revise ループ(`[R]`)で revision 復元が必要。判定入力を切り離す(下の「申し送り A」) | U3 |
| 5 | `amadeus-state.ts:995` | `PROJECTION_OWNED_FIELDS` に `Construction Autonomy Mode` を列挙(手書き set を拒否) | 値のみ変化、列挙は不変 | **変化しない** | U3 |
| 6 | `amadeus-utility.ts:60` / `:5794-5800` | recompose guard。値を検証し `assertRecomposeAllowed`(`amadeus-lib.ts:572-584`)で `autonomous` ∧ Construction なら recompose 拒否 | semi の Construction でも recompose が拒否される | **変化する(意図した変化)** — guard の根拠は逐語「a running Construction swarm: re-shaping the plan under it would move work no human is watching」であり、semi の Bolt 自律化はまさに走る swarm を作るため、意味論上は正しい追随。ユーザー可視の挙動変化なので U12 の文書同期に含める | どの unit にも未割当 |
| 7 | `amadeus-orchestrate.ts:2030` / `:2043` / `:2047` / `:2042-2054` | `readAutonomyMode`(投影の読取・semi の `gated` ハードコード) | 本 unit が改修 | **変化する(本体)** — R-12 / R-13 | U5 |
| 8 | `amadeus-orchestrate.ts:4024`(`autonomySwarmOutcome`) | `readAutonomyMode` の結果を `owedBatchGate` へ渡す | `autonomous` になり batch 境界ゲートが消える | **変化する(本体)** — FR-5 / RFC-0001 ToBe 行 16 | U5 |
| 9 | `amadeus-orchestrate.ts:5760` / `:5919` | swarm 起動述語 `node.mode === SWARM_MODE && readAutonomyMode(stateContent) !== null` | semi は現状も非 null(`"gated"`)なので真偽は不変 | **変化しない**。ただし R-13 で乖離時に loud fail するため、乖離状態では例外側へ抜ける(意図) | U5 |
| 10 | `-production.ts:713` | 投影の書込 | 本 unit が改修 | **変化する(本体)** — R-12 | U5 |
| 11 | `hooks/amadeus-stop.ts:160-163`(`stopBudgetMode`) | 継続上限の決定 | `Intent Autonomy Mode` を読むため無影響 | **変化しない**(P2/P3 の grep には出ない — 別フィールドを読む消費者として明示) | U4 |
| 12 | テスト 37 ファイル(P5) | semi の投影値を assert / fixture で設定 | 期待値の更新が要る | **変化する** — 投影変更と同一変更列で更新(件数は P5 の再実行で確認) | 各 unit |
| 13 | state テンプレート seed(`amadeus-utility.ts:4979-4981` — P6) | 新規 intent を `none` × `unset` で初期化 | `unset` が第 3 の legal 値として乖離判定へ流入 | **変化しない**(テンプレートは不変)— ただし乖離判定側が R-25 の pair 免除(宣言 none ∧ unset のみ)を持つことが前提。semi/full × unset は R-13/R-14 の loud fail 対象 | U5(R-25) |

**申し送り A(owned files 外の必須同伴変更 — 逸脱として申告)**: #2(`amadeus-log.ts:278`)と #4(`amadeus-state.ts:4135`)は、投影の意味変更と**同時に**直さないと semi の presence 保護が緩む。しかし `amadeus-log.ts` はどの unit の owned files にも含まれず、`amadeus-state.ts` は U3 所有である(`unit-of-work.md`)。本 unit は勝手に owned 範囲を広げない(team.md P3)。必要な是正の性質は「判定入力を `Construction Autonomy Mode` から切り離す」ことで、候補は (a) `Intent Autonomy Mode === "full"` を見る (b) C3 の対話性判定(非対話)を見る (c) 当該 occurrence の `AUTO_DECIDED` 記録の実在を見る の 3 案。(c) が意味論上もっとも正確(「機械が答えた」ことの直接証拠)だが実装量が最大で、複数の妥当解があるため**本書では裁定しない**。conductor へ差し戻し、owned files の割当と方式を決めてから投影変更を出荷すること。

## 3. 効果認可のフロー

`EffectClassification`(`amadeus-intent-autonomy.ts:516`)へ `advisory-deferral` を加える。認可点は 2 つ。

- **semi**: `SemiAuthority.authorizeEffect`(:644-654)は現在 `classification !== "workflow-reversible"` で拒否。改修後は `workflow-reversible | advisory-deferral` を許す。ノルム鮮度検査(`applicableNormFingerprint !== currentNormFingerprint`)は不変。
- **grant(full)**: `authorizeDecisionEffect`(:987-996)の :991 も同様に 2 分類を許す。`PROHIBITED_EFFECT` の返却条件はそれ以外に不変。

構築点は `ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS`(`amadeus-advisory-choice.ts:300-303`)ただ 1 つ。ここは `resolveAdvisoryChoiceAutonomously`(同 :1330-1371)が `commitProductionQuestionDecision` へ `effectClassifications` として渡す唯一の経路であり、他の効果構築点は `workflow-reversible` 固定のままなので、blocking sensor verdict / ノルム / カバレッジ系の延期が `advisory-deferral` を名乗る構文上の経路が存在しない(ADR-2 の「構築点で限定」)。

## 4. 他 unit との統合シーム

- **U3(waiting-interruption)— 先行依存**: `unit-of-work-dependency.md` の U5 `blockedBy` に U3。理由は park guard(`amadeus-state.ts:1600-1606` の `isAutonomousMode(content) && outstandingHumanTurns(pd).length === 0` による park 拒否)が残ったまま semi を `autonomous` へ投影すると、semi が park 能力を失うため(`requirements.md` FR-5 の「誤順で semi が park 能力を失う」)。**U3 の park guard 廃棄が着地するまで、本 unit の投影変更(2 節)をマージしない。**
- **U1(recommendation-core)**: `blockedBy` に U1。裁定順序 1(人間専権)の表現が U1 の型側に載るため(ADR-1)。
- **U2 / U7**: `intent-autonomy.ts` の同一ファイル共有(直列化制約)と、U7 の `statusAutonomyFacet` が C5/C6 の実効値関数を消費する(`unit-of-work-dependency.md` U7 `blockedBy`)。本 unit は実効値関数を **export された純関数**として出し、U7 が別ソースから再計算しないようにする(`services.md` S3、FR-8)。
- **U6(presence-closure)**: `allowsOccurrence` 系の同一 interaction 面を触るため同段直列(`component-dependency.md` 実装順 5)。
- **U4(interactive-carveout)**: 直接依存なし。`stopBudgetMode`(`hooks/amadeus-stop.ts:160-163`)は `Intent Autonomy Mode` を読むため、semi の投影 `autonomous` 化は Stop hook の継続上限を変えない。

## 5. エラー経路(fail-closed 意味論)

- **投影乖離**: 全 mode で loud fail(exit 非 0)。従来の「silent に swarm を無効化」は廃止(D3/D9)。`Construction Autonomy Mode` フィールドの**欠落**も乖離として扱う(現行 :2050 の `scheduling ?? null` が `(absent)` として通報していた面を、全 mode の失敗へ格上げ)。
- **`semiScope` 不在**: 現行どおり `MODE_REQUIRES_HUMAN`(:739)。pure 層が fingerprint を自作しない fail-closed を維持。
- **stance 読取不能**: `firesWalkingSkeletonGate` は解決不能な stance を `on` 側へ倒す(WS ゲートを人間へ残す = 安全側)。degrade で誤って発火しても人間が承認するだけで済み、逆(greenfield で WS を無人化)は不可逆な検収機会の喪失になるため。
- **効果認可**: 未知分類・`PROHIBITED_EFFECTS` 5 種は従来どおり拒否(FR-15 の無退行)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:31:07Z
- **Iteration:** 1
- **Scope decision:** none

ADR-2/ADR-10 の裁定と留保は忠実に落ちているが、WS stance ゲートが2つある walkingSkeleton 生成点の片方にしか掛からず、semi→autonomous 投影の消費者棚卸しが欠落し(presence guard の緩和を含む)、U3 所有ファイルへの書込が無申告。

### Findings

- BLOCKER | business-logic-model.md §1-3 + business-rules.md R-17 + domain-entities.md §4-5 | WS stance ゲートの配線点が不完全で、R-17 の不変条件(『walking-skeleton kind の occurrence は stance が on に解決されたときだけ生成される』)が設計どおりに実装しても成立しない。walkingSkeleton フラグを組み立てる production 呼出は2箇所ある — amadeus-state.ts:3711 `walkingSkeleton: stage.phase === "construction" && firstConstruction?.slug === slug,` と amadeus-orchestrate.ts:2820-2821 `walkingSkeleton:\n directive.phase === "construction" && firstConstruction?.slug === directive.stage,`(実測: grep -rn 'walkingSkeleton' packages/framework/core/tools/ の全 hit を確認)。FD は前者だけを『そのフラグの決定点』と名指し後者に触れていないため、engine 経路の occurrence は degrade スコープでも walking-skeleton のままになる。決定点の全数を再列挙するか、ゲートを共通の下流(interactionKind / -production.ts:189-192)へ寄せること。
- BLOCKER | business-logic-model.md §2 + business-rules.md R-12 | 投影の意味変更(semi: gated → autonomous)の消費者棚卸しが owedBatchGate と park guard の2件しかなく、実在する他の消費者の disposition が無い。実測(grep -rn 'isAutonomousMode\|AUTONOMY_MODE_FIELD' packages/framework/core/): amadeus-lib.ts:5184-5187 が `Construction Autonomy Mode === "autonomous"` を判定し、amadeus-log.ts:278 が `if (isAutonomousMode(content)) { // autonomous Construction: no human presence required }` として QUESTION_ANSWERED の人間 presence ガード(humanActedSinceLastAnswer)を丸ごと迂回する。semi を autonomous へ投影すると semi の全回答記録でこのガードが無効化され、同 intent が FR-12 / C13 で閉じようとしている presence fail-open を逆向きに広げる。他に amadeus-state.ts:4135 `autonomous: isAutonomousMode(content)`(gate revision recovery)、amadeus-utility.ts:5794-5800(値検証)、amadeus-orchestrate.ts:5760 / :5919(swarm 起動述語)も未列挙。grep 出力から消費者を作り直し、各件に『変化する / 変化させない』の判定と根拠を書くこと(project.md cid:application-design:dual-key-consumer-inventory)。
- BLOCKER | business-rules.md R-17 + domain-entities.md §3(ProductionStageAutonomyInput.walkingSkeleton 行)| unit-of-work.md の U5 owned files は `amadeus-intent-autonomy.ts` / `-production.ts` / `amadeus-orchestrate.ts`(読取)/ `amadeus-advisory-choice.ts` で、`amadeus-state.ts` は U3 の owned file。本 FD は amadeus-state.ts:3711 の書換を要求しているが、owned 範囲の拡張としても『共有ファイルの直列化』(unit-of-work.md が挙げるのは amadeus-bolt.ts / amadeus-intent-autonomy.ts / amadeus-orchestrate.ts のみ)としても申告が無い。承認済み成果物からの逸脱は実装せず申告する規律(team.md P3)に反するため、owned 面内(-production.ts 側)で成立する配線へ寄せるか、逸脱として明示し裁定を得ること。
- FOLLOW-UP | domain-entities.md §2 | `SEMI_ROUTINE_INTERACTIONS = ALL_INTERACTIONS.filter(...)` の導出は、そのままだと層の向きが逆転する。実測: `SEMI_ROUTINE_INTERACTIONS` は pure 層 amadeus-intent-autonomy.ts:581 の export、`ALL_INTERACTIONS` は -production.ts:76-81 の module-private const で、pure 層の import は node:crypto と型のみ(:7 / :9)、production が pure を import する側(-production.ts:21)。補集合導出を成立させるには kind 正本をどちらの層に置くかを設計で決める必要がある(現状の記述だと pure→production の循環 import になる)。
- FOLLOW-UP | domain-entities.md §2 と §3 | `AutonomyMode` が同一文書内で2つの型を指している。実測: amadeus-intent-autonomy.ts:11 `export type AutonomyMode = "none" | "semi" | "full"` と amadeus-orchestrate.ts:2035 `type AutonomyMode = "autonomous" | "gated"`。§2 の `projectConstructionAutonomy(mode: AutonomyMode)` は前者、§3 の『readAutonomyMode の戻り型 AutonomyMode | null は当面不変』は後者。投影の真実性を担う unit の設計書としては、両者を別名で書き分けるべき。
- NIT | business-logic-model.md §1 / questions Q1 | `semiAuthorityScope` の位置を -production.ts:534-540 と記すが実測は :532-539(`allowedInteractionKinds: SEMI_ROUTINE_INTERACTIONS` は :537 で一致)。`resolveAdvisoryChoiceAutonomously` は :1330-1372(末尾 1 行ずれ)。他の引用 — intent-autonomy.ts:510-516 / :581 / :636-640 / :639 / :644-654 / :649 / :725-749 / :728 / :739 / :740-742 / :987-996 / :991、-production.ts:76-81 / :86-90 / :94-97 / :102-108 / :189-192 / :203-216 / :704-723 / :713 / :812-820、orchestrate.ts:2042-2054 / :2046 / :2050 / :2070-2077 / :2262-2280 / :3928-3934、advisory-choice.ts:300-303 / :302 / :332-338、state.ts:1600-1606 / :3703-3712 / :3711、lib.ts:4010-4018 — はいずれも行単位で一致を実測確認。Q2 の全数 grep(`"phase-boundary"` 3 hit = 述語1 + unit test 2)も再実行して同一結果を得た。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:57:26Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1 の 3 BLOCKER はいずれも実質解消(WS ゲートを共通下流 interactionKind へ吸収・消費者棚卸しは再実行で全 5 述語の件数と全 hit が一致・owned files 外は R-21〜R-23 で逸脱申告)。残る欠落は 1 点 — 全 intent の初期値 `Construction Autonomy Mode: unset` を乖離規則が扱っておらず、書かれたとおりだと新規 intent が初回から loud fail する。

### Findings

- BLOCKER | business-rules.md R-12 / R-13 / R-14 + domain-entities.md §2(DivergenceReport)| 第 3 の legal 値 `unset` に規則が無く、新規 intent が構造的に loud fail する。state テンプレートは全 intent を `- **Intent Autonomy Mode**: none`(amadeus-utility.ts:4979)と `- **Construction Autonomy Mode**: unset`(同 :4981)の対で初期化する。R-12 は none → `gated` を期待し、R-13『乖離は全 mode で loud fail(exit 非 0)』/ R-14『欠落・未知値も乖離として扱う』は例外を設けていないため、autonomy 宣言前の素の state で `readAutonomyMode` が呼ばれる経路(amadeus-orchestrate.ts:4024 autonomySwarmOutcome、:5760 / :5919 の swarm 述語 — いずれも `next` 経路)が初回から失敗する。現行はこの状態が無害(:2046 が none / semi を記録値を読まずに `gated` へ落とすため)なので、これは新規に持ち込まれる退行。domain-entities.md :30 は `ConstructionAutonomy = "autonomous" | "gated" | "unset"`(amadeus-lib.ts:553、実測一致)を語彙表に挙げながら、`DivergenceReport.expected` は `"autonomous" | "gated"` の 2 値で、`unset` の扱いがどの規則にも無い。『未投影(unset)』を乖離から除外する規則を明示するか、初期化時点で投影を書く設計にすること。あわせて、この面が棚卸し表に載らなかった理由は述語の盲点である — P2 の述語 `"Construction Autonomy Mode"`(TS 文字列リテラル)はテンプレート内の markdown リテラル `**Construction Autonomy Mode**` に一致せず、P1/P3/P4 も別軸のため、5 述語のいずれからも見えない(project.md cid:application-design:dual-key-consumer-inventory の『変数名と展開後リテラル』の軸)。テンプレート seed を消費者行として追加し、述語軸を 1 本足すこと。
- FOLLOW-UP | business-logic-model.md §投影意味変更の消費者棚卸し 行 12 | テスト面(P5 = 37 ファイル)を 1 行に束ねて『各 unit』所有としている。再実行で 37 ファイルは一致したが、この 37 には U3 / U6 / U7 owned の面が混在しうる。R-23 が owned files 外の同伴変更を conductor 裁定へ回す方針を取った以上、テスト面についても『どの unit が更新するか』の割当が同じ裁定に含まれることを明記しておくと、投影変更の出荷条件(R-23)が完結する。
- NIT | 消費者棚卸しの再現性 | 5 述語を独立に再実行し、件数・hit ともに一致を確認した(2026-08-16、本 worktree 作業ツリー、対象 packages/framework/core): P1 `isAutonomousMode` = 6 hit(lib.ts:5186 定義 / state.ts:42 import / state.ts:1600 park guard / state.ts:4135 gate revision / log.ts:21 import / log.ts:278 presence 迂回)で表の行 1〜4 に全件対応、P2 `"Construction Autonomy Mode"` = 4 hit(-production.ts:713 / lib.ts:5184 / state.ts:995 / orchestrate.ts:2030 → 行 10 / 1 / 5 / 7)、P3 `AUTONOMY_MODE_FIELD` = 8 hit、P4 `readAutonomyMode` = 4 hit、P5 テスト 37 ファイル。未 disposition の hit は上記 BLOCKER のテンプレート seed を除いて無し。
- NIT | 新規引用の実測 | iteration-2 で追加された引用もすべて一致。`interactionKind` の呼出は -production.ts:204(occurrence 内)と :252(refusal 記録)の 2 箇所のみで、R-17a の『共通下流に置くことが唯一の単一決定点』は実測に裏付けられる。`productionStageAutonomy` :237-265、`commitProductionStageGateDecision` :794-、autoDecisions 重複判定鍵 :805、`recoverGateRevision` の `if (options.autonomous) return { kind: "not-needed", reason: "autonomous" }`(lib.ts:8932)、`assertRecomposeAllowed` :572-584 とその根拠コメント(:562-571 内、逐語『a running Construction swarm: re-shaping the plan under it would move work no human is watching』)、`ConstructionAutonomy` lib.ts:553、WS 供給点 2 箇所(state.ts:3711 / orchestrate.ts:2820-2821)— いずれも行単位で一致。

## Review — Post-repair verification(quality repair 経路)

- Iteration 2 の NOT-READY(unset 第 3 値の規則欠落 ほか)は reviewer_max_iterations=2 到達のため §12a の quality repair 経路で処理: `observe-quality` NOT-READY 観測(`sha256:1411f4fb…`)→ **repair** → conductor 是正(R-25 新設)→ 再検証で pair 化の追加 BLOCKER(免除鍵が記録値単独 — 宣言 semi/full × unset の無言縮退)→ pair 免除へ再是正 → 独立 reviewer の最終検証(invocation `0cf8a38e-e0db-4500-9326-7bff1309cb78`)**READY・BLOCKER 0**(「pair 化は 3 成果物すべてで一貫 … 実測一致」)→ READY 観測(`sha256:18a63c6c…`)→ **READY** でループ終端。
- 一次記録: 監査ログの quality repair イベント列と scratchpad の reviewer 結果 JSON(fd-rev3-b.json / fd-rev4-u5.json)。
