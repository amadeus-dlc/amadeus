# Code Generation Plan — rulesdir-resolve（Issue #491）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[architecture.md](../../../inception/reverse-engineering/architecture.md)

## 計画（TDD）

1. RED: `dev-scripts/evals/rulesdir-resolve/check.ts`（隔離 workspace、実体パスの実 CLI = Issue 再現条件そのもの、3 分岐 6 検査）を追加。修正前は (a) rules 空生成、(b) 空 memory で無音成功、の 3 件が失敗することを確認する。
2. GREEN: `workspaceRootForRules()`（`aidlc/spaces` を含む最初の祖先への walk-up、上限 6 階層、不一致時は旧挙動へフォールバック）を新設し、`rulesDir()` から使用。compile に fail-loud ガード（memory 実在 + rule 0 件で graph を書かずエラー停止）を追加。
3. 検証: eval 6 検査 GREEN、本 repo での実体パス compile が stale phantom entry（実在しない phases/*.md への参照 88 行）の除去だけを生むことを確認、`npm run test:all` exit 0。
4. parity: `tools/aidlc-graph.ts` と `tools/data/stage-graph.json` を engineFileExceptions へ宣言。
