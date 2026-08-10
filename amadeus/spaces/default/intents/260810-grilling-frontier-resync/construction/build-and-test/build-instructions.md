# Build Instructions

**Intent**: 260810-grilling-frontier-resync / **Stage**: build-and-test (3.6) / **Test Strategy**: Comprehensive

上流入力(consumes 全数): `code-generation-plan.md` / `code-summary.md` / `pr-convergence-report.md`(各 Unit の実装実績と検証実測 — 本書の検証対象の正本)、`unit-of-work.md`(U1/U2/U3 の完了条件)、`requirements.md`(FR/NFR の受け入れ基準)、`bolt-plan.md`(Bolt ごとの検証列)。

## ビルド経路

本プロジェクトは source-only 境界を採る。正本は `packages/framework/core/` と `packages/framework/harness/<name>/`、`dist/` とセルフインストール面は**未追跡のローカル生成物**であり `bun run build` で再生成する(project.md Mandated)。

| # | コマンド | 目的 | 合否 |
|---|---|---|---|
| B-1 | `bun install --frozen-lockfile` | 依存の固定復元 | exit 0 |
| B-2 | `bun run build` | 全ハーネス投影(packager が検出する集合の全数)の再生成 | exit 0 |
| B-3 | `git status --porcelain` | **追跡ファイル不変**の確認(生成物は未追跡のため差分に現れない) | 出力に packages/ docs/ tests/ の差分が無いこと |
| B-4 | `bun run source-only:check` | 生成物の独立正本化の禁止(source-only 境界) | exit 0 |
| B-5 | 隔離2回ビルド再現性検査 | 2つの独立ツリーで clone → install → build → `release-dist.ts` し全出力を `diff -qr` | 全出力が byte 一致 |

## 注意(本 intent 固有の実測知見)

- **B-3 の `git status --porcelain` 空は、gitignore された自己インストール投影(`.claude` / `.codex` 等)の更新を証明しない。** 配布面の語彙・内容を検証する場合は、生成物木を明示対象にする非 git の述語で再実測する(本 intent の §12a i2 で実測された欠陥クラス。cid:code-generation:c1-mirror-and-rebuild-before-review / cid:requirements-analysis:c2-acceptance-at-delivery-tree)。
- B-5 はローカルでは高コストのため、CI の `reproducible-build` job を正とする。Bolt 3 の builder が同 job を逐語再現し 10 出力すべて byte 一致を実測済み(`code-summary.md`)。
