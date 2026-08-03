# Code Summary — election-readpath (#1980)

上流入力(consumes 全数): business-logic-model.md(処理フローと不変量 — 実装手順の骨格)、business-rules.md(BR 群を実装契約としてそのまま採用)、domain-entities.md(型・生成器のシグネチャ)、performance-design.md(実行時間の合否基準と予算配分)、security-design.md(fail-closed 境界と入力検証の所有)、unit-of-work.md(本 unit の Bolt 境界・規模見積・共通実装制約)、requirements.md(FR/NFR の受け入れ基準 — 出荷条件の導出元)

## 着地

- PR: **#2085**(squash マージ済み、ユーザー承認後に conductor が実行)
- ブランチ側コミット: `efff5c4ba / cd5afe4eb / d1d4e7028 / 1ffb30f90 / 5bd33ab55`

## 実装内容

`parseElectionFile` を `amadeus-election-store.ts` へ新設し、`Store.load`(:503)と `Store.setState`(:512)の読み口2箇所が `Election.parse`(#1459 硬化)を必ず経由する構造へ一本化。`readJson<T>` 本体・`StoreError` union は不変(ADR-4)。

## テスト

t416(P-EL1 round-trip、unit)/ t417(P-EL2 fail-closed + P-EL3 = #1459 反例3形の example 固定、integration)+ `tests/helpers/arbitraries/election.ts`

## 検証(実測)

full CI 750 files/0 failed、patch gate 76/76 covered・allowlisted 0、dist 7面再生成+dist:check/promote:self:check、t258-boundary-guard、typecheck/lint 全 0

## 逸脱の申告と裁定

2件(選挙 E-RRP-CG1 で 2-0 承認): t259 fixture の非適合定義(`choices: []`)を妥当化 / `specs/tla/model-map.json` の実装ハッシュを `updateModelMap --impl-only` で再発行

## 補足

allowlist 行ピン2件を機械 remap(476-477→494-495、491→509。span 不変・reason 直読照合・straddle なし)。walking skeleton ゲートはマージ承認で通過。

## レビュー

独立レビュアー(amadeus-architecture-reviewer-agent、builder と別個体)による実装レビューで **READY**。

## 上流入力の参照箇所

- `business-logic-model.md` / `business-rules.md` / `domain-entities.md` — 実装方針・BR 実装契約・型/生成器シグネチャの出典(本書「実装内容」節)
- `performance-design.md` — 実行時間の合否基準(本書「検証(実測)」節の時間実測はこの基準に対する判定)
- `security-design.md` — fail-closed 境界の所有と入力検証の責務分界(本書「実装内容」節の棄却契約)
- `unit-of-work.md` — 本 unit の Bolt 境界・規模見積(逸脱申告の基準)・全 unit 共通の実装制約
- `requirements.md` — FR/NFR の受け入れ基準(本書「検証(実測)」節の出荷条件の導出元)
