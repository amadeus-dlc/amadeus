# Unit of Work Dependency — election-ts-foundation

> 上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

## 依存 DAG(トポロジーのみ — 実装順序の推奨は delivery-planning が決める)

component-dependency.md の C 依存(C2/C3/C4/C5→C1、C6→全、C7→C6)をユニット面へ写像:

- U1 election-model: 依存なし(純関数コア)
- U2 election-store → U1(Election/Ballot 型を I/O が消費)
- U3 election-record → U1(TallyResult・票集合から記録生成。requirements.md FR-5a の parseGoaLine byte 互換は既存読み側へのテスト時依存であり unit 間辺ではない)
- U4 election-transport → U1(ShortNotification と DeliveryRecord の型)
- U5 election-cli → U1, U2, U3, U4(指令ループが全部品を配線 — decisions.md ADR-3)
- U6 election-skill → U5(SKILL は CLI の指令ループを転送するだけ — FR-8)

```yaml
units:
  - name: election-model
    depends_on: []
  - name: election-store
    depends_on: [election-model]
  - name: election-record
    depends_on: [election-model]
  - name: election-transport
    depends_on: [election-model]
  - name: election-cli
    depends_on: [election-model, election-store, election-record, election-transport]
  - name: election-skill
    depends_on: [election-cli]
```

サイクルなし(全辺が U1 方向または U5→U6 の一方向 — 上記 edge block と一致)。

## 統合点(契約)

| 契約 | 提供 | 消費 | 形 |
|---|---|---|---|
| 選挙ドメイン型(Election/Ballot/TallyResult 等) | U1 | U2/U3/U4/U5 | TS 型 export(判別ユニオン Result — services.md 非提供境界の内側) |
| elections/<ID>/ ファイル様式 | U2 | U3/U5 | store API 経由のみ(直接 fs 触りは U2 に閉じる) |
| 指令 JSON スキーマ(next 出力) | U5 | U6・機械実行器 e2e | stdout=directive 契約(component-methods.md C6) |
| ShortNotification | U4 | U5 | 型として質問文・選択肢フィールドを持たない(FR-2a) |

## 並行開発機会

- {U2, U3, U4} は相互に依存なし — U1 完了後に3並行可(複数の妥当なトポロジカル順序が存在)
- U5・U6 は直列(U5 は4ユニット合流点、U6 は U5 依存)
