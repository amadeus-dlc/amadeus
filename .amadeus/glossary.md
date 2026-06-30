# 用語集

## 用語

| 用語 | 説明 | 状態 |
|---|---|---|
| build workspace | エージェント、skill、validator、開発用スクリプトを動かす場所。 | 採用 |
| host environment | 昇格済み skill または生成された skill が動作する環境。 | 採用 |
| target workspace | 変更差分、自己開発用 `.amadeus/`、作業中の成果物を置く場所。 | 採用 |
| target artifacts | skill が生成、更新、検証する成果物集合。 | 採用 |
| stage0 | 作業開始時点で build workspace から利用可能な昇格済み skill、既存 validator、開発用スクリプト。 | 採用 |
| stage1 | target workspace にある作業中の source skill とローカル検証結果。 | 採用 |
| stage2 | target workspace の昇格先成果物、example、validator がそろって通った状態。 | 採用 |
| source skill | `skills/amadeus-*` にある作業中の skill source。 | 採用 |
| 昇格先成果物 | `.agents/skills/amadeus-*` に反映された skill 成果物。 | 採用 |

## 避ける語

| 避ける語 | 代わりに使う語 | 理由 |
|---|---|---|
| host workspace | host environment | `host` は workspace 名ではなく、skill が動作する環境を表すため。 |
| dev workspace | build workspace または target workspace | 役割が曖昧になるため。 |

## 禁止ワード

| 禁止ワード | 理由 |
|---|---|
| `.target-amadeus/` | root `.amadeus/` を自己開発用 steering layer として扱う方針と衝突するため。 |
