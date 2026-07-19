# Risk & Sequencing Rationale — election-ts-foundation

> 上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## 順序決定の根拠(Q1=A 裁定)

1. **最大リスクは FR-0(指令ループの成立)**: 本 intent の価値仮説は「選挙手順の知識を AI から TS へ移せる」こと(requirements.md FR-0)。この仮説が壊れると全 FR の実装価値が毀損するため、Bolt 1 のスケルトン縦スライスで最初に e2e 実証する(risk-first)。unit-of-work-story-map.md で FR-0 は U5/U6 に割当てられているが、成立実証には U1/U2 の最小核が必要 — 縦スライスが最短経路
2. **Bolt 2 を U1 完全化に充てる理由**: GoA 集計・fail-closed 検証は選挙規則の正本(components.md — C1 に規則を凝集)であり、以降の全ユニットの型契約の土台。早期確定でBolt 3 の3並行の手戻りを抑える
3. **Bolt 3 の並行**: U2/U3/U4 は DAG 上相互独立(unit-of-work-dependency.md 並行開発機会)— リソース効率優先(team-practices.md)で並行し、リードタイムを短縮
4. **Bolt 5 を最後に分離**: U6 の禁止語彙検査・実演は U5 の指令スキーマ確定後でないと固定できない(検査対象の SKILL 本文が指令転送ループを記述するため)

## リスク台帳(実装 intent への申し送り)

| リスク | 影響 | 緩和 |
|---|---|---|
| R-1: 指令ループが選挙の人間裁定点(hold)と噛み合わない | FR-0 の AC 不成立 | Bolt 1 スケルトンで hold 分岐まで最小実証してからゲート |
| R-2: parseGoaLine byte 互換の解釈違い | FR-5a AC 赤・蒸留ラウンド下流破壊 | round-trip テストを Bolt 3(U3)の最初に書く(NFR-4: 互換不能が判明したら実装前停止→裁定) |
| R-3: agmsg spawn の環境差(bun-spawn-env-snapshot 既知クラス) | U4 の integration テスト偽赤 | env: process.env 明示を設計済み(component-methods.md C5)。CI(Linux)差は Bun 実装差クラスの既知ノルム群を適用 |
| R-4: SKILL 禁止語彙検査の語彙衝突(vocabulary-collision) | 検査の無音空文化 | vacuity guard テストを AC に内包(requirements.md FR-8a)+机上トレースを設計時に実施 |
| R-5: 実装 intent 起動時に本プランと実コード状態が乖離(main 前進) | Bolt 見積り・交差判定の陳腐化 | 実装 intent の RE 差分リフレッシュ(rescan-base-ancestry)で再接地してから Bolt 1 着手 |
