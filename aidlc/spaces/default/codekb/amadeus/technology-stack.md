# 技術スタック：amadeus

| 領域 | 技術 |
|---|---|
| 実行 | Bun + TypeScript（エンジン、skill スクリプト、dev-scripts、eval のすべて） |
| 検証 | `npm run test:all`（typecheck / lints / contracts / parity / wiring / evals / engine-e2e / diff） |
| 連携 | GitHub CLI（Issue / PR / Projects v2 GraphQL）。kanban の認証は gh へ全面委譲 |
| 依存方針 | npm 依存を増やさない（devDependencies は @types/bun と typescript のみ） |
| 開発ツールチェイン | mise（node = "24" を mise.toml で宣言） |
