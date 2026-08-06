# ビルド手順 — intent 260805-semi-redefine-autonomy-f(#2253)

上流入力(consumes 全数): `code-generation-plan.md`(全 7 Unit)、`code-summary.md`(全 7 Unit)

本書は 7 Unit の `code-generation-plan.md` が宣言した編集正本(`packages/framework/core/tools/` と `packages/framework/harness/<name>/`)と、`code-summary.md` が記録した実装着地面を前提に、このリポジトリのビルド経路を記述する。

測定 ref: conductor クローン HEAD `74b70f40b`(branch `conductor/2253-autonomy-flag`)。数値・exit code はすべて下記コマンドの実出力からの転記。

## 1. 依存関係のインストール

```
bun install --frozen-lockfile
```

- ランタイムは Bun 単一依存(利用者側 Bun-only 前提)。JDK・Docker はフレームワーク本体のビルドには不要。
- **worktree 単位で必要**: `@ast-grep/napi` は `repoRoot/node_modules` 直下を実パスで参照するため(`tests/no-silent-drop/ast-scan.ts` の `loadVerifiedAstGrep`)、新しい worktree では `bun install` を省略すると no-silent-drop 系が `InfraFailure: TOOL_MISSING` で赤くなる。祖先ディレクトリの `node_modules` に解決される配置では通ることがあり、環境差として現れる。

## 2. 環境セットアップ

- 追加の env var・設定ファイル・ローカルサービスは不要。
- `bun` が**非対話シェルの PATH** に載っていること(Claude Code は `~/.zshenv` / `~/.bashrc` を読む。`~/.zshrc` は読まない)。
- formal-model-check plugin を実行する場合のみ、pin された JDK が必要(本 intent の advisory 実行で使用):
  - `plugins/formal-model-check/tools/tlc-spawn-planner.ts` の `inspectDarwin` が `openjdk version "26.0.1"` を正規表現で要求する。
  - mise 環境では `bun` 自体が shim で JAVA_HOME を上書きするため、`JAVA_HOME=... bun ...` では効かない。`mise x java@temurin-26.0.1+8 -- bun ...` の形で固定する。
  - docker provider は digest pin 済み image(`eclipse-temurin:26-jdk@sha256:939e357…`)のローカル実在を要求する。

## 3. ビルドコマンド

```
bun run build
```

正本(`packages/framework/core/`、`packages/framework/harness/<name>/`)から、未追跡のローカル生成物として全ハーネスの `dist/<harness>/` とセルフインストールツリーを再生成する。対象ハーネス集合は packager の検出結果を正とする(固定数を前提にしない)。

## 4. ビルド検証

| 検証 | コマンド | 実測 exit code |
|---|---|---|
| 型検査 | `bun run typecheck` | 0 |
| Lint | `bun run lint` | 0 |
| source-only 境界 | `bun run source-only:check` | 0(`source-only boundary: clean`) |
| 複雑度 ratchet | `bun tests/complexity-gate.ts --check` | 0(`0 new violations, 0 regressions, baseline 34 entries (worst CCN 38), threshold 15`) |
| ビルド | `bun run build` | 0 |

`bun run build` は追跡ファイルを変更しない(source-only 構成のため `dist/` は未追跡)。

## 5. トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `Cannot find module '../../dist/claude/.claude/tools/...'` が typecheck で多発 | `dist/` 未生成(source-only 構成の既定状態) | `bun run build` を先に実行する |
| no-silent-drop 系 3 ファイルが `InfraFailure: TOOL_MISSING` | worktree ローカルの `node_modules/@ast-grep/napi` 不在 | 当該 worktree で `bun install --frozen-lockfile` |
| no-silent-drop が `BASELINE_INVALID: current baseline previousDigest does not bind the trusted base bytes` | 台帳 `previousDigest` が現在の trusted base のバイト列を束縛していない | 対象ブランチの base に合わせて `baseline.json` / `exemptions.json` の `previousDigest` を再束縛する(PR 発行時は conductor が単独コミットで行う) |
| formal-model-check が `ENVIRONMENT_UNAVAILABLE` | JDK バージョン pin 不一致、または docker image 未 pull | 上記 §2 の JDK 固定手順、または pin 済み image を pull |
