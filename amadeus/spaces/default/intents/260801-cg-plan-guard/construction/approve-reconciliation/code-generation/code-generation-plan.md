# Code Generation Plan — approve-reconciliation(U3、Bolt 3)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、nfr-design 5成果物、requirements.md、components.md、component-methods.md

- 実行形態: gated swarm(batch 3、driver=subagent floor)。worktree `bolt-approve-reconciliation`(base `a6cfbddab` = Bolt 1+2 着地後)。
- 本計画は finalize 後の事後作成(cid:code-generation:swarm-unit-artifact-backfill)。

## スライス計画(TDD、実績)

| # | スライス | Red(verbatim)→ Green |
|---|---|---|
| 1 | C4a swarmEvidenceVerdict(純関数、AC-2c)| `Export named 'swarmEvidenceVerdict' not found` → unit a |
| 2 | 判定本体(missing/satisfied、DeclaredBatch 再利用)| `+ "kind": "satisfied"` vs `- "kind": "missing"` → unit b |
| 3 | handleReport approve 経路のガード配線(AC-2a)| `Expected: "error"` / `Received: "done"`(修正前は素通り)→ integration a |
| 4 以降 | pin テスト群(通過面・非発動面)— 健全性は落ちる実証5注入で担保 | injection 1-5 全て赤→復元 diff 0 |

## 検証計画(実績 = 全 exit 0)

typecheck / lint / dist:check / promote:self:check / coverage:ci(9792 assertions PASS)/ patch gate 59/59 covered / complexity / registry regen。corpus sweep 11 record(拒否5+通過6、FD 期待表と完全一致)。allowlist 59 エントリ機械 remap+直読照合、straddle 膨張(13→85行)を検出しヘルパー移設で waiver 継承 fail-open を回避。
