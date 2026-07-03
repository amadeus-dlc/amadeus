# 技術スタック：amadeus

## 言語と実行環境

- TypeScript を使う。
- Bun で `.ts` スクリプトを実行する。
- npm scripts は検証入口として使う。
- Markdown を Amadeus DLC 成果物と skill 本文の主要形式にする。

## 主要な開発依存

- `typescript`
- `@types/bun`

外部パッケージは最小限に保つ方針である。

validator と dev-scripts は、Node.js 標準 API と Bun API を中心に構成する。

## 検証

CI 相当の入口は `npm run test:all` である。

この入口は typecheck、lint、contracts、Claude wiring、integration eval、mock e2e、examples 検証、diff check を実行する。

## GitHub 連携

GitHub Issues と Pull Requests を Amadeus 本体自己開発の外部状態として扱う。

PR 作成後は CI とレビューボットの結果を確認し、merge 操作は人間が行う。
