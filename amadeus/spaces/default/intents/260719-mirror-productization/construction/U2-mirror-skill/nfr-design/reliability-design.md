# Reliability Design — U2-mirror-skill

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## RD-U2-1: loud failureの透過(RL-U2-1)

`bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts status`のexit codeとstdout/stderrを変更せず報告する。ツール不在、実行不能、未知exitを成功へ丸めず、SKILL側のfallback実装やエラー抑止を設けない。exit 1でもU1の構造化`StatusOutcome`として検証できなければ起動/実行失敗としてloudに停止する。

## RD-U2-2: exit契約に基づく決定的分岐

exit 0は乖離なしで終了、exit 1かつ構造検証済みの場合だけfindings別の人間選択へ進み、exit 2はprecondition理由と復旧手順を表示して終了する。構造検証不能なexit 1と0/1/2以外は未分類失敗としてloudに停止し、create/sync/closeを提案しない。ツール不在・起動失敗時にStep 2へ進まない検査を受け入れ基準へ含める。

任意intent指定が実在directoryの正確なbasenameでない場合、または単一argvとして保持できない場合は実行前にloudに停止する。shell commandへの補間やfallback実行は行わない。

## RD-U2-3: 配布ドリフト防御(RL-U2-2)

正本と6投影面の一致を`dist:check`と`promote:self:check`で検証し、実verb集合・exit契約・`{{HARNESS_DIR}}`入口をgrep受け入れ基準で固定する。英日docsは両方のmirror節の存在に加え、`status/create/sync/close`、exit `0/1/2`、human gateの語彙集合が一致することを検査する。
