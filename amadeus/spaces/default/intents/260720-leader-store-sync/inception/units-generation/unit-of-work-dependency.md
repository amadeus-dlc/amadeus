# Unit Dependency — 260720-leader-store-sync

上流入力(consumes 全数): requirements, components, component-methods, services, component-dependency, decisions, unit-of-work — U1 内部の依存は component-dependency.md のグラフ(C6→C1/C5/C4、port は services.md の2 runner)で閉包し、外部依存ゼロは decisions.md ADR-2(packages 非依存)と requirements.md の並行交差前提に依拠

## 依存グラフ(parseBoltDag 用 edge block)

```yaml
units:
  - name: leader-sync-tool
    depends_on: []
```

## 交差判定

単一 unit・外部依存なし。並行 intent(e1 #1279 engine 面 / e2 #1267 CLI 面 / e4 #1254 model 面)とはファイル単位非交差(scripts/amadeus-leader-sync.ts 新規+tests/ 新番号)— 実装着手前に実 diff 目録で再確認(B-4、bolt-plan 側で執行)。
