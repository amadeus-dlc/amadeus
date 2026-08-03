# Code Summary — pbt-deep-ci (#1980)

上流入力(consumes 全数): business-logic-model.md(処理フローと不変量 — 実装手順の骨格)、business-rules.md(BR 群を実装契約としてそのまま採用)、domain-entities.md(型・生成器のシグネチャ)、performance-design.md(実行時間の合否基準と予算配分)、security-design.md(fail-closed 境界と入力検証の所有)、unit-of-work.md(本 unit の Bolt 境界・規模見積・共通実装制約)、requirements.md(FR/NFR の受け入れ基準 — 出荷条件の導出元)

## 着地

- PR: **#2118**(squash マージ済み、ユーザー承認後に conductor が実行)
- ブランチ側コミット: `7e3431203`

## 実装内容

ci.yml へ `pbt-deep` ジョブを追加(`if: github.event_name == 'workflow_dispatch'`、`ci-success` の `needs` 非参加 = 非ブロッキング)。`AMADEUS_PBT_DEEP=1` 階層(numRuns 50,000)を手動トリガで実行。

## テスト

該当なし(CI 面)。BR-PDC-5/6 の検査(パス集合の事前実在検査+`Ran N tests across M files` の件数照合)をジョブ内に実装。

## 検証(実測)

full CI 764 files/0 failed、t222 系(needs ピン)21 pass、formal-verif baseline 再発行(赤の実測を先行)、ジョブ命令形の実走 36 pass/600,283 assertions/real 8.42s

## 逸脱の申告と裁定

1件(選挙 E-RRP-CG2 で 2-0 承認): `--timeout=30000` の付与。正準ランナー `tests/run-tests.ts:59` の `DEFAULT_TEST_TIMEOUT_MS` と逐語一致で、ランナー非経由の本ジョブだけが Bun 既定 5000ms を継承する構造の吸収。留保2件(由来コメント・実測併記)も実施。規模超過(実効87行 vs 41-61)は conductor 執行受理。

## 補足

`timeout-minutes: 5` は実測 8.8s × K=3 + setup 120s ≈ 146s → ×2 → 切り上げ。K が推定である旨と再導出条件をコメントに明記。

## レビュー

独立レビュアー(amadeus-architecture-reviewer-agent、builder と別個体)による実装レビューで **READY**。

## 上流入力の参照箇所

- `business-logic-model.md` / `business-rules.md` / `domain-entities.md` — 実装方針・BR 実装契約・型/生成器シグネチャの出典(本書「実装内容」節)
- `performance-design.md` — 実行時間の合否基準(本書「検証(実測)」節の時間実測はこの基準に対する判定)
- `security-design.md` — fail-closed 境界の所有と入力検証の責務分界(本書「実装内容」節の棄却契約)
- `unit-of-work.md` — 本 unit の Bolt 境界・規模見積(逸脱申告の基準)・全 unit 共通の実装制約
- `requirements.md` — FR/NFR の受け入れ基準(本書「検証(実測)」節の出荷条件の導出元)
