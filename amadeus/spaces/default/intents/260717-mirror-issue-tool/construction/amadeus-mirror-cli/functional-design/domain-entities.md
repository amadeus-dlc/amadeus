# Domain Entities — amadeus-mirror-cli

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## エンティティ(functional-domain-modeling-ts: type+判別ユニオン、クラス不使用)

- **MirrorSnapshot**(component-methods.md C2 の型が正)— 3ソース合成の検証済みスナップショット。parse-don't-validate: buildSnapshot が検証と構築を一体で行い、無効状態(dirName 不明・state 不在)は SnapshotOutcome.error として表現不能化
- **ArgsOutcome / SnapshotOutcome / GhResult** — 判別ユニオン Result(component-methods.md が正本。本書は重複定義しない — 意図ベースの重複排除)
- **ライフサイクル**: MirrorSnapshot は各コマンド実行ごとに使い捨て(キャッシュなし — 冪等性と鮮度を単純化)

## フロントエンド

CLI のみ(UI なし)— frontend-components.md は CONDITIONAL 不適用のため生成しない(services.md の N/A 根拠と同一)。
