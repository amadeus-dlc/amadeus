# Build Instructions: pr-convergence plugin

上流入力(consumes 全数): code-generation-plan、code-summary(U1/U2/U3 の各 unit — construction/<unit>/code-generation/)、unit-of-work

## ビルド手順

1. `bun install` — 依存解決(bun ^1.x、ランタイム追加なし)
2. `bun run build` — packager 検出の全ハーネス(claude/codex/cursor/kimi/kiro/kiro-ide/opencode/pi)の dist 再生成+promote-self。`assertPluginImportClosure` が pr-convergence の tools 4本の import 閉包を検査(NFR-4 — write-0 拒否)
3. `bun run typecheck` — tsc --noEmit ×2 プロジェクト
4. `bun run lint` — Biome(formatter 無効)

## 成果物の構成

- core: `packages/framework/core/tools/amadeus-plugin-compose.ts` / `amadeus-plugin.ts`(U1 seam bridge)、`packages/framework/core/sensors/amadeus-pr-convergence-report-format.md`+検査本体(U3 C8)
- plugin バンドル: `plugins/pr-convergence/`(plugin.json / stages/pr-convergence.md / tools/ 4本)
- テスト: t444〜t450(+t93 sentinel 同期)

## ビルド検証の実測(各 Bolt+conductor 統合断面)

- U1 builder: build exit 0(tracked 不変)/ U2 builder: build exit 0 / U3 builder: build exit 0(8ハーネス+import closure 通過)
- conductor(cherry-pick 統合後): build exit 0 ×2回(batch1 後・batch2 後)
