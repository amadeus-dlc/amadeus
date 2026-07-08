# API ドキュメント

## 公開 API サーフェス

この repository に HTTP API、GraphQL API、service endpoint は存在しない。公開されている契約は CLI コマンドと、npm パッケージとして公開予定の `@amadeus-dlc/setup` の CLI サーフェスである。

## 既存の CLI 契約

### パッケージ生成

```bash
bun scripts/package.ts [<harness>] [--check]
```

- `packages/framework/core/` と `packages/framework/harness/<name>/` から配布 tree を生成する(PR #644 で root symlink は削除済み)。
- 出力を root `dist/<name>/` に書く。`AMADEUS_VERSION` から `<harnessDir>/VERSION` ファイルも生成する。
- `--check` では一時 tree と commit 済み `dist/<name>/` を byte-diff し、drift guard として失敗させる。

### Codex trust

```bash
bun scripts/package.ts codex trust --project <abs-dir>
```

- Codex harness の trust/setup helper を実行する。`harness/codex/emit.ts` と生成済み `.codex`/`.agents` shape に依存する。

### 自己昇格

```bash
bun scripts/promote-self.ts [--check|--apply] [--no-build]
```

- Claude/Codex 配布物を再ビルドする。
- `dist/claude/.claude` → root `.claude`、`dist/codex/.codex` → root `.codex`、`dist/codex/.agents` → root `.agents`、および CLAUDE.md を比較(`--check`)または適用(`--apply`)する。
- `settings.json`、`settings.local.json`、`worktrees/`、`config.toml`、`hooks.json`、`local/` などを preserve するルールを持つ。**installer の non-destructive merge 設計はこの preservation ロジックを直接参照できる。**

### バージョン確認

```bash
bun .claude/tools/amadeus-utility.ts version
```

- `amadeus <AMADEUS_VERSION>` を出力する。t68(`tests/unit/t68-version-changelog-sync.test.ts`)がこの実出力・CHANGELOG 最新見出し・README バッジの3者一致を検証する。

## Manifest 契約

`scripts/manifest-types.ts` が harness manifest の internal API である。

- `HarnessManifest = { name, harnessDir, coreDirs: DirMap[], harnessFiles: FileMap[], frontmatterAdditions?, onboarding?: OnboardingSpec | null, rulesRename: string | null, authoredExempt: RegExp[], skipRunnerGen?, emit: ((ctx: EmitContext) => EmitResult) | null }`
- `DirMap = { src, dst }`(`packages/framework/core/<src>` → 配布物内 path)
- `FileMap = { src, dst, projectRoot? }`(`packages/framework/harness/<name>/<src>` → 配布物内 path。`projectRoot: true` で dist tree の root、例 `dist/kiro/AGENTS.md` に配置)
- `EmitContext = { repoRoot, coreRoot, harnessRoot, distRoot, harnessDir, substituteToken, check }`
- `EmitResult = { written: string[], problems: string[] }`

**`@amadeus-dlc/setup` はこの source-side manifest 契約を消費しない。** installer が消費するのは `dist/<harness>/` として既に生成済みの成果物であり、tag アーカイブに同梱される想定である。

## 生成済み配布物の契約(installer の入力になる想定)

`dist/` は生成済み出力である一方、repository に commit される install source である。

- `dist/claude/.claude`
- `dist/codex/.codex`
- `dist/codex/.agents`
- `dist/kiro/.kiro`
- `dist/kiro-ide/.kiro`

これらは README、docs、tests、self-promotion、coverage registry から参照される。installer が GitHub tag アーカイブから取得する内容もこれらと同じ形になる可能性が高い。

## 計画中の `@amadeus-dlc/setup` CLI 契約(未実装・要件確定待ち)

開発者スキャンおよびビジネス概要で要求された機能から、次の CLI サーフェスが想定される。requirements-analysis でテスト可能な形に確定する必要がある。

- `npx @amadeus-dlc/setup install [--harness <name>] [<target-dir>]` — 対象プロジェクトへ AI-DLC を新規導入する。
- `npx @amadeus-dlc/setup upgrade [<target-dir>]` — 既存導入をバージョン検出のうえアップグレードする。file-level diff report を提示する。
- version 解決方式(latest tag / 指定バージョン / 現状 0 件の tag をどう解決するか)は未確定。
- non-destructive merge のスコープ判定(`amadeus-*` prefix)、force 上書きの semantics、install manifest の形は未確定 — project.md の是正事項(cid:requirements-analysis:c3, c4)に従い、requirements.md でテスト可能に固定する必要がある。
