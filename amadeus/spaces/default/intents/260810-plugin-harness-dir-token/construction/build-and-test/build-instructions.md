# ビルド手順 — 260810-plugin-harness-dir-token

Depth: **Minimal**（コマンドと環境変数のみ。トラブルシュートは Step 10 で実際に失敗した場合のみ記載）

## 前提

- `bun`（実測 1.3.13）。`mise` 管理下のため worktree では `mise trust` 済みであること
- 依存導入: `bun install`（`bun.lock` に固定）
- 環境変数: 通常のビルドでは不要。ハーネスを明示する経路のみ `AMADEUS_HARNESS_DIR`（例 `.codex`）を使う

## コマンド

```
bun run typecheck   # tsc --noEmit（tsconfig.json と tsconfig.tests.json の 2 面）
bun run lint        # biome check（tests/ packages/setup/ packages/framework/core/ scripts/ plugins/）
bun run build       # = bun run dist && bun run promote:self
```

`bun run build` の内訳と、本 intent での意味:

- `bun run dist` → `scripts/package.ts`。8 ハーネス面の `dist/<harness>/` と、plugin 導入バンドル
  `dist/plugins/<name>/<harness>/` を生成する（**経路A**。prose にトークン変換が適用される）
- `bun run promote:self` → `scripts/promote-self.ts --apply`。self-install 5 面
  （`.claude/` `.codex/` `.cursor/` `.opencode/` `.kimi-code/`）を更新する（**経路B**。
  `buildSelfInstallProjection` → `projectInTemporaryWorkspace` が authoring `plugins/` を
  seed して compose を spawn する）

## ビルド検証

本 intent の変更は両経路の prose 解決に触れるため、ビルド成功だけでは不十分。以下を実測する。

```
# consumer 導入バンドル 8 面
for h in claude codex cursor kiro kiro-ide opencode kimi pi; do
  f=dist/plugins/pr-convergence/$h/plugins/pr-convergence/stages/pr-convergence.md
  grep -c '{{HARNESS_DIR}}' "$f"    # 期待: 0
done

# self-install 5 面
for d in .claude .codex .cursor .opencode .kimi-code; do
  f=$d/plugins/pr-convergence/stages/pr-convergence.md
  grep -c "$d/tools/amadeus-sensor.ts" "$f"   # 期待: 1
  grep -c '{{HARNESS_DIR}}' "$f"              # 期待: 0
done
```

`grep -c` は 0 件で exit 1 を返す。`&&` 連鎖に置かず独立ステップで実行し、exit code を個別に読むこと。

## 生成物の扱い

`dist/` と self-install 5 面は **git 追跡外**（`git ls-files` での追跡ファイル数 = 0）。
コミット対象に含めない。修正の証跡はソースとテストで示す。
