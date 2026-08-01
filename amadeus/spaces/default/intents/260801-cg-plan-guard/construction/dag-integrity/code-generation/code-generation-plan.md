# Code Generation Plan — dag-integrity(U1、Bolt 1 = walking skeleton)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、nfr-design 5成果物、requirements.md、components.md、component-methods.md

- 実行形態: gated swarm(batch 1、driver=subagent floor、resolve → prepare → fan-out(builder 1体)→ check → finalize)。worktree `bolt-dag-integrity`(base `66755b28c`)。
- 本計画は finalize 後の事後作成(cid:code-generation:swarm-unit-artifact-backfill)— 実績 = builder 報告+着地コミットに基づく。

## スライス計画(TDD、実績)

| # | スライス | Red → Green |
|---|---|---|
| 1 | `computeBoltDagOutcome`(dag/absent/invalid の3値 union、C5)+ compile 分岐配線 | seam 不在 SyntaxError → 実装(粒度逸脱は builder 申告済み — 挙動 Red は pre-fix 面切替で verbatim 捕捉) |
| 2 | `readBoltDagAbsence`(C6 消費者 (i)、amadeus-orchestrate.ts) | Export not found → 実装 |
| 3 | FR-5: 260712 record の edge block 是正(3構造+H2 floor) | corpus sweep 38/39 NOT-OK → 39/39 ok |
| 4 | t133 契約改訂(宣言済み: 観測点を「node omitted」→「非ゼロ exit」へ、6a/6b 分割)+ fixture 現実化6ファイル | 49 assertion 赤 → 全解消 |

## 検証計画(実績 = 全 exit 0)

typecheck / lint / dist:check / promote:self:check / coverage:ci(725 files PASS)/ patch gate(71/71 covered、allowlist 追加 0)/ project gate / complexity gate。allowlist 58/59 エントリ機械 remap+直読照合(c1-allowlist-mechanical-remap)。
