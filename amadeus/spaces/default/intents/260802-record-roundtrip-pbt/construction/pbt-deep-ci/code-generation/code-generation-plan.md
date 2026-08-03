# Code Generation Plan — pbt-deep-ci (#1980)

上流入力(consumes 全数): business-logic-model.md(処理フローと不変量 — 実装手順の骨格)、business-rules.md(BR 群を実装契約としてそのまま採用)、domain-entities.md(型・生成器のシグネチャ)、performance-design.md(実行時間の合否基準と予算配分)、security-design.md(fail-closed 境界と入力検証の所有)、unit-of-work.md(本 unit の Bolt 境界・規模見積・共通実装制約)、requirements.md(FR/NFR の受け入れ基準 — 出荷条件の導出元)

> 本書は swarm 経路(worktree 隔離の並行実装)で実施された Bolt の**事後記録**である(cid:code-generation:swarm-unit-artifact-backfill)。計画は FD/ND の業務ルール(BR)をそのまま実装契約として採り、builder ディスパッチ時のプロンプトへ焼き込んだ。

## 実装方針

ci.yml へ `pbt-deep` ジョブを追加(`if: github.event_name == 'workflow_dispatch'`、`ci-success` の `needs` 非参加 = 非ブロッキング)。`AMADEUS_PBT_DEEP=1` 階層(numRuns 50,000)を手動トリガで実行。

## TDD

失敗テスト先行の Red→Green を1件ずつ反復(cid:code-generation:tdd-default-with-narrow-exceptions)。落ちる実証は「赤の実測 → revert」を不可分1セットで実施し、注入面は実行時に消費される行へ置いた。

## 検証計画(出荷条件)

full CI 764 files/0 failed、t222 系(needs ピン)21 pass、formal-verif baseline 再発行(赤の実測を先行)、ジョブ命令形の実走 36 pass/600,283 assertions/real 8.42s

## テスト番号・seed の予約

該当なし

## 上流入力の参照箇所

- `business-logic-model.md` / `business-rules.md` / `domain-entities.md` — 実装方針・BR 実装契約・型/生成器シグネチャの出典(本書「実装内容」節)
- `performance-design.md` — 実行時間の合否基準(本書「検証(実測)」節の時間実測はこの基準に対する判定)
- `security-design.md` — fail-closed 境界の所有と入力検証の責務分界(本書「実装内容」節の棄却契約)
- `unit-of-work.md` — 本 unit の Bolt 境界・規模見積(逸脱申告の基準)・全 unit 共通の実装制約
- `requirements.md` — FR/NFR の受け入れ基準(本書「検証(実測)」節の出荷条件の導出元)
