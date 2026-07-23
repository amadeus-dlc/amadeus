# Security Design — U4-engine-boundary

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## SD-U4-1: 自動副作用をsyncへ限定(SR-U4-1)

engineが発行できる自動変更directiveは固定引数の`amadeus-mirror.ts sync`だけとする。createとcloseは常にaskで人間選択を要求し、設定値やIssue本文からverbやshell文字列を生成しない。

## SD-U4-2: invalid設定のfail-closed(SR-U4-2)

U3 `resolve`がinvalidなら、層名と検証エラーを含むengine errorとして停止する。defaultや読めた層だけでauto-sync判定を続けず、設定修復後の再実行を要求する。

## コマンド境界

print directiveは`bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts sync`という正規コマンドを名指しし、shell展開・自由文挿入・create/closeへの動的置換を許さない。
