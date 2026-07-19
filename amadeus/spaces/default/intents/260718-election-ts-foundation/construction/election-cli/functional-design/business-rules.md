# Business Rules — election-cli(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## ルール一覧(テスト: 状態機械の純関数部は unit / verb 配線・機械実行器は integration・e2e — fs-tests-integration-first)

| # | ルール | 由来 | テスト |
|---|---|---|---|
| BR-C1 | next は現状態から一意の指令を返し、指令は実行すべき verb+引数を機械可読で名指しする(AI 無知識) | FR-0、ADR-3 | 全状態×指令の決定表テスト |
| BR-C2 | hold 指令は人間への提示文を含み、AI 側で自動解決する経路がない。復帰は hold-resolved(resolution 必須)のみ | C-01、FR-4b | hold 4理由の指令生成+自動遷移の不在+復帰表4行の遷移 assert |
| BR-C3 | report は現状態と result の不整合を reject(fail-closed)— 正当対応は 7状態×6 result の遷移表(business-logic-model)で一意 | FR-0 | 遷移表外の全ペア型不整合ケース(代表6)+hold-resolved の resolution 欠落 |
| BR-C4 | stdout = 指令 JSON のみ / advisory は stderr(既存 engine 契約と同型) | stdout-directive-stderr-advisory | stdout parse+stderr 分離 assert |
| BR-C5 | 機械実行器(選挙知識ゼロの TS ループ)が 0件確認選挙を完走する | FR-0 受け入れ、ADR-6 (i) | e2e: runMachine で open→recorded 完走+記録実在 |
| BR-C6 | 開票タイミングは collect-wait 指令中の early 可否併記まで — tally 実行の判断は AI/人間側(ツールが勝手に開票しない) | C-01 | collect-wait 中に tally 未実行の assert |
| BR-C7 | 全 verb の exit code 契約(成功0/失敗1)と loud エラー | NFR-1 系 | 各 verb の正異常 exit 実測 |

## 落ちる実証

BR-C1(指令表)・BR-C3(遷移検証)の実行時消費行へ注入し赤→revert。機械実行器 e2e は指令スキーマ破壊の注入で赤(consumer 契約の落ちる実証)。
