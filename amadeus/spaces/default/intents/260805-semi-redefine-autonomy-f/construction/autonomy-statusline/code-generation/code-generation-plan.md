# Code Generation Plan — `autonomy-statusline`(#2253、swarm batch 1 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

swarm 経路のため本 plan は finalize 後の事後作成(`cid:code-generation:swarm-unit-artifact-backfill`)であり、実績 = builder report(worktree agent-a5eb49d09027e8076、最終 HEAD `93f298ff2574a4fa3cf1d6e37de6ef9545f07738`)からの転記である。

## 実装ステップ(実績)

1. **t448 失敗テスト先行(TDD Red)** — `tests/unit/t448-autonomy-statusline-segment.test.ts`(business-logic-model.md 決定表 5 ケース、shipped surface `dist/claude/.claude/tools/amadeus-lib.ts` から in-process import — t168 様式)。Red 実測: `Export named 'autonomySegment' not found` / exit 1。
2. **最小実装(Green)** — `packages/framework/core/tools/amadeus-lib.ts` へ `autonomySegment` export(getField 読取 → canonical `AutonomyMode` literal 配列との全一致判定 `.some((known) => known === mode)` → bare mode 名 / `""`)。Green: 5 pass / exit 0。
3. **配線** — `packages/framework/core/hooks/amadeus-statusline.ts` の active workflow 分岐(business-logic-model.md 経路決定木の第 4 分岐のみ)。
4. **裁定 E-SRA-CG1(B)適用** — C14 逐語配線が main() CCN 26→27 で shrink-only ratchet と両立不能(lizard 2 版対照の決定的実測)→ named ヘルパー `withAutonomySegment(line, state)` へ抽出(匿名増ゼロ・C14 逐語行と返り値ドメインは保存)。
5. **registry 再生成** — 新規 export で enumerate 母集団が変化(`cid:code-generation:integration-registry-regen`)。
