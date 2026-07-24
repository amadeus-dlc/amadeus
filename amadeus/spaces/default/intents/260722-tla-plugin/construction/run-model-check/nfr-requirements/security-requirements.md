# Security Requirements — U3 run-model-check

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 実行隔離

- Darwinは`/usr/bin/sandbox-exec`のnetwork-deny profile、Dockerは`--network=none`を必須とする。
- Docker imageは`@sha256:` digest固定、TLA jarはSHA-256検証後だけ実行する。
- model/cfg/out pathはparse後に検証し、shell文字列連結せずargv配列でspawnする。

## 証跡

- `EnvReceipt` に実施検証と宣言的非適用を記録し、秘密情報やhost環境変数を含めない。
- digest、jar checksum、planner identity、exit分類をout dirへ保存する。
