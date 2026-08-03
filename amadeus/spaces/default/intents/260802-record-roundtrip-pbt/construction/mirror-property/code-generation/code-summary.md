# Code Summary — mirror-property (#1980)

上流入力(consumes 全数): business-logic-model.md(処理フローと不変量 — 実装手順の骨格)、business-rules.md(BR 群を実装契約としてそのまま採用)、domain-entities.md(型・生成器のシグネチャ)、performance-design.md(実行時間の合否基準と予算配分)、security-design.md(fail-closed 境界と入力検証の所有)、unit-of-work.md(本 unit の Bolt 境界・規模見積・共通実装制約)、requirements.md(FR/NFR の受け入れ基準 — 出荷条件の導出元)

## 着地

- PR: **#2099**(squash マージ済み、ユーザー承認後に conductor が実行)
- ブランチ側コミット: `d67de5342`

## 実装内容

Could unit。t274 の example-based round-trip(:58)を property 化(P-MR1: `render ∘ parse ∘ render = render`)。既存テスト無改変(+42/-0)、プロダクション改修ゼロ。

## テスト

t274 への追記 + `tests/helpers/arbitraries/mirror-snapshot.ts`(I-1〜I-12 の生成不変量、正本関数で組み立て — オラクル相殺なし)

## 検証(実測)

t274 24 pass、DEEP 100,066 assertions、full CI PASS、実行時間増分 ≈20ms(2秒予算内)

## 逸脱の申告と裁定

2件: 行数超過(181 vs 60-90)を conductor 執行受理 / builder が落ちる実証のベースライン測定で引数なし `git stash pop` を使用(自己捕捉・完全復元実測済み・実害なし)— stash-discipline / falling-proof-no-stash の違反実例として diary 記録

## 補足

構造比較(toEqual)禁止・`wrap` 不使用は BR-MP-6/7 どおり。落ちる実証2面(canonical key 破壊 / timestampFields 削除)を不可分1セットで実施。

## レビュー

独立レビュアー(amadeus-architecture-reviewer-agent、builder と別個体)による実装レビューで **READY**。

## 上流入力の参照箇所

- `business-logic-model.md` / `business-rules.md` / `domain-entities.md` — 実装方針・BR 実装契約・型/生成器シグネチャの出典(本書「実装内容」節)
- `performance-design.md` — 実行時間の合否基準(本書「検証(実測)」節の時間実測はこの基準に対する判定)
- `security-design.md` — fail-closed 境界の所有と入力検証の責務分界(本書「実装内容」節の棄却契約)
- `unit-of-work.md` — 本 unit の Bolt 境界・規模見積(逸脱申告の基準)・全 unit 共通の実装制約
- `requirements.md` — FR/NFR の受け入れ基準(本書「検証(実測)」節の出荷条件の導出元)
