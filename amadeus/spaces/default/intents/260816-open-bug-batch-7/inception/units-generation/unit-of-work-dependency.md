# Unit of Work Dependency — 260816-open-bug-batch-7

## 依存 DAG

unit 間の依存エッジは **0 本**(3 unit とも独立)。根拠: codekb `code-structure.md` の patch surface 配置実測(3 領域はファイル交差ゼロ)と application-design `component-dependency.md`。トポロジーとして 3 unit は任意順・並行の両方が可能(順序の選定は 2.8 delivery-planning の経済判断)。

```yaml
units:
  - name: pi-distribution
    kind: packaging
    depends_on: []
  - name: nsd-provenance
    kind: library
    depends_on: []
  - name: sensor-docs-sync
    kind: spec
    depends_on: []
```

## 統合点

- unit 間の API・共有データ・イベントの統合点はなし
- 唯一の間接共有面は横断台帳(`tests/.coverage-registry.json` 等)で、各 unit の PR が自変更分を個別 resync する(application-design `component-dependency.md` の共有資源節)

## 並行開発機会

3 unit すべてが相互独立の並行候補(トポロジカル順序が複数存在する最大形 — 全順列 6 通りが有効)。
