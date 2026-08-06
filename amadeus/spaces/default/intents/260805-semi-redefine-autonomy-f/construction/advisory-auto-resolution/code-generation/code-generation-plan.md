# Code Generation Plan — `advisory-auto-resolution`(#2253、swarm batch 2 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

swarm 経路のため本 plan は finalize 後の事後作成(`cid:code-generation:swarm-unit-artifact-backfill`)であり、実績 = builder report(隔離 worktree `agent-a89c39df3edfac2e0`、最終 HEAD `2c42d13e6ae6031ecd1ccb292685efb74ba6ef8f`)からの転記である。base は origin/main(`00da4bdda`)+ batch 1 の 3 bolt ブランチのマージ(`2b0da2153`、ls-files -u 0)。

## 実装ステップ(実績)

1. **U-3 lock 実測** — FD D4 は `withAuditLock` 4 箇所(観測時点 `6191bbfc`)だが、マージ base では **7 箇所**(#2242/#2268 が 3 箇所追加)。全 7 箇所の所属関数と呼び出し元を実測し、C16 連鎖(`guardAdvisoryChoices` 解放後 → `commitProductionQuestionDecision` → `recordAdvisoryChoice`)が厳密逐次・非重複であること、`withAuditLock` が per-identity reentrant(`amadeus-lib.ts:6133-6140`)であることを確認 — 停止条件非該当と判定して続行。
2. **TDD(Red→Green)** — t457(unit: 選択肢空間)/ t459(unit: receipt provenance)は export 不在の Red を実測後に実装。t458(integration)の唯一の Red は自作 assertion の誤り(auto `run-now` receipt 後の checkpoint は `runRequired: true` で保持が正 — R9/FR-ADV-5 のスコープ外)で、実測挙動へ assertion を是正。
3. **本体実装**(`93b341311`)— `amadeus-advisory-choice.ts`(C16 auto 解決連鎖+C17)、`amadeus-orchestrate.ts`(two-branch guard)、`amadeus-intent-autonomy-production.ts`(`effectClassifications`・`PROHIBITED_EFFECTS` export)。既存 6 テストファイルの receipt 形状同期(schema 1→2、`humanTurn:` → `provenance: { kind: "human-turn", … }` — FR-ADV-3 の置き換え命令に基づく機械的改訂、assertion 弱体化なし)。
4. **落ちる実証 ×3** — FR-ADV-4 主(選択肢空間強制 → t457 赤)/ FR-ADV-2(認可強制 true → t458 赤)/ FR-ADV-4 副(`quality-waiver` を PROHIBITED_EFFECTS から除去 → t459 赤)。各回 `git checkout --` 復元+残渣 grep 0。
5. **t07 回帰の自己検出と修正**(`2c42d13e6`)— autonomy スタックの静的 import が prompt hook(mint-presence)のロードパスへ乗り t07 の 300ms 予算を超過(merge base 対照で帰属確定)→ 3 呼び出し面を lazy `require` 化(型は `import type` で消去)。
