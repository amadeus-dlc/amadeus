# Unit of Work Story Map（260705-github-kanban-sync）

上流入力: [unit-of-work.md](unit-of-work.md)、[stories.md](../user-stories/stories.md)、[requirements.md](../requirements-analysis/requirements.md)、[components.md](../application-design/components.md)、[component-methods.md](../application-design/component-methods.md)、[services.md](../application-design/services.md)、[component-dependency.md](../application-design/component-dependency.md)、[decisions.md](../application-design/decisions.md)

## 対応表

| Unit | Stories | FR | NFR |
|---|---|---|---|
| u001-registry-issues-field | US-1 | FR-1.1〜1.3 | N4、N5 |
| u002-kanban-sync-cli | US-2、US-3、US-4、US-5 | FR-2.1〜2.3、FR-3.1〜3.7、FR-4.1〜4.2 | N1、N3、N4、N5 |
| u003-kanban-hooks | US-6 | FR-5.1〜5.4 | N2、N3、N4、N5 |

## カバレッジ確認

- US-1〜US-6 はすべて 1 個の Unit に属する（重複割当なし、orphan なし）。
- FR-3.8（auto-archive、Should）は Unit 外（人間設定。unit-of-work.md「Unit にしないもの」）。
- Issue #470 の受け入れ条件 6 件は、stories.md の対応（条件 1・3・6 = US-2、条件 2 = US-3、条件 4・5 = US-6）を通じて U002 / U003 で満たされる。
