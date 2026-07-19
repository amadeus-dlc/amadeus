# Security Requirements — election-transport(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## blind 性の構造保証(本ユニットの中核セキュリティ要件)

- 配信 payload は `ShortNotification`(選挙 ID+配布ビューパス参照のみ)— 質問文・選択肢テキスト・推奨・先行票を型として持たない(requirements.md FR-2a の構造排除、business-rules.md BR-T1 の落ちる実証付き)
- subagent 輸送の blind 性は構造的隔離(requirements.md FR-7a — spawn 先は他票を観測できない)。DeliveryDirective にも票・集計情報を含めない(business-logic-model.md の型定義)
- 票の還流は leader/conductor 宛私秘(D-09)であり U4 は票を扱わない(送達のみ — 読み書き境界の分離)

## コマンド境界

- agmsg 送信は send.sh への引数渡し — バッククォート・シェル展開を含む文字列を渡さない(agmsg-args-no-backquote ノルムの要件化。payload は構造データからの生成でユーザー入力の直結なし)
- 新規 runtime 依存なし(technology-stack.md の Bun/TS 現行構成+外部 agmsg は既存導入済みの実測)。認証は agmsg の登録機構へ委譲し U4 は資格情報を持たない
