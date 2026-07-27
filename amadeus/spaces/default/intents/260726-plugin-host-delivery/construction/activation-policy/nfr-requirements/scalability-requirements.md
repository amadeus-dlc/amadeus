# スケーラビリティ要件 — U6 activation-policy

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## spec ファイル集合の規模と線形性

business-logic-model のフロー 1 は `computeSpecHash(ActivationWatch.globs)` で spec ファイル集合をハッシュする。その規模は現行実測で小さい。

- 実測(測定 ref: HEAD `7bce53dc6`、`specs/tla/` を `wc` / `du` で計測): 対象は 3 ファイル(`FormalElection.tla` 310 行、`FormalElection.cfg` 16 行、`model-map.json` 1,196 bytes)、`du -sh` = 24K
- spec-hash 計算はファイル数・総バイト数に線形で、requirements の A-3(同時プラグイン数は少数)の少数前提のもとで、対象集合の無制限な増大は本 intent の非目標である。数百 KB 級への線形性実測は対象外(固定様式・小規模 spec の照合)

## 常駐 service 向けパターンの非適用(N/A)

U6 は engine の指令発行時・verdict 記録時の単発判定であり、負荷に応じてスケールする稼働体を持たない(business-logic-model「services.md どおり常駐なし」)。したがって水平スケール・オートスケール・スループット拡張などの常駐 service 向け指標は **N/A** とする(常駐 service 向けパターンの機械適用禁止)。technology-stack のとおり新規ランタイム依存もゼロで、スケール機構を担う実行体が存在しない。

- 合否: 拡張性固有の受け入れ基準は設けない。単発判定であることと A-3 の少数前提を反証可能な N/A 根拠とする

## 0-plugin ゼロ影響という下限境界

business-rules の BR-U6-4(0-plugin ゼロ影響)のとおり、plugin 未 compose 時は engine の挙動・出力が現行と byte 同一である。business-logic-model のフロー 2 は「composition record に formal-model-check が存在しない場合は何もしない」と規定する。これはプラグインがゼロのときにコストと影響がゼロに漸近する下限側の決定的境界であり、母集団サイズに対する影響の単調性を保証する。

- 合否(0-plugin ゼロ影響): 0-plugin baseline での next 出力比較が byte 同一(BR-U6-4 の検証)
