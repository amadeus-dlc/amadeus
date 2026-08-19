# ビルド手順 — intent 260815-rfc-autonomy-modes(RFC-0001 Intent Autonomy Modes)

上流入力: 13 unit の `code-generation-plan.md` / `code-summary.md`(`<record>/construction/<unit>/code-generation/`)。
測定断面: `origin/main` `e7c0515fe`(`git rev-parse HEAD` で取得)+ 本 intent の record 変更のみ。全 13 unit の実装 PR は本断面の祖先として着地済み。

## 前提条件

| 項目 | 値 | 確認方法 |
|---|---|---|
| ランタイム | Bun 1.3.13 | `bun --version` |
| 型検査 | TypeScript(`tsc --noEmit`) | `bun run typecheck` |
| リンター | Biome(フォーマッタ無効) | `bun run lint` |
| Java(形式検証のみ) | Temurin 26.0.1+8 | `java -version` |
| 追加の runtime dependency | なし(利用者側 Bun-only 前提を維持) | — |

`bun` は非対話シェルの PATH 上に必要(`~/.zshenv` / `~/.bashrc`)。

## ビルドコマンド

```bash
bun install          # 依存解決(lockfile 準拠)
bun run build        # = bun run dist && bun run promote:self
```

`bun run build` は `scripts/package.ts` が manifest から発見する全ハーネス(claude / codex / cursor / kimi / kiro / kiro-ide / opencode / pi の 8 面)へ `packages/framework/core/` と `packages/framework/harness/<name>/` を投影し、続いて `scripts/promote-self.ts --apply` がプロジェクトローカルのセルフインストール面(`.claude/`)を更新する。`dist/` とセルフインストールツリーは未追跡のローカル生成物であり、正本ではない。

## 完了条件

1. `bun install` が exit 0(`Checked <n> installs ... (no changes)` を期待)。
2. `bun run build` が exit 0 で、8 ハーネス全てについて `regenerated` 行が出ること。
3. ビルド後に追跡ファイルが不変であること — `git status --short` の出力に `dist/` および `.claude/` 配下の追跡ファイルが現れない。
4. `bun run typecheck` が exit 0。
5. `bun run lint` が exit 0(warnings は既存ベースライン、赤ではない)。

## 本 intent 固有の注意

- 台帳の resync 対象(`cid:build-and-test:bt-ledger-resync` ほか): `amadeus/spaces/default/specs/tla/model-map.json` の実装ハッシュピン、`tests/.coverage-patch-allowlist.json` の意味的セレクタ、`tests/.coverage-registry.json`。本 intent の実装 PR 群は着地時に resync 済みで、本断面での drift は不在(実測は `build-test-results.md` §台帳 drift 参照)。
- `bun tests/gen-coverage-registry.ts` を回す場合は必ず `bun run build` の後に行う(`cid:code-generation:c5-regen-needs-build`)。
