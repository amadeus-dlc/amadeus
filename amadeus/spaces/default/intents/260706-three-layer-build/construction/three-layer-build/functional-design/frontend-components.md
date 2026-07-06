# フロントエンドコンポーネント — three-layer-build

対象 Intent: 260706-three-layer-build（Issue #572）

## 適用判断

本 Intent（scope: refactor）の対象は CLI ツールおよびビルドスクリプト（`dev-scripts/build.ts`）のみであり、UI コンポーネントは存在しない。

ユーザー操作の接点は `bun run dev-scripts/build.ts` と `npm run build` および `npm run build:check` のコマンドラインインタフェースに限られる。視覚的 UI、Web フロントエンド、インタラクティブ画面を持つコンポーネントはスコープ外である。

本文書は、Minimal 成果物戦略の「produces 全件生成規約」（project.md Testing Posture §1）に従い、適用外の判断文書として作成する。
