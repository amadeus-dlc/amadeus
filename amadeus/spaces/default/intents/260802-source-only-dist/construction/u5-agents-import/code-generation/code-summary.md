# Code Summary — u5-agents-import

## 結果

root `AGENTS.md` と root `CLAUDE.md` を self-promotion の書き込み対象から外し、正本への import / byte 一致を `--check` で fail-closed 検査する構成へ変更した。Codex の生成 suffix は `.agents/rules/amadeus-codex-suffix.md` へ分離し、既存の distribution transaction による temp write + rename で原子的に更新する。

u6 の `packages/framework/core/tools/data/self-install-allowlist.ts`、`preservedEntries(SELF_INSTALL_ALLOWLIST)`、および4本の正規 regex import は変更せず維持した。`dist/` は直接編集していない。

## 編集権威

- root `AGENTS.md`: 手書き本文と、順序固定の `@.agents/rules/amadeus.md` / `@.agents/rules/amadeus-codex-suffix.md` の2 import が権威。生成 marker、未知・重複・欠落 import を拒否する。
- `packages/framework/harness/claude/project-instructions.ts`: root `CLAUDE.md` の Project Instructions 節の唯一の正本。
- `.claude/CLAUDE.md`: root `CLAUDE.md` の onboarding 本文の唯一の正本。
- root `CLAUDE.md`: 上記2正本の追跡投影。`--apply` は修復・再作成せず、`--check` が byte 乖離または欠落を loud fail する。
- `.agents/rules/amadeus-codex-suffix.md`: `dist/codex/AGENTS.md` から標準 Amadeus import を除いて生成する未追跡投影。

## 主な変更

- `scripts/promote-self.ts`: root instruction 検査、Codex suffix 構成、transaction coordinator 注入 seam、root 非書き込みを実装した。
- `packages/framework/harness/claude/project-instructions.ts`: Project Instructions 正本を追加した。
- `packages/framework/harness/claude/manifest.ts`: packager の source-reference guard に正本を harness metadata として公開した。
- `AGENTS.md`: 手書き領域を保持し、生成 suffix import を追加して旧生成領域を除去した。
- `tests/integration/t417-promote-self-root-instructions.integration.test.ts`: import 集合、権威 drift、原子性、冪等性、欠落時 fail-closed を7 testで固定した。
- 既存の promote-self fixture 4件と coverage allowlist の行番号を新しい契約へ追随させた。

## TDD 証跡

| Slice | Red | Green |
|---|---:|---:|
| AGENTS root 非書き込み | 0 pass / 1 fail | 1 pass / 0 fail |
| exact 2 import と drift 検出 | 1 pass / 1 fail | 2 pass / 0 fail |
| CLAUDE 正本 byte 検査 | 2 pass / 1 fail | 3 pass / 0 fail |
| transaction 注入と rename 前失敗 | 3 pass / 1 fail | 4 pass / 0 fail |
| 完成した t417 suite | — | 7 pass / 0 fail / 33 expects |

## 検証

- 対象回帰10ファイル（u6 `t416` を含む）: 78 pass / 0 fail / 276 expects。
- `bun run typecheck`: Green。
- `bun run lint`: exit 0。既存 baseline の complexity warning のみで error なし。
- 対象 Biome: Green。`scripts/promote-self.ts` の既存 complexity warning のみ。
- `git diff --check`: Green。
- 実 worktree で `promoteSelfMain(["--apply", "--no-build"])` を2回実行: root `AGENTS.md` / `CLAUDE.md` の hash と inode は不変、2回の出力 byte は同一。
- `bun scripts/package.ts --check`: 7 harness すべて Green。
- `bun scripts/promote-self.ts --check --no-build`: Green。
- `bun scripts/promote-self.ts --check`: package freshness を含め Green。
- `bun run test:ci`: 757 files、10251 assertions。756 files は通過し、`t227-codex-migration-walking-skeleton.test.ts` のみ並列 cold 実行の15秒 timeoutで1 assertion失敗。
- `bun test --timeout 120000 tests/integration/t227-codex-migration-walking-skeleton.test.ts`: 1 pass / 0 fail / 45 expects（7.96秒）。実障害ではなく既知の cold/concurrency timeout と判定した。

## NFR と逸脱

承認済み NFR に本 unit の追加 performance / network / database / deployment 境界はないため、専用 benchmark と security test は N/A とした。原子性・失敗時 byte 保持・symlink/path 防御は既存 transaction と統合 test で検証した。

機能設計の正本名は TBD だったため、Project Instructions は Markdown ではなく `project-instructions.ts` に置いた。これにより packager の source-reference guard を満たしつつ、正本モジュール自体を downstream `dist/` に配布しない。公開 byte 契約と一意な編集権威は維持している。

生成された `.agents/rules/amadeus-codex-suffix.md` と、親 workflow から共有された intent state / audit / inception 文書は本 unit の commit 対象外とする。
