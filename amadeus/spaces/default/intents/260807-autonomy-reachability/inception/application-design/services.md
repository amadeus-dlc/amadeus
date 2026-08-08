# Services — autonomy-reachability(#2378)

上流入力(consumes 全数): requirements.md(NFR-4/NFR-5 のサービス面制約)、architecture.md / component-inventory.md(既存オーケストレーションの現在断面 — 患部詳細は re-scan record 正本)。

本 intent は常駐サービスを持たない CLI/hook 構成(cid:nfr-design:c1 — cache/scaling のセレモニーは適用しない)。「サービス」は決定的 CLI ツールとイベント境界として記述する。

## オーケストレーション(orchestration 型)

- **engine(amadeus-orchestrate)が唯一のルーティング所有者**: birth 同時宣言は「argv 抽出 → birth print directive への搬送 → intent-birth 内での適用」という engine 主導の直列フローとし、conductor 側の判断を挟まない(choreography にしない理由: 宣言の消化タイミングが conductor 実装依存になると到達性ギャップを再生産する)
- **audit イベントは同期 emit**: FR-2a の refusal イベントは認可判定と同一プロセス内で emit(非同期キューなし)。mkdir ロック下の append-only(既存 audit 契約)

## 通信契約

- C1→C2: 関数呼出し(同一プロセス)。宣言値+HUMAN_TURN provenance を渡す
- C2→audit shard: `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(既存)+新設 refusal イベント(FR-2a)。append-only、ロック下
- C4→audit shard: `QUESTION_ANSWERED` 属性拡張(FR-3a)— スキーマ後方互換(属性追加のみ、既存読取は不変)
- C7→リポジトリ正本: read-only(テストは書込なし)

## ライフサイクル・スケール特性

- すべて短命プロセス(bun 直接実行、~20ms 起動)。スケール考慮は不要
- 冪等性: mode 宣言は「first declaration のみ受理」の既存ラッチを維持。refusal イベントは発生の都度 emit(重複抑止しない — 発生回数自体が計測対象)
