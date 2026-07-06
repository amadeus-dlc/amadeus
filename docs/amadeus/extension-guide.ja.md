# Extension Guide（拡張ガイド）

この文書は、自分の workspace で Amadeus DLC を運用する人が繰り返し抱く疑問に答える。ライフサイクルを拡張・ステアリングしたいとき、`amadeus/spaces/<space>/` 配下（一部の Amadeus 独自拡張ポイントは workspace の外）の何を編集すればよいか、そして人間が直接手で編集してよいかを扱う。

Amadeus をこれから使い始める場合は、拡張の前に[利用者ガイド](../guide/index.ja.md)（導入と最初の workflow）から読み始める。

## スケール原理

stage 定義が持つのは「何をやるか」だけである。宣言された `phase`、`produces`、そして stage の目的を説明する stage protocol の本文がそれにあたる。特定のチームやプロジェクトに向けた「どうやるか」は stage 定義には持たせず、Space の `memory/` が担い、compile 時に解決・注入される。

stage-graph compiler の rule resolver である `resolveRulesForStage`（`.agents/amadeus/tools/amadeus-graph.ts:599-612`）は、読み込んだ rule ファイルから各 stage の `rules_in_context` を組み立てる。scope が `org` / `team` / `project` の rule はすべての stage へ無条件に付与され、scope が `phase` の rule は、そのファイル名が stage 自身の宣言する `phase:` 値と一致する場合だけ付与される。つまり `memory/org.md`、`memory/team.md`、`memory/project.md` はすべての stage に届き、`memory/phases/<phase>.md` はその phase を宣言した stage にだけ届く。Construction の stage は `memory/phases/construction.md` を受け取るが `memory/phases/ideation.md` は受け取らない。

これが、同じ 32 stage 定義（`.agents/amadeus/amadeus-common/stages/**`。コンパイル済み `scope-grid.json` が対応する）がまったく異なるチームやプロジェクトに使い回せる理由である。stage protocol は固定であり、各 stage の防護規定と作業規約を変える梃子は `memory/` が担う。

## 拡張ポイント

| 拡張ポイント | 場所 | 役割 | 人間直接編集 | 実測アンカー |
|---|---|---|---|---|
| memory 3 層 | `amadeus/spaces/<space>/memory/{org,team,project}.md` | チームの働き方・判断基準（org → team → project の順で上書き） | 可（Maintainer の直接指示チャネル。規律は次節） | `amadeus-graph.ts:599-612`（`resolveRulesForStage`） |
| phase 防護規定 | `amadeus/spaces/<space>/memory/phases/<phase>.md` | phase 単位の防護規定。その phase を宣言した stage にだけ注入される | 可（同上） | `amadeus-graph.ts:607`（phase 一致判定の分岐） |
| templates 上書き | `amadeus/spaces/<space>/memory/templates/` | 生成成果物のテンプレートを上書きする。skill 同梱のテンプレートより優先される | 可 | stage-protocol.md:741-746（team template が第 1 優先層）、`amadeus-required-sections.md:38-62`（gate 時、template-override 層が stage 内 `## Sensors` 上書きより優先） |
| knowledge | `amadeus/spaces/<space>/knowledge/`（`glossary.md`、`domain-map.md`、`context-map.md`、`actors.md` 等） | ドメイン知識 | 直接編集も可能だが、`glossary.md` / `domain-map.md` / `context-map.md` の整合を保つには `amadeus-domain-modeling` skill 経由が安全（`CONTEXT.md` が正準の語彙定義元であり、`glossary.md` はその workspace 抜粋である。詳細は #527） | steering.ja.md（Space 契約） |
| codekb | `amadeus/spaces/<space>/codekb/<repo>/` | コードベース知識（生成物） | 不可。手編集ではなく増分の reverse-engineering 更新で再生成する | 本 Intent 自身の増分 codekb 更新、`amadeus/spaces/default/codekb/amadeus/timestamp.md` |
| scopes | `.agents/amadeus/scopes/amadeus-<name>.md` | ワークフローが実行する stage 集合を変える（1 scope 1 ファイル + stage frontmatter + recompile） | workspace 外（リポジトリ変更 + parity 宣言。`pdm` は上流に対応のない Amadeus 独自 scope の実例。機能差の一覧は #524 pending） | `.agents/amadeus/scopes/amadeus-pdm.md`、`.agents/amadeus/tools/data/scope-grid.json` |
| sensors | `.agents/amadeus/sensors/` + stage frontmatter の `sensors:` | gate 時の決定論的検査を追加する | workspace 外（リポジトリ変更） | `.agents/amadeus/sensors/` 配下の sensor manifest、audit の `SENSOR_FIRED` |
| docs-only 宣言 | registry（`intents.json`）の `docsOnly` フィールド | 成果物が record 内文書だけの Intent を `workspace_requires` ガードから免除する（Amadeus 独自 #499。詳細は #524 pending） | 不可。tool-owned であり `amadeus-state.ts declare-docs-only --evidence <ref>` だけが書き込め、evidence は実在する人間承認 audit イベントと突き合わせて検証される | `.agents/amadeus/tools/amadeus-state.ts:83-89`（`HARNESS_DOC_DIRS`）、`:897-903`（`workspaceHasWork`）、`:923-949`（`declare-docs-only` の拒否 / `GUARD_EXEMPTED`） |
| composer | （上流 2.2.0 取り込み後に利用可能になる） | custom scope の作成 | 検討中。上流 #428 が未 merge のため、実装に基づく実測ができない | — |

## 人間編集の規律

`memory/` は Maintainer の直接指示チャネルであり、手編集を前提とする。次の 2 点の規律が適用される。

1. 新しい判断基準の追記は、推測によるルールではなく観察済みの実例に根拠がある場合だけ行う（`team.md` 自身が掲げる原則）。
2. stage の `Corrections` 節への追記は、`learned` 形式と `cid:<dirName>:<stage>:<cN>` の形の `cid` marker を併用する（#504 修正後に導入された形式）。これはエンジンが §13 の learning ritual で追記するエントリと共存し、競合しない。

`knowledge/` も直接編集を受け付けるが、`glossary.md`・`domain-map.md`・`context-map.md` 相互の整合を保つには `amadeus-domain-modeling` skill 経由の方が安全である。開発リポジトリ自身のドメイン語彙は `CONTEXT.md` が正準の定義元であり、`glossary.md` はその workspace 抜粋を一方向で同期したものにすぎない（#527）。

`codekb/` は生成物である。手編集ではなく再生成（増分の reverse-engineering 更新）で編集する。手編集は次回の再生成で無言のまま上書きされ、対象コードベースの実態を反映しなくなる。

## 設計判断の由来

かつて `docs/adr/` にあった構造的判断のうち有効な 2 点は、そこから退役し、本リポジトリの現行の成果物契約へ統合した（#525）。詳細な経緯は git 履歴に残す（`git log -- docs/adr/0001-lifecycle-binding-profile.md`、`git log -- docs/adr/0002-intent-phase-directory-layout.md`）。

**Lifecycle Binding / Profile**（2026-06-28 採用。旧 ADR 0001）：Amadeus DLC は、DLC の phase ごとに skill、成果物、gate、validator を接続する概念を Lifecycle Binding と呼び、特定領域向けにその接続を具体化した束を Profile と呼ぶ（本リポジトリが実装する software-development profile はその一例）。Agent Skills、Agent Plugin、MCP はそれぞれ別の拡張境界であり、skill は個別能力の単位、plugin は配布・インストールの単位、MCP は外部の tools/resources/prompts を接続する層であって、いずれも DLC の phase・gate・成果物契約そのものではない。この語彙（Lifecycle Binding、Profile）は、いまは `CONTEXT.md` が直接持つ定義である。

もう 1 つの退役判断である **Intent Phase Directory Layout**（旧 ADR 0002）は、その契約を所有する [lifecycle/overview.ja.md](lifecycle/overview.ja.md) の「成果物配置」節に記述している。

以降の判断記録の置き場は、Intent record 自身の decision、Grilling Decision Trail、steering の根拠表であり、リポジトリ横断の ADR 体系ではない（#527）。

## 出典

本ガイドの執筆にあたり、次のアンカーを本リポジトリの実ソースから直接確認した（Design Honesty。記憶からの断定はしていない）。

- `rules_in_context` への rule 解決: `.agents/amadeus/tools/amadeus-graph.ts:599-612`（`resolveRulesForStage`）。
- template 解決順（team template が第 1 優先、skill 同梱が第 2 優先）: `.agents/amadeus/amadeus-common/protocols/stage-protocol.md:741-746`。
- gate 時の template-override 優先順位: `.agents/amadeus/sensors/amadeus-required-sections.md:38-62`。
- Space 側の template 作成ガイダンス: `.agents/rules/amadeus-artifacts-and-examples.md`（生成前チェック節）。
- docs-only ガードの実装: `.agents/amadeus/tools/amadeus-state.ts:83-89`、`:897-903`、`:923-949`。
- Space 契約（`memory/`、`knowledge/`、`codekb/`、`intents/`）: [steering.ja.md](steering.ja.md)。
- Amadeus 独自 scope の実例: `.agents/amadeus/scopes/amadeus-pdm.md`。コンパイル済み grid: `.agents/amadeus/tools/data/scope-grid.json`。
- codekb 再生成の前例: `amadeus/spaces/default/codekb/amadeus/timestamp.md`。

出典候補のうち 1 件は検証で裏付けが取れなかった。本ガイドが属する Intent 自身の record（`amadeus/spaces/default/intents/260706-docs-lang-guide/runtime-graph.json`）を、compile 済み `rules_in_context` の実例として使えないか確認したが、実際に記録されているのは stage 実行のサマリー（memory エントリ数、sensor firing、learnings）だけであり、stage ごとの `rules_in_context` 配列は含まれていなかった。上記の仕組みは、この record ではなく compiler の実ソースに対して検証した。
