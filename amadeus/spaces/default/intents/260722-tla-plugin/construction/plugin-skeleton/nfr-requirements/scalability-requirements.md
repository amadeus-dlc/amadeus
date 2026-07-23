# Scalability Requirements — U2 plugin-skeleton

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 規模

- 複数plugin・複数stageを決定的なpath辞書順で発見し、件数に対して線形に処理する。
- core/plugin間とplugin間の全slugを一意集合で検証し、衝突時に両pathを報告する。

## 成長方針

- stock scopeへ自動加入せず、各plugin stageはopt-inで独立実行する。
- discovery index、DB、daemonは導入せず、実測で必要になるまでfilesystem walkを維持する。
- capacity triggerは1,000 stageまたはcompile 10秒超。同時compileはworkspace lockで1つに直列化し、data growthはstage file総量64MiBを上限とする。
