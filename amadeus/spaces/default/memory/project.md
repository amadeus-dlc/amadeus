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
- NEVER convert the root dev-only `package.json` into the publishable installer package for this intent. (affirmed 2026-07-07)
- NEVER perform additional framework workspace normalization as part of the installer implementation unless a separate repo-layout refactor is explicitly approved. (affirmed 2026-07-07)
- NEVER use line coverage percentage as the primary installer quality floor unless the team explicitly replaces the coverage registry/ratchet practice. (affirmed 2026-07-07)
- NEVER publish the installer automatically on ordinary `main` merge without a human-triggered release gate. (affirmed 2026-07-07)
- NEVER treat security/supply-chain checks as advisory-only for installer-related PRs when they can be deterministically evaluated. (affirmed 2026-07-07)
- NEVER make JSON envelopes the default user-facing `amadeus-setup` output style. (affirmed 2026-07-07)
## Mandated

- ALWAYS ユーザー可視の変更を含むPRは、同一コミットで `core/tools/amadeus-version.ts` のバージョンをバンプし、README バッジを更新し、`CHANGELOG.md` に `## [X.Y.Z] - YYYY-MM-DD` 見出しと箇条書きを追加する(`tests/unit/t68-version-changelog-sync.test.ts` が三者の同期を強制)。ドキュメントのみ・内部リファクタ・テストのみの変更はバンプしない

- ALWAYS edit `core/` or `harness/<name>/` as the source of truth, then regenerate `dist/` with `bun scripts/package.ts`. (affirmed 2026-07-07)
- ALWAYS run `bun run promote:self` after source changes that affect the self-installed `.claude/`, `.codex/`, `.agents/`, or `CLAUDE.md` trees. (affirmed 2026-07-07)
- ALWAYS include `bun run dist:check` and `bun run promote:self:check` in installer-related validation because the installer depends on generated distribution parity. (affirmed 2026-07-07)
- ALWAYS validate installer changes with `bun run typecheck`, `bun run lint`, and the relevant `tests/run-tests.sh` profile before merge. (affirmed 2026-07-07)
- ALWAYS treat the first installer Construction Bolt as a small end-to-end package setup slice and gate it before broader installer expansion. (affirmed 2026-07-07)
- ALWAYS layout-normalization の判断では `code-structure`, `technology-stack`, `dependencies`, `code-quality-assessment`, `architecture`, `business-overview` の CodeKB 根拠を参照する。 (affirmed 2026-07-07)
- ALWAYS `dist/`、`.claude/`、`.codex/`、`.agents/` の path を変える案では `dist:check` と `promote:self:check` の維持方法を同じ成果物に書く。 (affirmed 2026-07-07)
- ALWAYS full framework layout-normalization では `packages/setup` を sibling dependency として扱い、installer implementation では `packages/setup/` を publishable installer package source として明示的に扱う。 (affirmed 2026-07-07)
- ALWAYS markdown artifact は日本語で書く。ただし path、CLI、コード識別子、tool が要求する heading は正確性を優先して保持する。 (affirmed 2026-07-07)
- ALWAYS add installer source under `packages/setup/` for this intent while keeping existing `core`, `harness`, `dist`, and `scripts` public compatibility surfaces in place. (affirmed 2026-07-07)
- ALWAYS treat a full repository package-layout normalization as a separate refactor, not part of the installer implementation scope. (affirmed 2026-07-07)
- ALWAYS include `bun run typecheck`, `bun run lint`, `bun run dist:check`, `bun run promote:self:check`, installer smoke/unit/integration tests, and coverage registry/ratchet checks as blocking installer PR validation. (affirmed 2026-07-07)
- ALWAYS release the installer through a manually triggered GitHub Actions `workflow_dispatch` release flow that normally publishes from the latest stable tag. (affirmed 2026-07-07)
- ALWAYS make deterministic installer PR security checks blocking, including package dry-run, installer smoke/integration, dependency audit or OSV, and secret scanning. (affirmed 2026-07-07)
- ALWAYS require SBOM/provenance generation in the release workflow for installer publication. (affirmed 2026-07-07)
- ALWAYS make `amadeus-setup` human-readable by default while keeping internal operations structured enough for tests and automation. (affirmed 2026-07-07)
- ALWAYS fail non-interactive installer conflicts unless the user provided an explicit force or backup policy. (affirmed 2026-07-07)
## Corrections

<!-- 人間のフィードバックによるプロジェクト固有の是正。 -->
<!-- 形式: NEVER/ALWAYS [behavior] (learned [date]) -->
- 既存codekbがある場合、reverse-engineering はフルスキャンでなく前回スキャンコミットからの差分リフレッシュで実行し、Always rerun for freshness 条項を差分更新で満たす (learned 2026-07-07) <!-- cid:reverse-engineering:c1 -->
- インストーラ/配布系 intent の reverse-engineering では package.ts・promote-self.ts・dist 構造・VERSION ファイルを重点的にスキャンする(後続ステージが配布資産の理解に依存するため) (learned 2026-07-07) <!-- cid:reverse-engineering:c2 -->
- reverse-engineering は Developer(スキャン)→ Architect(合成)の2サブエージェント直列で実行する(Architect がスキャン結果に依存するため並列化しない) (learned 2026-07-07) <!-- cid:reverse-engineering:c3 -->
- Requirements Analysis では、version resolution / CLI contract / force semantics / install manifest / upgrade boundary のようなユーザー可視契約を設計詳細として後続 stage へ先送りせず、requirements.md でテスト可能に固定する (learned 2026-07-07) <!-- cid:requirements-analysis:c3 -->
- インストーラ intent では `packages/setup/` を追加する staged layout を採用し、既存 `core/` / `harness/` / `dist/` / `scripts/` の全面移動は別 refactor とする (learned 2026-07-07) <!-- cid:practices-discovery:c2 -->
- インストーラの品質床は line coverage percentage ではなく coverage registry + ratchet とし、CI の blocking gate で registry freshness/ratchet と installer tests を強制する (learned 2026-07-07) <!-- cid:practices-discovery:c3 -->
- インストーラの初回導入コマンドは `init` ではなく `install` と呼ぶ。`init` は workspace/intent 初期化と紛らわしいため requirements で明示的に supersede する (learned 2026-07-07) <!-- cid:requirements-analysis:c5 -->
- CLI product の refined mockups は GUI 画面を無理に作らず、terminal transcript、状態表、interaction spec として表現する (learned 2026-07-07) <!-- cid:refined-mockups:c1 -->
- UI component specification template は、GUI がない CLI/DX surface では CLI interaction component specification に適応してよい (learned 2026-07-07) <!-- cid:refined-mockups:c5 -->
- CLI/DX mockups は rich TTY 表現より plain-text canonical output を優先し、CI logs・screen readers・snapshot tests を同じ出力で検証できるようにする (learned 2026-07-07) <!-- cid:refined-mockups:c6 -->
- インストーラや配布機能の UX artifacts では、end user だけでなく maintainer と CI owner の developer-visible workflow も mockup coverage に含める (learned 2026-07-07) <!-- cid:refined-mockups:c7 -->
- upgrade 設計では、manifest-installed target の `--harness` は optional とし、manifest-first detection を先に定義してから sentinel fallback と ambiguous harness の no-write/prompt policy を定義する (learned 2026-07-07) <!-- cid:application-design:c6 -->
- file apply と manifest write を含む設計では、manifest write の唯一の所有者と失敗分類を Application Design で固定し、apply 成功後の manifest-write-failed が future upgrade classification に与える影響を明記する (learned 2026-07-07) <!-- cid:application-design:c8 -->
- component dependency diagram では code dependency と return/data flow を混同せず、hexagonal boundary では application service が ports に依存する形で循環依存を避ける (learned 2026-07-07) <!-- cid:application-design:c12 -->
- Units Generation では Bolt 順序・critical path・経済的優先度を決めず、Construction と Delivery Planning が参照する unit dependency topology のみを定義する (learned 2026-07-07) <!-- cid:units-generation:c1 -->
- Must 要件を持つ CI、manual release、README/docs は runtime feature でなくても Units Generation の support units として同じ DAG に含める (learned 2026-07-07) <!-- cid:units-generation:c2 -->
- installer の unit 分解は layer units ではなく capability-slice units を優先し、hexagonal package 内の必要 layer を unit ごとにまたいでユーザー価値と検証可能性を保つ (learned 2026-07-07) <!-- cid:units-generation:c4 -->
- installer の Units Generation では細分化しすぎず、medium-sized units で safety、CI、release、docs を落とさない粒度にする (learned 2026-07-07) <!-- cid:units-generation:c5 -->
- Delivery Planning では team practices と team formation の合意に従い、Bolt 1 を walking skeleton として必ず人間ゲートに通す (learned 2026-07-07) <!-- cid:delivery-planning:c1 -->
- Stage 2.7 の unit DAG は topology、Stage 2.8 は economic sequencing として扱い、thin walking skeleton は U1〜U5 を薄く貫通する Bolt として定義する (learned 2026-07-07) <!-- cid:delivery-planning:c2 -->
- installer runtime 実装は外部依存なしで mockable にし、npm token、GitHub environment protection、publish 権限は release Bolt の gated external dependency として分離する (learned 2026-07-07) <!-- cid:delivery-planning:c3 -->
- Delivery Planning では 1 Unit per Bolt を機械的に採用せず、end-to-end risk を先に検証する thin walking skeleton と後続 bundled Bolts を優先する (learned 2026-07-07) <!-- cid:delivery-planning:c5 -->
- ソロメンテナ体制では最大並列化よりも skeleton gate 後の限定的並列化を優先し、autonomy は Construction ladder prompt で改めて選択する (learned 2026-07-07) <!-- cid:delivery-planning:c6 -->
