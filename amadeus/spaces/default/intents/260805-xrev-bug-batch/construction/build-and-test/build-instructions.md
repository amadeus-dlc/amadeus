# Build Instructions — 260805-xrev-bug-batch

対象は本 repo（Bun 単一 workspace の TypeScript monorepo）。本 intent の 6 unit はすべて main へ着地済みのため、
以下は**着地後の main を検証する手順**である。

## 依存インストール

```bash
bun install --frozen-lockfile
```

lockfile を更新しないこと（CI と同じ解決を再現するため）。

## 環境

- Bun 1.3.13（CI と同一）
- 追加の env / config / ローカルサービスは不要。本 intent の変更はいずれもプロセス内の engine / tools と
  テストのみで、外部サービスに依存しない
- 任意: 複雑度ゲートは Python の `lizard==1.23.0` を使う。未導入でもテストは skip して緑になる

## ビルド

```bash
bun run build      # = bun run dist && bun run promote:self
```

生成物（`dist/<harness>/` とセルフインストール面）は**追跡対象外の使い捨て**であり、正本は
`packages/framework/core/` と `packages/framework/harness/<name>/`。正本を編集したら必ず再ビルドする。

## ビルド検証

```bash
git status --porcelain | grep -v '^??'    # 追跡ファイルに drift が無いこと（空であること）
bun run source-only:check                  # 生成物が Git 境界を越えていないこと
bun run typecheck                          # tsc --noEmit（本体 + tests の 2 tsconfig）
```

## よくある詰まり

- **`dist/` 由来の import が古い**: `t379` など一部テストは `dist/claude/...` を import する。
  正本を変えたら `bun run build` を先に走らせないと、テストが前世代の実装を測る
- **`BASELINE_INVALID`（no-silent-drop）**: main が ledger rebind を追い越すと出る。base の
  `tests/no-silent-drop/{baseline,exemptions}.json` のバイト列へ `previousDigest` を再束縛する
- **coverage registry の drift**: export を足したら `bun tests/gen-coverage-registry.ts` で再生成する
