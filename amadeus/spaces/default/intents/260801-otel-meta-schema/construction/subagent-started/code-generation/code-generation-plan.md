# Code Generation Plan — U4 subagent-started(Bolt 3)

上流入力(consumes 全数): functional-design 3成果物、nfr-design 5成果物、requirements.md FR-SUB-1〜4 — canonical 79 化のガード目録・lifetime 決定的突合・Purpose 統制を FD から、fail-open/fail-closed 面区別を nfr-design から導出。

## 実行形態

gated swarm batch 3(worktree `bolt-subagent-started`)。TDD 必須・PR 1本・NFR-4 同一変更。

## 経過(実績)

1. builder が**実装前停止** — claude に subagent-start シームが存在しない実測(7ハーネス中 kimi のみ)。副次発見: 契約の 79 化ピン目録に漏れ2件(t81:229・drift 5値目)
2. **ユーザー裁定 = 案A**(PreToolUse{Task} を claude へ新規配線、kimi は既存 SubagentStart、他4ハーネスは非対称を docs 明記)。散文16箇所は count-free 化
3. 前任 builder のセッション上限断 → 引き取り builder が監査(cg-handover-plan-audit)+是正1件で完遂
4. PR レビュー iteration 1 REVISE(Critical: 片割れ検知欠落 / Major: 両側 ID 不一致フォールバック)→ FD 契約準拠の執行是正(TDD Red 8 fail → Green 13 pass)→ iteration 2 READY(GoA 1)
