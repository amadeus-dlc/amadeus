# Reliability Requirements — U3 run-model-check

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 終局契約

- exit 0は outcome `NOT_DETECTED`、exploration COMPLETE、completion marker、state統計、不変量違反なしが全て成立した場合だけ返す。
- exit 1は反例を伴う DETECTED、exit 2以上は実行不能・drift・partial・timeout等の HARNESS_ERROR とする。
- prepare時snapshotとspawn直前verifyを分離し、環境driftを検出したらspawnしない。
- outは同一filesystem上の`<out>.tmp-<runId>`へ生成し、terminal manifest完成後にrenameでatomic publishする。既存outは拒否し、失敗時tmpは`partial: true`のfailure manifestとともに一意なfailure dirへrenameする。

## 観測と再実行

- stderr先頭行はschema `amadeus.run-model-check.v1`、runId、outcome、exitCode、errorCodeを持つ単一行JSONとし、2行目以降をhuman-readable detailとする。manifest/stream/receiptは同じrunIdを持ち、秘密値をredactする。
- 同一固定入力・固定環境は決定的verdictを返す。失敗時は原因修正後に全 invocation を再実行する。
