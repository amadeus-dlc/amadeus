# Reliability Design — U4 ci-integration

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Step order

- checkout→Bun setup→runtime receipt→jar verify→model check(exit capture)→artifact verify→`if: always()` upload→capture済みexit再送出の順を固定する。
- final verifyはmanifest、EnvReceipt、stdout、stderrの非空、共通runId、digest/sizeを検査する。
- U3 Step 11引継ぎのDocker warm-up 1回+計測5回について各runのterminal manifest-last、NOT_DETECTED、exit 0、EnvReceiptのDocker適用3検査passed/非該当2検査not-applicableを検証する。証跡欠落や`not-run`残存は受入失敗とする。
- checkout以後のbootstrap/model-check/verifyは各stepを`continue-on-error: true`で実行し、step outcomeとexitをterminal-state stepへ集約する。証跡生成、final verify、upload、terminal-stateは`if: always()`で必ず走らせる。
- terminal exitの優先順位はbootstrap failure > model-check HARNESS_ERROR > artifact verify failure > upload failure > DETECTED > NOT_DETECTEDとし、最初の最高優先failure codeをjob exitへ再送出する。

## Failure evidence

- bootstrap失敗も`bootstrap-failure.json`を生成し、step、errorCode、imageRef、jar descriptorを保存する。
- upload failureを含む任意の必須証跡欠落はjob failureとし、retryで検証失敗をgreenへ丸めない。
