# セキュリティテスト手順

各 Unit の `code-generation-plan.md`、security requirements、`code-summary.md` に基づき、外部公開面を持たない CLI/CI ツールで実質的な攻撃面となる path traversal、symlink/TOCTOU、identity drift、regex/語彙注入、CI 権限、fixture 汚染を検査する。

## 検査項目

- aux path は `specs/tla/<Name>.tla` のみ許可し、絶対パス、`..`、backslash、他拡張子を拒否する。
- model/cfg/aux は同一 SafeFileReader 経路を通り、symlink、非正規 path、サイズ超過、read race、identity drift を fail-closed にする。
- 未登録モデル、未知 invariant、モデル間語彙和集合、循環・境界外参照は silent fallback せず型付きエラーにする。
- CI は `permissions: contents: read`、`workflow_dispatch` gate、`--network=none`、固定 image/jar receipt を維持する。
- `package.json` / lockfile に新規依存がなく、mutation fixture が repo 実体を変更しないことを確認する。

```bash
bun test --timeout 120000 \
  tests/unit/t-formal-verif-model-map-v2.test.ts \
  tests/integration/t402-tla-module-deps.test.ts \
  tests/unit/t404-tla-vocabulary-supply.test.ts \
  tests/integration/t-formal-verif-tla-model-loader.integration.test.ts \
  tests/integration/t405-mirror-declaration-drift.integration.test.ts \
  tests/integration/t406-ci-all-models-measure.integration.test.ts \
  tests/integration/t-formal-verif-ci-workflow.integration.test.ts
git diff main...HEAD -- package.json bun.lock
```

## 合格基準

- Critical/High 相当の境界バイパス、権限増加、秘密情報、新規依存を0件とする。
- negative test は所定の fail-closed surface に到達し、エラー詳細が外部 bytes や秘密を漏らさない。
- 認証、DAST、IaC scan は外部 endpoint/IaC/認証面が存在しないため非適用。既存依存の継続的脆弱性監査は既存 CI の責務として維持する。
