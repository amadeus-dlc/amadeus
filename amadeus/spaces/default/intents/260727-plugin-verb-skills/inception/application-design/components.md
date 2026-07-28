# Components — 260727-plugin-verb-skills

上流入力(consumes 全数): requirements.md(FR-1〜5)、architecture.md(plugin CLI 動詞体系・ホストルート統一・#1598 機序)、component-inventory.md(実行系/検証系コンポーネント棚卸し)、team-practices.md(正本同期・usage 三重定義・in-process seam の適用表)

## コンポーネント一覧(変更面と規模見積り)

| # | コンポーネント | 変更種別 | 対応 FR | 規模見積り(行) |
|---|---|---|---|---|
| C1 | plugin CLI `install` verb(`packages/framework/core/tools/amadeus-plugin.ts`) | 拡張 | FR-1 | +120〜170(parse+handle+copy 冪等化+USAGE+render) |
| C2 | utility `plugin` case(`packages/framework/core/tools/amadeus-utility.ts`) | 拡張 | FR-2 | +25〜40(委譲 case+usage 2面) |
| C3 | `amadeus-plugin` スキル(`packages/framework/core/skills/amadeus-plugin/SKILL.md` 新設+manifest 7面) | 新設 | FR-3 | +90〜110(SKILL)+7 manifest 各1〜3行 |
| C4 | runner-gen plugin 対応(`packages/framework/core/tools/amadeus-runner-gen.ts` ※正本所在は実装時確認 — RE 実測では `.claude/tools/` と dist 全面に実在)+plugin CLI からの起動配線 | 拡張 | FR-4 | +60〜90(plugin 識別+生成/prune 拡張)、CLI 側 +15〜25 |
| C5 | 投影・docs(`scripts/plugin-projection.ts` installDoc 文言、`docs/guide/19-plugins.md/.ja.md`) | 更新 | FR-5 | 生成器 +10〜20、docs 各 +15〜30 |
| C6 | テスト(t301 系 unit 拡張・runner-gen fixture・t341 系 E2E 拡張) | 拡張/新設 | FR-1f/2d/4d + スキル検査 | +340〜540 |

合計見積り: 正本 +320〜455 行、テスト +340〜540 行(per-Unit 再見積りの機械加算 = U1 60〜100 + U2 120〜180 + U3 120〜180 + U4 40〜80。改訂履歴は unit-of-work.md 精密化節を正とする)。intent の規模バジェット超過なし(単一機能面の凝集変更)。

## Reuse Inventory(新規機構を作らない根拠 — 書く前の対称 grep 済み)

| 再利用資産 | 所在(RE 実測) | 用途 |
|---|---|---|
| 委譲 case 様式 | `handleMigrate`(amadeus-utility.ts:5900-5929) | C2 の唯一の既習先例(spawnSync・透過・exit 伝播) |
| in-process seam | `handlePluginCli`(amadeus-plugin.ts:674-676) | C1/C2 テストの被覆経路 |
| 判別 union+deps seam | `PluginCliResult`(:87-94)/`PluginCliDeps`(:159-174) | C1 の結果契約と I/O 注入 |
| ホストルート解決 | `defaultPluginHostRoot:293-297`/`pluginSourceRootOf:329-331` | C1 のコピー先解決(新設しない) |
| 2段 recompile | `spawnRecompile:253-263` | C1 の compose 委譲後の graph 反映(C4 の起動点にも同型 spawn を併置) |
| runner テンプレート | `renderStageRunner`(amadeus-runner-gen.ts:118-163)/`pruneOrphanRunners:342-356` | C4 — テンプレートを複製せず正本1定義から生成 |
| スキル様式+投影 | amadeus-mirror(SKILL.md 94行、7面 manifest 投影) | C3 の雛形と投影行列 |
| INSTALL 生成器 | `plugin-projection.ts installDoc:581-`(3クラス) | C5 の文言正本 |

新規の機構・ジョブ・デーモン・adapter 先行着地: なし(inception.md N3 準拠)。

## コンポーネント境界

- C1〜C2 は core/tools(全ハーネス投影)— harness 専用物なし(harness-tools-placement 準拠)
- C3 は core/skills 正本+manifest 投影(ハーネス表層はバイト同一)
- C4 は runner-gen(全ホスト出荷済みを実測)への拡張であり、ホスト固有ロジックを plugin CLI に複製しない
- trust 境界は不変: C1 は staging コピー+既存 compose 委譲のみ(FR-1b、C6 制約)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T16:13:33Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の指摘3件(Major: ADR-1 の実行不能な path 縮退案 / Minor: isRunnerSkill 引用・drop 側配線の暗黙)がすべて閉包。ADR-1 は graph フィールド焼き込みを確定主案、縮退先を CompositionRecord.ownedPaths(amadeus-plugin-compose.ts:557,706,1079 実在確認)へ是正済み。component-methods/component-dependency の compose/drop 対称配線も明記済み。残存指摘なし。

### Findings

- None
