# スケーラビリティ要件 — U5 doctor-observability

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 適用可否(N/A の判定)

U5 は読み取り専用の単発 CLI 診断であり、負荷に応じてスケールする稼働体を持たない。business-logic-model のとおり doctor は既存 `--doctor` 経路への節追加で、business-rules の BR-U5-1(射影のみ)により新走査を持たない。したがって水平スケール・オートスケール・スループット拡張などの常駐 service 向け指標は **N/A** とする(常駐 service 向けパターンの機械適用禁止)。

- 合否: 拡張性固有の受け入れ基準は設けない。単発・読み取り専用 CLI であることを反証可能な N/A 根拠とする

## プラグイン数少数前提と出力の線形性

requirements の A-3(同時プラグイン数は少数、lockfile 不要)を継承する。business-logic-model の分岐表はプラグインごとに 1 行を射影するもので、行数はインストール済みプラグイン数に線形だが、A-3 のとおり母集団は少数前提である。DropsRecord・composition record も同じ少数前提の集合であり、大規模化に対する特別なページング・集約機構は不要である。

- 合否: doctor plugin 節の行数はプラグイン数・drops 数に線形で、追加の集約・ページング機構を持たない(A-3 の少数前提を反証可能な N/A 根拠とする)

## 0-plugin 縮退という下限境界

business-rules の BR-U5-4(0-plugin 縮退)のとおり、0-plugin 時は 1 行縮退で既存 doctor 出力の他行に影響ゼロである。これは「プラグインがゼロのときにコストもゼロに漸近する」下限側の決定的境界であり、スケール機構の代替として、母集団サイズに対する出力の単調性を保証する。

- 合否(0-plugin 縮退): 0-plugin baseline の doctor 出力 diff が追加 1 行のみ(BR-U5-4 の検証)。technology-stack のとおり新規ランタイム依存を持たず、この境界は既存 doctor 経路の上に成立する
