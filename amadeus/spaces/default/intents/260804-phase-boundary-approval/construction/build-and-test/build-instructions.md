# Build Instructions — fix-2143-phase-boundary-approval

上流入力(consumes): `construction/fix-2143-phase-boundary-approval/code-generation/code-generation-plan.md`、`code-summary.md`。

## ビルド手順

1. `bun install`(依存追加なし — lockfile 不変)
2. `bun run build` — dist 7ハーネス投影 + `promote:self`(self-install ツリー同期)。正本は `packages/framework/` 配下のみ編集済みで、投影は本コマンドの生成物(C-3)。

## 検証コマンド

- `bun run typecheck`(tsconfig + tests)
- `bun run distribution:check` / `bun run source-only:check` — 投影同期の検査(NFR-2)

## 実測

2026-08-05(branch `bolt/2143-phase-boundary-approval`、HEAD `eb1257c08`): build / typecheck / distribution:check / source-only:check すべて exit 0。
