# Unit of Work Dependency（260705-github-kanban-sync）

上流入力: [unit-of-work.md](unit-of-work.md)、[component-dependency.md](../application-design/component-dependency.md)、[components.md](../application-design/components.md)、[component-methods.md](../application-design/component-methods.md)、[services.md](../application-design/services.md)、[decisions.md](../application-design/decisions.md)、[requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)

## 依存関係（機械可読）

```yaml
units:
  - name: U001-registry-issues-field
    depends_on: []
  - name: U002-kanban-sync-cli
    depends_on: [U001-registry-issues-field]
  - name: U003-kanban-hooks
    depends_on: [U002-kanban-sync-cli]
```

## 依存グラフ

```
U001-registry-issues-field（P1）
        │  issues フィールドが IntentCard の入力になる
        ▼
U002-kanban-sync-cli（P2）
        │  FlushHook が CLI を child process で起動する（D-AD6）
        ▼
U003-kanban-hooks（P3）
```

直線依存であり、並行実行の余地はない。
team-assessment.md のとおり Claude セッションが直列に実行し、各 Unit の完了を Bolt PR とする。

## 人間操作との依存

| Unit | 前提となる人間操作 |
|---|---|
| U002 | `gh auth refresh -s project`（scope 付与）、org project「Amadeus Intents」の作成と amadeus repo へのリンク（C11、D-AD8） |
| U002 完了時 | board の実表示確認と auto-archive（FR-3.8）の有効化 |
| 全 Unit | Bolt PR の merge |
