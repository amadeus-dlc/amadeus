# re-scan 記録 — 260725-mirror-review-fixes

## 実行メタデータ

- Date: `2026-07-25T01:35:20Z`
- Intent: `260725-mirror-review-fixes`
- Repository: `amadeus`（単一 repo）
- Scope: `amadeus-bugfix`、Depth Minimal、Test Strategy Comprehensive、Brownfield
- Stage: `reverse-engineering`（2.1）
- Base commit: `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`
- Observed commit: `70336937529f5be31c011de5d368c0f03e534506`
- Base selection: この intent に先行 re-scan がないため、他の `re-scans/` に記録された到達可能 observed commit を列挙し、HEAD までの距離が最小（49）の `260724-watcher-timeout-fix` を採用した。`git merge-base --is-ancestor <base> HEAD` は exit 0。
- Focus: [PR #1469](https://github.com/amadeus-dlc/amadeus/pull/1469) の Mirror lifecycle、coordinator、legacy CLI、config safe read、state codec、coverage source normalizer、関連 tests/CI。巨大ファイル分割と gateway lexer 共通化は別 refactor intent のため除外。
- Delivery boundary: codekb 9成果物と本記録のみ。実装、tests、state、audit、dist/self-install、commit、GitHub mutation は行っていない。

## 差分規模

- `git rev-list --count <base>..HEAD` = 49 commits。
- `git diff --shortstat <base>..HEAD -- packages/framework/core/tools tests/lib/coverage-source-path.ts tests/smoke/t05-run-tests-parallel.test.ts .github/workflows/ci.yml` = 23 files changed, 10,319 insertions, 161 deletions。
- Mirror 正本は `packages/framework/core/tools/amadeus-mirror-*.ts`。root harness と `dist/*` の同名ファイルは packaging による生成投影であり、修正時は正本から再生成する。

## Developer Code Scan Results

### Packages Found

- `packages/framework/core/tools` — TypeScript — lifecycle、policy、coordinator、executor、gateway、durable state、repair、CLI。
- `tests/unit` — TypeScript/Bun test — config、codec、policy、coordinator 等の純粋・in-process 契約。
- `tests/integration` — TypeScript/Bun test — filesystem、CLI、GitHub gateway seam、lifecycle chain。
- `tests/lib` / `tests/smoke` — TypeScript/Bun test — LCOV source 正規化と test runner。
- `.github/workflows` — YAML — typecheck/lint/distribution/test/coverage の CI 配線。

### Build System

- Type: Bun scripts + TypeScript compiler + Biome。
- Config: `package.json`、`tsconfig.json`、`tsconfig.tests.json`、`biome.json`、`.github/workflows/ci.yml`。
- Distribution: `scripts/package.ts` と harness manifests が core 正本を Claude、Codex、Kiro CLI、Kiro IDE、Cursor、OpenCode へ投影する。

### APIs Discovered

- Lifecycle CLI: `boundary`、`manual`、`repair`。prompt answer コマンドは欠落。
- Legacy CLI: `create|sync|close|status`。mutation 3 verb は GitHub を直接変更する。
- Internal: `driveMirrorBoundary(input)` は `answer?: MirrorPromptAnswer` を受けるが、回答型と `ask` outcome に `bindingId` がなく、approve は event/operation のみ照合し、skip はその照合も迂回する。
- GitHub: executor→gateway→`gh` の create/edit/close/view/auth 経路。

### Frameworks & Libraries

- Bun 1.3.13、TypeScript `^6.0.3`、Biome、fast-check `^4.9.0`、Node 標準 fs/path/readline。
- 新規 production dependency は不要。

### Test Coverage

- Test directories: `tests/unit`、`tests/integration`、`tests/smoke`、`tests/e2e`。
- Focused baseline: 7 files、127 pass / 0 fail / 274 expect()、16.68秒。
- Coverage config: `tests/run-tests.ts`→`coverage-normalize.ts`→`coverage-source-path.ts`、Codecov。
- Gap: lifecycle CLI 未完了 exit、prompt answer parse/process、legacy mutation safe path、config path swap、C0 controls、Cursor/OpenCode source mapping が未被覆。

### Code Quality Indicators

- Lint/typecheck/distribution/test/coverage は repository-native CI に存在。
- Mirror は authorization、receipt、provenance、atomic reducer、reconciliation を分離しているが、legacy CLI と lifecycle CLI 表現層に安全契約の配線漏れがある。
- 大型ファイルは technical debt だが今回の bugfix から除外する。

### Technical Debt Signals

- `amadeus-mirror-state-codec.ts` 1,526行、lifecycle 909行、coordinator 708行。分割は別 intent。
- harness/source mapping の手書き列挙が distribution の6面と drift している。
- legacy mutation と lifecycle mutation の二重実装が安全保証を選択可能にしている。

## 6件の確定 findings

1. **未完了 outcome が成功終了**: `amadeus-mirror-lifecycle.ts:898-904` は top-level `ok` の inner outcome を判定せず exit 0。[review](https://github.com/amadeus-dlc/amadeus/pull/1469#discussion_r3648935678)。
2. **prompt 回答 CLI 欠落 + binding 不一致**: coordinator は prompt を永続化・回答処理できるが、`parseMirrorLifecycleArgs` は boundary/manual/repair のみ。さらに `MirrorPromptAnswer` と `ask` outcome に `bindingId` がなく、approve は event/operation のみを照合し、skip はその照合も迂回する。[review](https://github.com/amadeus-dlc/amadeus/pull/1469#discussion_r3648935682)。
3. **legacy safety bypass**: `amadeus-mirror.ts:357-456` が `gh issue create/edit/close` を直接呼び、permit/receipt/provenance/repair guard を迂回。[review](https://github.com/amadeus-dlc/amadeus/pull/1469#discussion_r3648935684)。
4. **config TOCTOU**: `amadeus-mirror-config.ts:161-184` は realpath containment 判定と open が別 path 操作。fd の start/end fstat は判定後・open前の置換を閉じない。
5. **codec C0**: `amadeus-mirror-state-codec.ts:194-195` は未エスケープ CR/LF だけを拒否し、他の U+0000–U+001F を受理する。
6. **coverage source drift**: `tests/lib/coverage-source-path.ts:8-13,43-59` は Claude/Codex/Kiro 系だけを列挙し、Cursor/OpenCode の root/dist/temp package source を core 正本へ畳まない。

## 後続ステージへの検証境界

- 各 finding は最初に失敗する再現テストを追加する。
- lifecycle boundary/manual は要求 operation の `completed` だけを成功扱いにする。ask は回答待ちとして receipt 完了と区別する。
- prompt answer は保存済み binding/event/operation と一致した approve/skip だけを消費可能にし、replay と mismatch を拒否する。
- legacy mutation は lifecycle manual へ委譲するか明示拒否し、read-only status だけを互換面として維持する。
- config は open descriptor を信頼起点に fail-closed、codec は未エスケープ `< U+0020` を一律拒否、coverage は全6 harness を対称 mapping する。
- focused tests、Mirror 全体、typecheck/lint/distribution、full CI の順に検証する。
