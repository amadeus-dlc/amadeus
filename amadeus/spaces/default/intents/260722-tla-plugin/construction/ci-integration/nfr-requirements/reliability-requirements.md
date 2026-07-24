# Reliability Requirements — U4 ci-integration

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 成功条件

- workflow全体successはformal job exit 0、artifact実在、既存bandがdispatch用skipへ正常収束した場合だけ成立する。
- jar checksum不一致、Docker不在、image digest不一致、HARNESS_ERROR、artifact欠落はjobを赤にする。
- `ci-success.needs`へformal jobを追加せず、formal job自身の赤をGitHub UIで直接可視化する。
- formal job内の最終verify stepがmanifest、EnvReceipt、stdout、stderrの実在・非空・共通runIdを検証してから成功を許可する。

## 回復と証跡

- artifactにmanifest、EnvReceipt、stdout/stderrを保存し、再実行可能なdigest/checksumを残す。uploadは`if: always()`で実行し、検証本体のexitを別step outputへ保持してupload後に同じexitでjobを終了する。
- jar/download段階の失敗でも`out/bootstrap-failure.json`を生成し、schema、step、errorCode、imageRef、jar descriptorを保存する。
- 一時的runner障害は同一commitのmanual rerunで回復する。検証失敗をretryでgreenへ丸めない。
