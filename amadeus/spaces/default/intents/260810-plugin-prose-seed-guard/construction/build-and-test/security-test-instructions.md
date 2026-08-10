# Security Test Instructions

## 判定

- `code-generation-plan.md` と `code-summary.md` に専用 security NFR はない
- 認証、認可、秘密情報、ネットワーク入力、依存パッケージを変更しない

## 検証

```bash
bun run lint
bun run source-only:check
```

- plugin prose が consumer の harness 配下だけを参照し、repo root への暗黙依存を持たないことを t146 / t2790 で確認する
- 生成 `dist/` や self-install 面を Git 境界へ混入させない

## 成功条件

- lint error 0
- source-only check exit 0
- 新しい secret、権限、外部通信面がない
