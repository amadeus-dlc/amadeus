# Reliability Requirements — U2 visualize-hardening

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## 信頼性要件

- U2-REL-01: サイズ超過は fail-closed(business-rules.md ルール14)— --write/--check とも zero-write exit 1+非空 stderr
- U2-REL-02: `--check` の3値契約(一致0 / 不一致1 / 不在1 — business-logic-model.md 増分1)を落ちる実証で固定(requirements.md AC-5)
- U2-REL-03: CI 失敗は job 赤として loud(business-rules.md ルール16 — continue-on-error 禁止)。PR critical path は延長しない(ci-success 集約外の維持)
- U2-REL-04: 着地検証 — マージ後 main push run の job green+bot PR への index.html 同乗を実測してから完了とする(business-logic-model.md 増分4、no-silent-scope-narrowing の閉包)

## 非対象

- アラート・通知(scope Out)。ミラー定数(16_384)の乖離はピンテスト(ルール15)が検出面
