# Build Instructions — dynamic-test-size(#699)

> 上流: `../dynamic-size-observation/code-generation/code-generation-plan.md` / `code-summary.md`。
> 本 intent はコンパイル成果物を持たない(TypeScript を bun 直接実行)。「ビルド」= 型検査+lint+配布物ドリフト検査。

## 依存インストール

```
bun install --frozen-lockfile
```

前提: bun 1.3.x(CI は 1.3.13 固定 — `.github/workflows/ci.yml`)。環境変数・ローカルサービスは不要。

## ビルド(検査)コマンド

| コマンド | 意味 | 期待 |
|---|---|---|
| `bun run typecheck` | `tsc --noEmit` 型検査 | exit 0 |
| `bun run lint` | Biome lint(`tests/` スコープ) | exit 0 |
| `bun run dist:check` | dist 生成物ドリフトガード | exit 0(本 intent は core/harness 非接触) |
| `bun run promote:self:check` | セルフインストールツリー同期検査 | exit 0(同上) |

## トラブルシューティング

- `dist:check` 赤: 本 intent の変更範囲(`tests/`、`.github/`)は dist 非対象。赤くなる場合は他変更の混入を疑い `git status` を確認。
- 型エラーが `tests/lib/test-size.ts` に出る場合: 既存 export のシグネチャ変更は禁止(BR-7)— 追加 export 側を直す。
