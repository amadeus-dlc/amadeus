# Build Instructions — 260807-subagent-start-pair

上流入力(consumes 全数): code-generation-plan（fix-2297-wiring / fix-2303-dispatch-tool の実装ステップ正本 — ビルド対象面の導出元）、code-summary（両 unit の build 実測の一次転記元）

## ビルド手順

1. `bun install --frozen-lockfile`
2. `bun run build` — manifest が発見する全ハーネス（claude / codex / cursor / opencode / kimi / kiro / kiro-ide 等、packager の検出集合を正とする）の dist / self-install 面を再生成
3. build 後 `git status` で tracked 差分が意図した編集のみであることを確認（source-only 境界: dist は未追跡ローカル生成物）

## 本 intent での対象面

- Unit A（#2297）: `packages/framework/harness/claude/hooks/amadeus-dispatch.ts`（HOOK_PATHS スロット追加 + export）→ build で `.claude/hooks/amadeus-dispatch.ts` へ投影（正本と diff 一致を code-summary で実測済み）
- Unit B（#2303）: `packages/framework/core/tools/amadeus-lib.ts` / `packages/framework/core/hooks/amadeus-log-subagent-start.ts` / `packages/framework/core/knowledge/amadeus-shared/audit-format.md` → 全ハーネス dist へ投影（AC-B5 grep で dist/.claude 面 0 件 = 伝播完了を実測済み）

## 検証

- `bun run typecheck`（strict tsc 2構成）
- `bun run lint`（Biome）
- `bun run source-only:check`（source-only 境界）

両 unit とも builder 実測で全 exit 0（code-summary 転記）。conductor 再実行でも typecheck / lint exit 0。
