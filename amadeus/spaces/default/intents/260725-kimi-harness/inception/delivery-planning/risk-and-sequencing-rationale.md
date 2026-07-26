上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices

# Risk & Sequencing Rationale — 260725-kimi-harness

## 採用ヒューリスティック: walking-skeleton-first + risk-first(hybrid)

- **Bolt 1 = walking skeleton**(team-practices で承認済み): 配布経路の全層を通す最小スライスを最初に、単独・ゲート付きで出す
- **Bolt 2 以降 = risk-first**(Q1 でユーザー承認): 最大の技術リスクを最早に潰す順序

## 順序の根拠

| Bolt | 根拠 |
|---|---|
| B1 definition | skeleton 規律。以降の全作業の土台 |
| B2 adapter | 最大リスク R1(payload 実機差異)を内包。live capture が遅れるほど後続の手戻りが大きい。U3 の managed block 内容も B2 の capture 結果で実機確定値になる |
| B3 merge | 既存流儀の踏襲中心でリスク低。B2 の変換表確定後に snippet 内容を最終固定できる |
| B4 enums | doctor arm が B2(adapter 実在)と B3(managed block)の両成果物を検査対象にするため、両者の後(位相どおり) |
| B5 enumeration | dist 実在(B1)と doctor(B4)を前提とする dogfood 統合ポイント |
| B6 journey | セルフインストール済み環境(B5)で駆動する |
| B7 docs | 実機検証・実走の事実に基づく手順書とするため最後 |

位相からの逸脱: なし(U2 と U3 は同位だが risk-first で U2 を先に置いた。DAG 違反ではない)。

## 並列不可の理由(直列実行の根拠)

swarm の `resolve --harness kimi` は `HARNESS_VALUES` に kimi を追加する **B4(U4)の変更がブランチに着地するまで fail-closed で拒否**される。並列化の唯一の候補(U2∥U3)は B4 より前に位置するため、本 intent では swarm バッチを使えない。よって全 Bolt を直列実行とする(swarm 有効化の恩恵は本 intent 着地後のワークフローから)。

## リスクと Bolt の対応

| リスク(raid-log) | 対処 Bolt |
|---|---|
| R1 payload 実機差異 | B2(live capture 駆動) |
| R2 Kimi 仕様変更 | B2(fail-open)+ B4(doctor probe・フロア) |
| R3 config 破壊 | B3(バックアップ・atomic・マーカー・除去) |
| 鮮度リスク(docs と実装の乖離) | B7 を最後に配置(実測に基づく記述) |
