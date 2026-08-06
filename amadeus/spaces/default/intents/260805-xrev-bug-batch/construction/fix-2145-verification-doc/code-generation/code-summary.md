# Code Summary — fix-2145-verification-doc

上流入力(consumes 全数): requirements.md（FR-4）, code-generation-plan.md

- Bolt branch: `bolt-fix-2145-verification-doc`、コミット `4c2416cff`
  （`docs(knowledge): point verification.md at the real record layout`、base `1043b7e67` から1コミット）
- 変更: `packages/framework/core/knowledge/amadeus-shared/verification.md`（+2 / −2）
  — `:15` / `:25` の `amadeus-docs/` 参照を `<record>/verification/phase-check-<phase>.md` 系の実配置へ是正。
  `[phase]` → `<phase>` のプレースホルダ表記も同2行の直接依存断片として是正（builder が逸脱でない読みを申告、conductor 追認）。

## 検証（builder 報告値の転記、各コマンド自身の exit code）

| コマンド | exit |
|---|---|
| `git grep -n 'amadeus-docs/' packages/framework/core/knowledge/amadeus-shared/verification.md` | 1（= 0 hit、FR-4d 充足） |
| `bun run build` → `git status --porcelain` | 0 — 追跡変更は編集対象1件のみ |
| `bun run typecheck` | 0 |
| `bun run lint` | 0（警告は全て既存） |
| `bun test tests/unit/t15-knowledge-file-inventory.test.ts tests/integration/t36-stage-protocol-governance.test.ts --timeout=30000` | 0 — 27 pass / 0 fail |
| `bun run source-only:check` | 0 |
| `bun run distribution:check` | 0 |

- 消費テストの特定は `grep -rln 'verification.md' tests/` の全数（t15 / t36 の2件、いずれも行内容をピンしない）。
- TDD 適用外（文書のみ、team.md 例外 (1)）。落ちる実証も適用外（ゲート・検証スクリプトの新設なし）。
- `traceability.md` の参照は core 全域で当該ファイルのみ — 競合契約なし（builder 実測）。
- 逸脱: なし。同根の stale トークン（sensor manifest 4件・knowledge 3件）は指示どおり未接触（FR-4c、別 Issue）。

## 残作業（conductor 所有、PR 発行時）

- FR-4b: Issue #2145 へ受け入れ条件書き直しコメント + `bug`→`documentation` ラベル変更 + S ラベル除去
- FR-4c: 同根別 Issue の起票
