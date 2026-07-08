# Project-Level Rules

> プロジェクト固有の上書きと是正事項。team.md と org.md を上書きする。practices-discovery と自己学習ループによって記入される。
>
> 控えめに使うこと: 多くのチームにはプロジェクト層は不要。このプロジェクトだけがチーム全体のプラクティスから安定的・恒久的に逸脱する場合にのみ使う(例:「このモノレポはチームのデフォルトがスカッシュでもリベースする」「このレガシープロジェクトは既存スイートが救済不能なためテスト下限を免除し、それを受け入れている」)。

## Way of Working

<!-- プロジェクト固有の上書き。例: -->
<!-- このモノレポはスカッシュマージではなくリベースする。パッケージ単位のコミット履歴が部分ロールバック判断の監査証跡だから。この上書きはこのプロジェクトにのみ適用される。 -->

## Walking Skeleton

<!-- プロジェクト固有の上書き。例: -->
<!-- このプロジェクトは walking skeleton をスキップする。既存サービスのインプレース書き換えであり、ゲートすべきグリーンフィールドのブートストラップが存在しないため。 -->

## Testing Posture

<!-- プロジェクト固有の上書き。 -->

## Deployment

<!-- プロジェクト固有の上書き。 -->

## Code Style

<!-- プロジェクト固有の上書き。 -->

## Tech Stack

- ランタイム / パッケージマネージャ: Bun(TypeScript、ESM)。フレームワークの hooks / tools はすべて bun で直接実行する
- 言語: TypeScript(typescript ^6、`tsc --noEmit` で型検査)
- リンター: Biome 2.4系(フォーマッタ無効)
- テスト: bun test ベースの自作ランナー `tests/run-tests.sh`(smoke / unit / integration / e2e の4層)
- 主要開発依存: @anthropic-ai/claude-agent-sdk、node-pty、@xterm/headless(e2e のターミナル駆動用)
- 構成: `core/`(ハーネス中立のソースオブトゥルース)、`harness/<name>/`(ハーネス別表層)、`scripts/package.ts`(ビルド)、`dist/<harness>/`(生成・コミット・ドリフトガード対象)、`docs/`

## Decided

- DECIDED: 新しい `/amadeus --*` ユーティリティハンドラを実装する前に `docs/reference/11-contributing.md` の「Adding a Utility Handler」チェックリストに従う
- DECIDED: 2つのPRが `amadeus-version.ts` を同一パッチ番号にバンプして衝突した場合、後からマージする側がリベースして再バンプし(例 `0.6.5` → `0.6.6`)、CHANGELOG の見出しも合わせて改名する

## Scope Overrides

<!-- このプロジェクト用のカスタムスコープルール。 -->

## Forbidden

- NEVER CHANGELOG にリポジトリホストを埋め込むバージョンリンク参照(`[N.N.N]:` 形式)を復活させない — v0.6.9 で削除済み、t68 が再出現をガードする

- NEVER hand-edit `dist/<harness>/` as an implementation shortcut. (affirmed 2026-07-07)
- NEVER let source, distribution, and self-install trees drift across commits when installer behavior changes. (affirmed 2026-07-07)
- NEVER rely on a local-only manual checklist for installer release readiness when a deterministic drift guard already exists. (affirmed 2026-07-07)
- NEVER add runtime dependencies to the shipped framework without documenting why the user-side Bun-only premise changes. (affirmed 2026-07-07)
- NEVER `dist/<harness>/` を layout 変更の近道として手編集しない。 (affirmed 2026-07-07)
- NEVER root `core/` / `harness/` の維持または移動を、ADR/設計記録なしに暗黙決定しない。 (affirmed 2026-07-07)
- NEVER `dist/` relocation を internal refactor として扱わない。README、docs、tests、self-promotion、CI への user-facing impact を棚卸しする。 (affirmed 2026-07-07)
- NEVER `packages/setup` の不在をローカル filesystem evidence として捏造しない。 (affirmed 2026-07-07)
## Mandated

- ALWAYS ユーザー可視の変更を含むPRは、同一コミットで `core/tools/amadeus-version.ts` のバージョンをバンプし、README バッジを更新し、`CHANGELOG.md` に `## [X.Y.Z] - YYYY-MM-DD` 見出しと箇条書きを追加する(`tests/unit/t68-version-changelog-sync.test.ts` が三者の同期を強制)。ドキュメントのみ・内部リファクタ・テストのみの変更はバンプしない

- ALWAYS edit `core/` or `harness/<name>/` as the source of truth, then regenerate `dist/` with `bun scripts/package.ts`. (affirmed 2026-07-07)
- ALWAYS run `bun run promote:self` after source changes that affect the self-installed `.claude/`, `.codex/`, `.agents/`, or `CLAUDE.md` trees. (affirmed 2026-07-07)
- ALWAYS include `bun run dist:check` and `bun run promote:self:check` in installer-related validation because the installer depends on generated distribution parity. (affirmed 2026-07-07)
- ALWAYS validate installer changes with `bun run typecheck`, `bun run lint`, and the relevant `tests/run-tests.sh` profile before merge. (affirmed 2026-07-07)
- ALWAYS treat the first installer Construction Bolt as a small end-to-end package setup slice and gate it before broader installer expansion. (affirmed 2026-07-07)
- ALWAYS layout-normalization の判断では `code-structure`, `technology-stack`, `dependencies`, `code-quality-assessment`, `architecture`, `business-overview` の CodeKB 根拠を参照する。 (affirmed 2026-07-07)
- ALWAYS `dist/`、`.claude/`、`.codex/`、`.agents/` の path を変える案では `dist:check` と `promote:self:check` の維持方法を同じ成果物に書く。 (affirmed 2026-07-07)
- ALWAYS `packages/setup` は別 intent の sibling dependency として扱い、この intent の実装スコープに吸収しない。 (affirmed 2026-07-07)
- ALWAYS markdown artifact は日本語で書く。ただし path、CLI、コード識別子、tool が要求する heading は正確性を優先して保持する。 (affirmed 2026-07-07)
## Corrections

<!-- 人間のフィードバックによるプロジェクト固有の是正。 -->
<!-- 形式: NEVER/ALWAYS [behavior] (learned [date]) -->
- 既存codekbがある場合、reverse-engineering はフルスキャンでなく前回スキャンコミットからの差分リフレッシュで実行し、Always rerun for freshness 条項を差分更新で満たす (learned 2026-07-07) <!-- cid:reverse-engineering:c1 -->
- インストーラ/配布系 intent の reverse-engineering では package.ts・promote-self.ts・dist 構造・VERSION ファイルを重点的にスキャンする(後続ステージが配布資産の理解に依存するため) (learned 2026-07-07) <!-- cid:reverse-engineering:c2 -->
- reverse-engineering は Developer(スキャン)→ Architect(合成)の2サブエージェント直列で実行する(Architect がスキャン結果に依存するため並列化しない) (learned 2026-07-07) <!-- cid:reverse-engineering:c3 -->
- Requirements Analysis では、version resolution / CLI contract / force semantics / install manifest / upgrade boundary のようなユーザー可視契約を設計詳細として後続 stage へ先送りせず、requirements.md でテスト可能に固定する (learned 2026-07-07) <!-- cid:requirements-analysis:c3 -->
- 新しい配布可能パッケージを導入する intent では、パッケージ自身のバージョンライフサイクル(誰が・いつ・どうバンプし、framework 版とどう関係するか)と公開物の内容検証(シミュレーションではなく実ツール — `npm pack --dry-run` 等 — による検証)を requirements でテスト可能に固定する (learned 2026-07-08) <!-- cid:requirements-analysis:c4 -->
