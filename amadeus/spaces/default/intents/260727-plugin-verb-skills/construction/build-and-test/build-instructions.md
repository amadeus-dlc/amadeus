# Build Instructions — 260727-plugin-verb-skills

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(U1〜U4 の各 code-generation 成果物 — 実装対応と検証エビデンスの正本)

## ビルド手順(正本→生成物の同期)

1. `bun scripts/package.ts` — dist 全7ハーネス再生成(code-summary.md の各 Bolt が実施した手順の再現形)
2. `bun run promote:self` — self-install ツリー同期
3. drift 確認: `bun run dist:check` / `bun run promote:self:check`(いずれも exit 0 が完了条件)

## 本 intent 固有の注意

- amadeus-plugin.ts / amadeus-utility.ts / amadeus-graph.ts / amadeus-runner-gen.ts / skills/amadeus-plugin が正本(code-generation-plan.md の変更面)。dist/self-install の手編集禁止
- runner drift: `bun .claude/tools/amadeus-runner-gen.ts check`(29 runners in sync が期待値)
