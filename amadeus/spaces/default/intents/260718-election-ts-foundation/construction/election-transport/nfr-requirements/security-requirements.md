# Security Requirements — election-transport(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## blind 性の構造保証(本ユニットの中核セキュリティ要件)

- 配信 payload は `ShortNotification`(選挙 ID+配布ビューパス参照のみ)— 質問文・選択肢テキスト・推奨・先行票を型として持たない(requirements.md FR-2a の構造排除、business-rules.md BR-T1 の落ちる実証付き)
- subagent 輸送の blind 性は構造的隔離(requirements.md FR-7a — spawn 先は他票を観測できない)。DeliveryDirective にも票・集計情報を含めない(business-logic-model.md の型定義)
- 票の還流は leader/conductor 宛私秘(D-09)であり U4 は票を扱わない(送達のみ — 読み書き境界の分離)

## コマンド境界

- 主防御は型による構造排除: payload は ShortNotification(electionId+viewPath のみ)の構造データ生成でユーザー入力の直結なし(BR-T1 の型面 assert が強制)。send.sh 呼び出しは Bun.spawnSync の**配列引数渡し(シェル非経由)を要件とし、実装時に `sh -c` 非経由であることを実測確認する** — シェル経由でない限りバッククォート展開の攻撃面は構造的に存在しない(agmsg-args-no-backquote は人間のシェル入力規律であり本経路への転用はしない — reviewer 指摘の意味論適合是正)
- 新規 runtime 依存なし(technology-stack.md の Bun/TS 現行構成+外部 agmsg は既存導入済みの実測)。認証は agmsg の登録機構へ委譲し U4 は資格情報を持たない
