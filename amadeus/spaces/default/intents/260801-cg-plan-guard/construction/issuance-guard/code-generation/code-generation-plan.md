# Code Generation Plan — issuance-guard(U2、Bolt 2)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、nfr-design 5成果物、requirements.md、components.md、component-methods.md

- 実行形態: gated swarm(batch 2、driver=subagent floor)。worktree `bolt-issuance-guard`(base `2d09331af` = Bolt 1 着地+origin/main 再接地後)。
- 本計画は finalize 後の事後作成(cid:code-generation:swarm-unit-artifact-backfill)。

## スライス計画(TDD、実績 = 4 Red→Green)

| # | スライス | Red(verbatim)→ Green |
|---|---|---|
| 1 | C3 guardMessage(3部 assembler+マーカー3定数)| `Export named 'GUARD_OBSERVED_MARKER' not found` → t403 unit a-e |
| 2 | C2 planIntegrityVerdict(3値判定・純関数)| `Export named 'AUTONOMY_LADDER_EXIT' not found` → t403 unit f-k |
| 3 | C1 emitSwarmOrPerUnit(単一発行 chokepoint、redirect→ask 配線)| `Expected to contain: "Observed: "` → t403 integration a-c |
| 4 | planGuardMessage(単一合成入口)| `ReferenceError: planGuardMessage is not defined` → t403 unit l-o |

## 逸脱処理計画(実績)

- 未消費 absence フィールド → 実装停止・選挙 E-CPG-U2ABS(2-0、choice 1: 除去)→ 是正コミット e98d6187c+FD 申告付き是正。
- t400/t401 の HEAD 衝突 → t403 へ改番(執行判定 — 機械的事実)。
- batch 番号の合成位置 → canonical 型 verbatim 維持+lib 内 `planGuardMessage(verdict, batchNumber)`(執行判定、business-logic-model へ申告注記)。

## 検証計画(実績 = 全 exit 0)

typecheck / lint / dist:check / promote:self:check / coverage:ci PASS / patch gate 93/93 covered(allowlist 追加 0)/ complexity / registry regen。落ちる実証3注入(exit 部欠落・#1892 欠陥再現・default 開放)各 red→revert 完遂。
