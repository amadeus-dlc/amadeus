# Code Summary — pdm-scope（Issue #429）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更内容

| ファイル | 変更 | 対応 |
|---|---|---|
| `.agents/amadeus/scopes/amadeus-pdm.md` | 新規 scope 定義（depth: Standard、keywords: pdm / prd / product-discovery） | R001 |
| stage frontmatter 12 ファイル + `tools/data/{scope-grid,stage-graph}.json` | `pdm` タグ追記と compile 再生成 | R002 / R003 |
| `skills/amadeus/SKILL.md` + 昇格先 | scope 表へ pdm 行（12 / 32） | R004 |
| `skills/amadeus-validator/validator/lifecycle-v2.ts` + 昇格先 | scopeValues + 9 ステージの scopes 配列へ pdm | R005 |
| `docs/amadeus/lifecycle/scopes.md` | 10 scope 化 + pdm 行 + パリティ例外の明記 | R006 |
| `dev-scripts/data/parity-map.json` | engineFileExceptions 14 件 | N3 |
| `dev-scripts/evals/pdm-scope/check.ts` + `package.json` | 8 検査の eval を `test:it:all` へ結線 | N1 / AC4 / AC6 |

## 検証の記録

- eval 8 検査 ok: grid 定義（EXECUTE 12 / 他 SKIP）、実 CLI birth（IDEATION 開始、SKIP 注釈、EXECUTE 注釈）、validator の pdm 検査有効性（produces 欠落の fail 検出）。
- `npm run test:all` exit 0（parity:check ok、promote-skill eval ok を含む）。
- 誕生時の SKIP は checkbox 注釈（— SKIP）で表現され [S] 遷移は進行時、という既存契約を eval に明文化した。
