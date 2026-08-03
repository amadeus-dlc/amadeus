# ビルド手順

## 上流成果物と前提

- 上流の `code-generation-plan.md` と `code-summary.md` を検証対象とする。
- Bun 1.3.13、依存関係はroot `package.json`／`bun.lock`で固定される。長時間稼働service、database、container、環境変数は不要。
- 初回または依存不足時だけ `bun install --frozen-lockfile` を実行する。既に依存導入済みなら再実行しない。

## ビルド・静的検証

```bash
bun run typecheck
bun run lint
bun scripts/package.ts --check
bun tests/gen-coverage-registry.ts --check
git diff --check
```

合格条件は全コマンドがexit 0であること。lintの既存cognitive-complexity warningはbaselineとして許容するが、新規対象ファイルのerror／warning増加は許容しない。

## Self-promotion検証

```bash
bun run promote:self:check
```

通常条件のexit codeをload-bearing結果として記録する。開始前から保護指定された`.codex/skills/`がORPHANになる場合、隔離条件のcheckはcore DIFFERS／MISSING不在の補助証拠に限り、通常checkの成功へ読み替えない。

## トラブルシューティング

- Bunが見つからない場合はインストール済みBunの絶対パスを確認する。
- package checkのDIFFERSは正本を修正して`bun scripts/package.ts`で再生成し、`dist/`を手編集しない。
- cold compileでintegration timeoutが出た場合は、該当ファイルを`bun test --timeout 120000 <file>`で単独再実行し、再現性を確認する。
- plugin ORPHANは保護対象を削除して解消せず、通常checkの未達として結果へ残す。
