# Code Generation Plan — workspace-detect（Issue #459）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 計画（TDD）

1. RED: `dev-scripts/evals/workspace-detect/check.ts`（隔離 workspace 実 CLI、7 検査）を追加。修正前エンジンで (a) の 2 件（Brownfield / TypeScript）が失敗することを確認する（(b)(c)(d) は後方互換の回帰保護で修正前から pass）。
2. GREEN: `detectWorkspace` の言語カウント再帰を「SCAN_EXCLUDE とドット始まりを除く全トップレベルディレクトリ」へ一般化する（深さ 6 と symlink 除外は既存のまま。SCAN_SOURCE_DIRS 個別走査は一般化に包含され削除）。
3. reviewer High 対応: Issue AC2（reverse-engineering の SKIP 降格なし）を AC 1b と eval アサーションへ追加。
4. 検証: eval 7 検査 GREEN、本 repo での実地確認（Brownfield / TypeScript / bun）、`npm run test:all` exit 0。
