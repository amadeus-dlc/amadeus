# Code Generation Plan — pdm-scope（Issue #429）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 計画（定型手順 + TDD）

1. scope 定義: `.agents/amadeus/scopes/amadeus-pdm.md`（frontmatter + Why / Membership）を新規作成する（R001）。
2. membership: EXECUTE 12 ステージの frontmatter `scopes:` へ `pdm` を追記し、`amadeus-graph.ts compile` で scope-grid.json を再生成する（R002 / R003。手編集しない）。
3. scope 表: `amadeus-utility.ts scope-table` の出力を skills/amadeus/SKILL.md のマーカー間へ反映し、`promote-skill.ts amadeus --replace` で昇格する（R004。scope-table --check は上流レイアウト前提の既定パスで本 repo 未結線のため、表の同期は本手順で行う）。
4. validator: `lifecycle-v2.ts` の scopeValues と 9 post-init ステージの scopes 配列へ `pdm` を追加し、`promote-skill.ts amadeus-validator --replace` で昇格する（R005。reviewer Major 指摘 = grid 自動追従の仮説は誤り）。
5. docs: `docs/amadeus/lifecycle/scopes.md` を 10 scope へ更新する（R006）。
6. parity: 例外 14 件（stage 12 + scope-grid.json + stage-graph.json）を宣言する（N3。上流に pdm が無いための意図的適応。追跡は #428）。
7. eval: `dev-scripts/evals/pdm-scope/check.ts`（8 検査）。RED 確認は「pdm 追加前は Unknown scope で birth が拒否される」既存挙動（追加前の実行で確認済み）。
