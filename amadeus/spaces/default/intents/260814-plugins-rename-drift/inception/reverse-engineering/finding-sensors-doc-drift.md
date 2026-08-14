# docs/harness-engineering/06-sensors のセンサー表が実在センサー集合から drift している

## 概要

`docs/harness-engineering/06-sensors.md`(および `06-sensors.ja.md`)のセンサー一覧表が 10 行なのに対し、実在センサーは 13 件(core 正本 11 + プラグイン供給 2)。core センサー 3 件が表から欠落し、逆に表に載っている 1 件は投影に到達しない未宣言資産である。件数フリー契約でない固定表が、宣言経路の fail-open による欠落を隠している。

## 証拠(observed = origin/main `cd64486a68c6a1144db50fbe3fde8273f5e18455`)

- 表の行数: `grep -c '^| \`amadeus-' docs/harness-engineering/06-sensors.md` → 10(ja 同数)
- 実在: `ls -1 packages/framework/core/sensors/ | wc -l` → 11、プラグイン供給 = `plugins/pr-convergence/sensors/` 1 件 + `plugins/formal-model-check/sensors/` 1 件 = 計 13
- 表に無い core センサー 3 件(本文全域 grep 0 hit): `amadeus-nfr-budget.md` / `amadeus-question-budget.md` / `amadeus-scope-sizing.md`
- 表にあるが投影されない 1 件: `amadeus-model-completeness.md`(plugin.json 未宣言 — 別 finding として起票)

## 期待 vs 実際

- 期待: docs のセンサー一覧は実在センサー集合(core + 宣言済みプラグイン供給)と一致するか、件数を機械導出する契約になっている
- 実際: 表は手書き固定で 3 件欠落・1 件は幽霊記載。en/ja 両言語で同じ drift

## 受け入れ条件

1. `06-sensors.md` / `06-sensors.ja.md` の表を実在集合と一致させる(欠落 3 件の追記、未投影 1 件の扱いは当該 finding の裁定に従う)
2. en/ja 両言語を同一変更で同期する
3. docs のセンサー表と実在集合の drift を検出する検査(既存 docs 検証テストへの追加または件数フリー契約への書き換え)の要否を判定し、根拠を記録する

## 影響

センサーを追加・参照する開発者が docs から誤った全数を得る。ハーネスエンジニアリングガイドの信頼性低下と、宣言漏れ(別 finding)の発見遅延。
