# Domain Entities — U2 plugin-skeleton

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## エンティティ

- `PluginStageFile` — `{ readonly path: string; readonly slug: string }`(承認済み AD シグネチャどおり — Major 3 是正で無申告の pluginName 拡張を撤回。plugin 名が必要な場面は path から導出可能)。`discoverPluginStageFiles(hostRoot): PluginStageFile[]` が唯一の生成経路(frontmatter parse は既存の stage-schema 検証を再利用)
- `plugin.json`(宣言物)— `{ "name": "formal-model-check", "stages": [{ "slug": "formal-model-check", "path": "plugins/formal-model-check/stages/formal-model-check.md" }] }`(path はホストツリー相対の verbatim 着地先 — Critical 是正の規約。seams/fragments なし — sensor はコア供給のため)
- `stages/formal-model-check.md` frontmatter(宣言物)— slug: formal-model-check / phase: construction / execution: CONDITIONAL / scopes: [](stock scope 外 = opt-in)/ sensors: [model-completeness] / mode: inline
- 既存型の再利用: PluginManifest / StageCopy(plugin-composition.ts — 無改変 import)、GraphStage(amadeus-graph.ts — 拡張後も形状不変)

## 不変条件

- PluginStageFile.slug はコアステージ slug 集合および他 plugin slug 集合と素(compile が保証 — BR-U2-2)
- compile 出力の決定性: plugin ステージの合流順は path の辞書順(byte-reproducible)
- 0-plugin 時の compile 出力 = 拡張前 baseline(byte-identical — BR-U2-3)

## frontend-components.md について

本 Unit は plugin 宣言物+コア walk 拡張のみで UI を持たないため optional の frontend-components.md は生成しない(CONDITIONAL 非該当 — 全候補列挙 assert で不在確認)。
