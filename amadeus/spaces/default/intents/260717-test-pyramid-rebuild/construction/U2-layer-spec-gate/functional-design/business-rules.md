上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

本ユニット U2 のユーザー価値は「層責務の規約を確立する — どの tier がどの size まで許容かを定め、逸脱を tier-aware に検出する設計を持つ」(unit-of-work-story-map.md の U2 段)。

# 業務ルール — U2 層責務仕様 + tier ゲート + 比率/実行時間予算ガイドライン

本書は U2 が定める **層責務規約のルール**(C2)、**violation 判定ルール**(C3)、**比率目標ガイドライン**(FR-2)、**実行時間予算ガイドライン**(FR-5)を記す。size の判定は既存 `classifyTestSize`(`tests/lib/test-size.ts:49`)に閉じ、本ユニットは **size 判定を一切再実装しない**(ADR-04、unit-of-work.md:99-101、components.md C2 所有節)。本 intent は業務ルールの設計まで(実装・強制ゲート化 Out)。

実測 ref: measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`(tests/ 全域再帰 442ファイル、E-TPR-NR1、measurement-ref-in-artifacts。RE diff-base は `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)。本書に再掲する数値はすべて RE 実測転記であり、ハードコードではない(検証劇場 Forbidden org.md/team.md P2)。#1157 未接触。

## R1: 層責務規約 — tier ごとの allowedMaxSize

各 tier が許容する **size 上限**(`allowedMaxSize`、component-methods.md C2 IF)を規約化する(FR-3 AC-3a、components.md C2)。size(動的振る舞い)と tier(配置)は独立軸(`tests/lib/test-size.ts:5-7` の設計コメント: t_wada gihyo / Google SWE ch.14)である前提の上での「tier が許す上限」規約:

| tier | allowedMaxSize | 意味(components.md C2) |
| --- | --- | --- |
| unit | **small** | 純関数・ドメイン型の in-memory 単一スレッド検証のみ |
| integration | **medium** | ツール・フック・FS 境界の単一マシン検証まで |
| e2e | **large** | ハーネス駆動・ネットワーク含むまで |
| smoke | **medium** | **integration 相当**(E-TPR-AD Q2=B、2026-07-17 blind 3票一致) |

- **規約対象は 4 named tier のみ(E-TPR-NR1)**: `allowedMaxSize` の規約対象は上表の 4 named tier(unit/integration/e2e/smoke)に限る。台帳が全域再帰で拾う **harness/lib 等の補助 tier は規約対象外**で、`allowedMaxSize` の入力ドメイン外・ゲート判定に含めない(台帳に可視化のみ、反証可能根拠: 補助 tier は size ピラミッドの層序を持たない)。
- **smoke = medium の根拠(AC-3c)**: smoke tier(RE 実測 0 small / 14 medium / 0 large)は integration 相当として medium まで許容する(components.md C2 smoke 節、decisions.md ADR line 15)。**留保(e1)**: smoke の上限は medium までと明示し、**large は tier 是正対象**とする(青天井にしない)。すなわち smoke に large が現れたら `over-limit` violation として扱う(R2)。現状は全 14件 medium で規約内。
- **判定機構**: 上限の突き合わせは `SIZE_ORDER`(`tests/lib/test-size.ts:28`、verbatim: `export const SIZE_ORDER: Record<TestSize, number> = { small: 0, medium: 1, large: 2 };`)の序数比較で行う(R2)。tier→上限の写像は独自 size 判定ではなく **規約テーブルの引き当て**。

## R2: violation 判定ルール(序数比較)

台帳1行 `{ tier, measured }`(measured は C1 = `classifyTestSize` 由来)に対し:

- **over-limit** ⟺ `SIZE_ORDER[measured] > SIZE_ORDER[allowedMaxSize(tier)]`
- それ以外は **none**

既存 `detectWallClockDrift`(`tests/lib/test-size.ts:113-121`、verbatim: `if (SIZE_ORDER[dynamicFloor] > SIZE_ORDER[effectiveDeclared]) {`)と **同型の strict 序数比較**(`>`、上限に等しいのは規約内)。これを `detectTierSizeViolation` として設計し(component-methods.md C3)、`WallClockDrift`(`tests/lib/test-size.ts:106-108`)同型のスマートコンストラクタで「上限超過でないのに violation」を表現不能にする。**size 判定そのものは classifyTestSize に閉じ、本ルールは measured を上限と比較するのみ**(ADR-04)。

具体的な over-limit 判定例(R1 の allowedMaxSize と SIZE_ORDER から機械導出):

- unit(allowed=small=0)× measured=medium(1) → `1 > 0` → **over-limit**
- unit × measured=large(2) → `2 > 0` → **over-limit**
- integration(allowed=medium=1)× measured=large(2) → `2 > 1` → **over-limit**
- integration × measured=medium(1) → `1 > 1` = false → **none**(上限ちょうどは規約内)
- e2e(allowed=large=2)× 任意 measured → 常に `≤ 2` → **none**
- smoke(allowed=medium=1)× measured=large(2) → `2 > 1` → **over-limit**(留保 e1 の large 是正)

## R3: 既存 size ドリフトゲートとの非破壊温存ルール

既存 declared-vs-measured ゲート(`declared < measured` で CI 赤、`tests/unit/t-test-size-drift.test.ts`、アノテーション契約 `tests/lib/test-size.ts:16-21`)は **本 intent で触らない**(ADR-05、unit-of-work.md reuse inventory)。tier-aware(tier-vs-measured)は既存ゲートの **置換ではなく別観点の追加** であり、後方互換シム・二重実装を足さない(Forbidden P5)。両ゲートは入力軸が直交する(declared×measured / tier×measured)ため統合せず、別関数として共存させる(business-logic-model.md「既存ゲートとの直交」)。

## R4: 比率目標ガイドライン(FR-2、強制ゲート化 Out)

中長期の **ガイドライン目標**(強制ゲートでなく指針、FR-2 AC-2a/2c)を named 目標定数として文書化する(constants-from-code の文書版 — マジックナンバー散在禁止):

| 目標定数(名前) | 目標値 | 種別 |
| --- | --- | --- |
| `RATIO_TARGET_SMALL_MIN` | small ≥ **50%** | ガイドライン下限 |
| `RATIO_TARGET_MEDIUM_MAX` | medium ≤ **45%** | ガイドライン上限 |
| `RATIO_TARGET_LARGE_MAX` | large ≤ **5%** | ガイドライン上限 |

**現状ギャップ(RE 実測転記、measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`、tests/ 全域再帰442)**: small 60/442 = **13.6%**、medium 379/442 = **85.7%**、large 3/442 = **0.68%**(business-rules.md U1 マトリクス、scan-notes:35)。理想比率(small 多数 → medium → large 少数)と真逆の **medium 偏重(85.7%)アイスクリームコーン型**(AC-2b)。移設(別 intent)で段階的に目標へ近づける。

- **強制ゲート化は本 intent Out**(FR-2 AC-2c、ADR-02、移設 intent で検討)。本書はガイドライン目標と現状ギャップの文書化まで。

## R5: 実行時間予算ガイドライン(FR-5、値は実測+選挙・強制ゲート化 Out)

各 tier(unit/integration/e2e/smoke)の **実行時間予算(目標)** を設計対象として宣言する(FR-5 AC-5a、scope-document「実測前提・値は選挙」)。

- **目標値は本ユニット(U2)の実測+選挙で確定**する routing(AC-5a)。**実測の実施ステージ**: 実際の tier 別実行時間の計測は U2 の code-generation / build-and-test 段(テストが実行される段)で `tests/run-tests.sh` の tier 別実行を実測手段として行い(unit-of-work.md reuse inventory、新規計測機構は不要)、その実測ログを一次材料に選挙で目標定数を確定する。設計段(functional-design/nfr)では枠のみ宣言し値を断定しない。
- **実測前は基準値を断定しない**(constants-from-code)。RE record には現時点で tier 別 wall-clock 実測データが無く、計測は本ユニットの前提作業である(FR-5 AC-5a 註)。したがって本書は予算の **枠(tier ごとに1目標定数を置く設計)** を宣言し、**具体値は「U2 実測 + 選挙」の裁定を待つ**(値のプレースホルダ: `TIME_BUDGET_{TIER}_SECONDS` = 実測+選挙で確定)。
- 予算は **ガイドライン目標**(FR-2 比率目標と同格、FR-5 AC-5b)。tier-aware ドリフトゲート(FR-3、R2)と整合する形で設計に委ねる。**強制ゲート化は本 intent Out**。

> 断定回避の明示: 本書は実行時間予算の数値を一切ハードコードしない。実測前に帯・閾値を書くことは constants-from-code 違反であり、検証劇場を生む(P2)。値は実測ログの転記 + 選挙裁定でのみ確定する。

## 実装スコープ境界(Out 明記)

- violation 判定(R1/R2)の **実装・CI 配線・落ちる実証・exit code は移設 intent**(FR-3 AC-3b、unit-of-work.md:113)。
- 比率目標(R4)・実行時間予算(R5)の **強制ゲート化は Out**(ADR-02)。本書はガイドライン目標の文書化と、実行時間予算値の実測+選挙 routing 宣言まで。
- 既存 size ドリフトゲート(R3)は非破壊温存(触らない、ADR-05)。size 判定は `classifyTestSize` に閉じ再実装しない(ADR-04)。adapter/登録スロットの先行着地はしない(N3)。
