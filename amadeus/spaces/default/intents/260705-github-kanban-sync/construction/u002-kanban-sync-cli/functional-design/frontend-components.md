# Frontend Components — u002-kanban-sync-cli

上流入力: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md)

## 適用判断

U002 に独自フロントエンドは存在しない。

表示は GitHub Projects v2 の標準 UI（Board view + Table view）に全面依拠する（rough-mockups/wireframes.md で確定済み、アクセシビリティ注記も同文書にある）。
U002 が担う「見た目」への関与は、ensureFields による列・フィールドの初期構築と、カード表面に出すフィールド値の書き込みだけである。

## 根拠

表示要件（列、フィールド、Table view 併用、アクセシビリティ）は rough-mockups/wireframes.md で確定済みであり、U002 の実装対象は書き込み側だけである。
本文書は不適用の判断と根拠を記す簡潔な文書として残す（repo の慣行）。
