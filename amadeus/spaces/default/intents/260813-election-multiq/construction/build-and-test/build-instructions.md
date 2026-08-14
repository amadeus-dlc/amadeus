# ビルド手順

入力は各 unit の [code-generation-plan](../election-distribution-and-verification/code-generation/code-generation-plan.md) と [code-summary](../election-distribution-and-verification/code-generation/code-summary.md) を含む U1–U8 の code-generation 成果物である。生成面は直接編集せず、正本を直してから build する。

## 依存と環境

- ランタイムは bun。`bun` が PATH にあること。
- 依存は `bun install --frozen-lockfile`。
- 追加の常駐サービスや `.env` は不要。

## ビルドコマンド

```
bun run build
```

`dist/` とセルフインストール面を再生成する。plugin を直したあとは `bun .cursor/tools/amadeus-plugin.ts compose --if-stale` でハーネス投影を同期する。

## 検証

```
bun run typecheck
bun run source-only:check
```

typecheck は `tsc --noEmit` を app / tests の両方にかける。source-only は生成物の Git 越境を拒否する。

## トラブルシュート

- `bun` が見つからない: `~/.bun/bin` を PATH に足す。
- 投影が古い: 正本を直したあと `bun run build` と plugin compose をやり直す。rebase 後は `bun .cursor/tools/amadeus-runtime.ts compile` で `delivery_bolts` を載せる。
