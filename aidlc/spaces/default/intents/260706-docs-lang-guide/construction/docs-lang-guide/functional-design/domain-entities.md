# Domain Entities — docs-lang-guide

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 拡張ポイント（extension-guide の使い分け表の実体）

| 拡張ポイント | 場所 | 役割 | 人間直接編集 | 実測アンカー |
|---|---|---|---|---|
| memory 3 層 | `aidlc/spaces/<space>/memory/{org,team,project}.md` | チームの働き方・判断基準・制約（プラクティス本体）。org → team → project の上書き | 可（Maintainer の指示チャネル。規律は BR-7） | amadeus-graph.ts（compile が rules_in_context へ焼き込む）+ 本 record の実 directive |
| phase 防護規定 | `aidlc/spaces/<space>/memory/phases/<phase>.md` | phase 単位の防護規定。該当 phase の stage にだけ注入 | 可（同上） | amadeus-graph.ts（phase 宣言を持つ stage への注入） |
| templates 上書き | `aidlc/spaces/<space>/memory/templates/` | 成果物テンプレートの上書き（skill 同梱より優先） | 可 | stage-protocol.md の template resolution（team template が第 1 優先）、amadeus-sensor-required-sections.ts の OVERRIDE tier |
| knowledge | `aidlc/spaces/<space>/knowledge/`（glossary / domain-map / context-map / actors） | ドメイン知識 | 可能だが domain-modeling skill 経由が安全（#527 pending-note） | steering.md（Space 契約） |
| codekb | `aidlc/spaces/<space>/codekb/<repo>/` | コードベース知識（生成物） | 不可（生成経由が正 = reverse-engineering の増分更新） | 本 Intent を含む増分更新の前例、codekb/amadeus/timestamp.md |
| scopes | `.agents/amadeus/scopes/amadeus-<name>.md` | ステージ集合の変更（1 scope 1 ファイル + stage frontmatter + recompile） | workspace 外（リポジトリ変更 + parity 宣言。pdm が Amadeus 独自の実例 → #524 pending-note） | scopes/ 実ファイル、scope-grid.json |
| sensors | `.agents/amadeus/sensors/` + stage frontmatter `sensors:` | gate 時の決定論的検査の追加 | workspace 外（リポジトリ変更） | sensor 実装群、audit の SENSOR_FIRED |
| docs-only 宣言 | registry（`intents.json`）の docsOnly フィールド | 成果物が record 内文書だけの Intent で workspace_requires ガードを免除（Amadeus 独自 #499 → #524 pending-note） | 不可（tool-owned。`amadeus-state.ts declare-docs-only --evidence` のみ。evidence は人間承認 audit イベントの実在照合つき） | amadeus-state.ts の declare-docs-only / verifyStageArtifacts、audit の GUARD_EXEMPTED |
| composer | （2.2.0 取り込み後） | custom scope の作成 | 検討中注記（#428 merge 前のため実測不能 = O-1） | — |

## 文書実体（本 Intent の成果物）

| 実体 | path | 言語 |
|---|---|---|
| 言語方針（正） | `docs/amadeus/language-policy.md` | 英語 |
| 言語方針（日本語版） | `docs/amadeus/language-policy.ja.md` | 日本語 |
| 拡張ガイド（正） | `docs/amadeus/extension-guide.md` | 英語 |
| 拡張ガイド（日本語版） | `docs/amadeus/extension-guide.ja.md` | 日本語 |
| 参照編集 | `AMADEUS.md`、`docs/amadeus/skill-language-policy.md`、`docs/amadeus/steering.md`、`README.md` | 既存言語のまま |
