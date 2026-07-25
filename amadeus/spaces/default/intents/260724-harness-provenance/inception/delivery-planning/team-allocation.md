# Team Allocation — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, mockups.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

## 割当

| Bolt | Unit | Owner | Support / Gate |
|---|---|---|---|
| Bolt 1: `harness-provenance` | `harness-provenance` | `amadeus-developer-agent` | 設計整合はarchitect、検証はquality、walking-skeleton gateはユーザー |

team-formation はsolo developerのためnamed mobを作らず、単一ownerへ割り当てる。unit-of-work.md と unit-of-work-dependency.md も単一Unit・外部Unit依存なしであり、Program Boardや複数mob間調整は不要である。

## 責務境界

- **Developer owner**: components.md のDetector/Recorder/Field Reuseとprovenance付きresolverを実装し、requirements.md のFR-1〜FR-4とstories.mdの利用シナリオを満たす
- **Architect support**: unit-of-work-story-map.md の要件トレース、resolverの依存方向、canonical mapping、既存`harnessDir()`互換性に未申告のApplication Design逸脱がないことを確認する
- **Quality support**: mockups.md のCLI出力契約、全6配布形態のAC-3d統合検証、resolver分岐、invalid override、memory template不変、typecheck/lintを検証する
- **Delivery responsibility**: team-practices.md の正本→dist/self-install再生成手順とドリフト検査を完遂する
- **Human gate**: walking skeletonのexpected demoを確認して承認または差戻しを判断する

## キャパシティ

Boltは一つだけで相対複雑度`M`。並列mobを増やすより、一人のownerが正本変更から生成物検証まで一貫して担当する方が手戻りと統合リスクを抑えられる。
