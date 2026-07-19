# Frontend Components — election-transport(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## N/A 宣言(反証可能根拠付き)

U4 は輸送 port+2実装で UI 面なし。agmsg 側の可視面は send.sh が届ける短通知テキスト1行のみ(様式は business-logic-model の payload 文言 — U5 の notify verb が組み立てて渡す)。

## 出力契約

| 消費側 | U4 が返すもの |
|---|---|
| U5 CLI(notify verb) | Result<DeliveryOutcome[], TransportError>(per-voter — agmsg は delivered(record 即確定)/ subagent は directive(記帳は report 時)。iter2 #5 是正) |
| U2 store(timeline 記帳) | DeliveryRecord(appendTimeline の入力 — 送信実行由来のみ) |
