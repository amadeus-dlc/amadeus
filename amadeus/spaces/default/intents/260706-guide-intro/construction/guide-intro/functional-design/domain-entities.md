# Domain Entities — guide-intro

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 章と記述対象の実体対応（照合台帳、3366cd69 基準）

| 章 | 記述対象 | 実体（正） | 実測値 |
|---|---|---|---|
| 00-introduction | ライフサイクル構造 | `.agents/amadeus/tools/data/stage-graph.json`、`.agents/amadeus/scopes/` | 32 stages、5 phases、10 scopes |
| 00-introduction | 公開入口と skill 体系 | AMADEUS.md、stage-catalog.md | 入口 = `amadeus` 1 個、補助 3、stage runner 29、shortcut 6、utility 3 |
| 00-introduction | 上流互換 | AMADEUS.md（構造・意味論互換 + nameMappings） | parity-map nameMappings = kind 10 系統・計 120 件（`dev-scripts/data/parity-map.json` 実測） |
| 01-getting-started | 導入コマンド | `scripts/amadeus-install.ts`、package.json | `bun run scripts/amadeus-install.ts --target` / `npm run amadeus:install --` |
| 01-getting-started | 導入されるもの | installer MANIFEST | engineDirs 7、amadeus* skills（.claude + .agents）、AMADEUS.md、hooks 配線 |
| 01-getting-started | 検証 | `amadeus-utility.ts doctor`、AmadeusValidator | 導入直後は shell 未 seed で 1 fail（初回 workflow で解消 = 実証済み） |
| 02-first-workflow | Birth | `amadeus-utility.ts intent-birth` | 実出力採取済み（poc scope、7 stages） |
| 02-first-workflow | conductor loop | `amadeus-orchestrate.ts next` / `report`、skills/amadeus/SKILL.md | run-stage directive（JSON）を code-generation で採取 |
| 02-first-workflow | 現在地・記録 | `amadeus-utility.ts status`、record ツリー（amadeus-state.md、audit/） | code-generation で採取 |

## 実測環境

- 隔離 workspace: scratchpad の `guide-ws/my-app`（git init 済み空プロジェクト。本番 `amadeus/` に触れない）。
- 採取済みログ: install-output.txt、doctor-output.txt（導入直後 = 1 fail / birth 後 = 0 fail）、birth-output.txt。

## 上流構成の参考範囲（NFR-2 の境界）

- 参考にするのは章の切り方（introduction / getting-started / first-workflow の導入順と番号付き命名）だけである。
- 本文・見出し構成・例は Amadeus 実体から独自に書く。上流章の本文は執筆時に開かない（逐語一致の混入を構造的に防ぐ）。
