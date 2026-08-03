# Code Generation Plan — u5-agents-import

## スコープと公開 seam

対象は FR-3.1 / FR-3.3、C4、ADR-A6、BR-U5-1〜6 に限定する。公開 seam は `bun scripts/promote-self.ts --apply|--check --no-build` と、利用者が読む root `AGENTS.md` / `CLAUDE.md` / `.agents/rules/amadeus-codex-suffix.md` の byte 内容とする。UI、API、database、network、deployment artifact は存在しないため N/A。

u6 の先行成果である `packages/framework/core/tools/data/self-install-allowlist.ts` の正本 import、`preservedEntries(SELF_INSTALL_ALLOWLIST)`、`COMPOSED_SCOPE_RE` / `SCOPE_GRID_RE` / `PLUGIN_ENGINE_STATE_RE` / `STAGE_GRAPH_RE` の正本化は不変条件として維持する。

## 編集権威

- `AGENTS.md`: marker より前の既存手書き本文が編集権威。生成器は root を書かず、固定した2本の import と生成 suffix 不在を `--check` で検査する。
- `packages/framework/harness/claude/project-instructions.ts`: root `CLAUDE.md` の Project Instructions 節に対する唯一の編集権威。packager の source-reference guard と整合させるため、Claude manifest が harness metadata として re-export する。
- `.claude/CLAUDE.md`: root `CLAUDE.md` の残りの onboarding 本文に対する唯一の編集権威。
- root `CLAUDE.md`: 上記2正本の追跡投影であり、生成器は書かない。競合時は root を権威にせず、正本を修正してから root 投影を同期する。`--check` は byte 乖離を loud fail する。

## TDD 実装手順

- [x] **Step 1 — AGENTS import / suffix の Red**: FR-3.3 / BR-U5-2,5 に trace。既存 CLI seam の fixture test を、hand-authored prefix 保持、import 2本の exact 集合、dist import を除いた正規 suffix、未知・重複・欠落 import の drift 検出へ更新し、現行実装で失敗を実測する。
- [x] **Step 2 — AGENTS import / suffix の Green**: `composeRootAgents` と root `AGENTS.md` の expected write を廃止し、dist Codex AGENTS から `.agents/rules/amadeus-codex-suffix.md` を構成する最小実装を追加する。root `AGENTS.md` は手書き本文+2 import の追跡形へ一度だけ正規化し、生成 suffix / `dist/` は直接編集しない。
- [x] **Step 3 — CLAUDE 権威 / 復旧の Red→Green**: FR-3.3 / BR-U5-3,4 に trace。`PROJECT_INSTRUCTIONS` を harness 正本へ移し、root `CLAUDE.md` が `PROJECT_INSTRUCTIONS + .claude/CLAUDE.md` と byte 一致すること、片側の故意 drift が `--check` で赤になること、`--apply` が root を修復・上書きしないことを公開 seam で検証する。
- [x] **Step 4 — 冪等性 / 原子性の Red→Green**: NFR-2 / reliability-design に trace。`--apply` 二重実行後の対象 byte が同一であること、suffix 更新が temp write + rename の既存 distribution transaction を通ること、rename 前の注入失敗で既存 suffix byte が保持されることを検証する。失敗は non-zero で loud に返す。
- [x] **Step 5 — check mode / 回帰検証**: BR-U5-1,5 / Comprehensive 戦略に trace。root `AGENTS.md` / `CLAUDE.md` と generated suffix の各 drift 検出、既存 promote-self 回帰 suite、u6 t416 suite、typecheck、lint、対象 Biome、`git diff --check` を実行する。performance/security は承認 NFR に実在境界がないため追加しない。
- [x] **Step 6 — 成果物と commit**: 全実測値を日本語 `code-summary.md` に記録し、本 plan の checkbox を実績どおり更新する。実装・test・plan・summary の指定 path だけを stage し、英語 Conventional Commit で commit する。

## 完了条件

1. `promote-self --apply` は root `AGENTS.md` / `CLAUDE.md` を一切書かない。
2. root `AGENTS.md` は手書き本文と exact 2 import のみ、Codex suffix は未追跡先へ正規化される。
3. root `CLAUDE.md` の編集権威と復旧経路が機械検査で一意になる。
4. apply の再実行が byte-identical で、rename 前失敗時に既存 suffix が保持される。
5. u6 の allowlist / preserved / regex 正本化に退行がない。
