# Reliability Requirements — U2 plugin-skeleton

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 可逆性

- compose→doctor→compile→single実行→drop→doctor→compileの全ライフサイクルを実FS E2Eで検証する。
- drop後のcore compile出力は0-plugin baselineとbyte-identicalであること。
- compose/drop失敗時は既存journal回復契約により適用前状態へ収束する。
- 常駐serviceがないためSLA/SLO、backup、DR、graceful degradationは非該当。可用性の代わりに各CLI操作のatomicityと再実行収束を要求する。

## 観測

- compile errorはstderrの単一行JSON `{\"schema\":\"amadeus.plugin-stage-error.v1\",\"code\":\"SLUG_COLLISION\",\"slug\":\"...\",\"existingPath\":\"<relative>\",\"pluginPath\":\"<relative>\"}` と exit 1 を固定形式とし、absolute pathは出力しない。
- single stageはU3 CLIのexit 0/1/2+、out dir、verdictをそのまま報告し、無言skipしない。
