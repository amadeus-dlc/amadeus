# 技術スタック

## ランタイムと言語

| 技術 | バージョン・設定 | 用途 |
|---|---|---|
| TypeScript | `^6.0.3`、strict | core tools、hooks、scripts、tests |
| Bun | `1.3.13` 観測 | CLI runtime、package scripts、test runner |
| Node.js APIs | `node:fs`、`node:path`、`node:child_process` など | filesystem、path、process 境界 |
| ESM | `package.json` の `type: module` | module system |
| Markdown / YAML frontmatter | repository native | stages、skills、rules、sensors、docs |
| Mermaid | Markdown 内 | architecture と interaction diagrams |

## 開発依存

| パッケージ | 宣言バージョン | 主用途 |
|---|---|---|
| `@anthropic-ai/claude-agent-sdk` | `0.3.158` | Claude agent integration |
| `@xterm/headless` | `^5.5.0` | terminal tests |
| `bun-types` | `^1.3.13` | contributor 型情報 |
| `fast-check` | `^4.9.0` | property-based testing |
| `node-pty` | `1.1.0` | PTY integration |
| `release-it` | `^20.2.1` | release automation |
| `typescript` | `^6.0.3` | typecheck |

Biome は `bunx @biomejs/biome` で lint に使用される。repository root package は開発用であり、配布 framework の runtime dependency を意味しない。

## 外部ツール

| ツール | 必須性 | 用途 |
|---|---|---|
| `git` | 必須 | worktree、履歴、配布・開発 |
| `gh` | Mirror 利用時のみ | GitHub 認証と Issue API |
| `bun` | 必須 | tools、hooks、build、tests |
| harness CLI 群 | 利用ハーネスごと | Claude、Codex、Cursor、Kiro、OpenCode |

Mirror は新しい SDK や HTTP client を追加せず、既存 `gh` CLI adapter を使用する。認証情報管理も追加しない。

## ビルド・品質スタック

- `bun scripts/package.ts` / `--check`: 6ハーネス dist の生成と drift 検査
- `bun scripts/promote-self.ts --apply` / `--check`: self-install 生成と drift 検査
- `tsc --noEmit`: core と tests の型検査
- Biome: lint
- Bun test runner: smoke、unit、integration、e2e
- LCOV と coverage registry: coverage 計測と正本対応
- GitHub Actions: typecheck、lint、dist/self-install drift、tests、coverage

## Mirror 変更の技術判断

三モード化に新規 runtime dependency は不要である。既存の判別 union、dependency injection seam、Bun filesystem/process APIs、`gh` runner を再利用する。新しい database、queue、daemon、cloud service、tracker abstraction は導入しない。
