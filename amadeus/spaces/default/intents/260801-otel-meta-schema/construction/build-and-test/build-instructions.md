# Build Instructions — 260801-otel-meta-schema

上流入力(consumes 全数): 各 unit の code-generation-plan.md(全6 unit — 実行形態と経過の正本)と code-summary.md(全6 unit — 変更面・検証実測・PR 着地の正本)、requirements.md NFR-3/NFR-4 — ビルド手順は NFR-4(dist 二重 module graph)の同期要件から導出した。

## 手順

1. `bun install`(依存解決 — lockfile 準拠)
2. `bun run typecheck`(tsc --noEmit、strict)
3. `bun run lint`(Biome — formatter 無効)
4. core 変更時のみ: `bun scripts/package.ts`(dist 7ハーネス再生成)+ `bun run promote:self`(self-install 同期)
5. `bun run dist:check` / `bun run promote:self:check`(drift guard — 生成物一致の機械確認)

## 本 intent での実績

全6 Bolt で上記手順を builder が実行し、conductor が referee check(swarm)で独立再検証した。U6(docs)のみ core 非接触だが、裁定反映(intent.id 改名+bolt/unit 追加)で core を触ったため最終的に全 Bolt が dist 再生成込み。
