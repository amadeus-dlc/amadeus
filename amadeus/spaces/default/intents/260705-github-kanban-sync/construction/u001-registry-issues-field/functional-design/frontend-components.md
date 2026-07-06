# Frontend Components — u001-registry-issues-field

上流入力: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md)

## 適用判断

U001 にフロントエンドコンポーネントは存在しない。

U001 は `intents.json` へのスキーマ追加（データのみ）であり、UI を持たない。
`issues` の表示先は U002 が反映する GitHub Projects v2 のカード（Issue フィールドと本文リンク）であり、本 Intent は独自 UI を実装しない（services.md、feasibility-assessment.md の実装先制約）。
本文書は「不適用の成果物は空ファイルにせず、適用判断と根拠を記す簡潔な文書にする」という repo の慣行（project.md Testing Posture の学びと同じ精神）に従って残す。
