# Initiative Brief — OTel Upstream 統合

上流入力（consumes 全数）: `intent-statement.md`、`scope-document.md`、`intent-backlog.md`、`feasibility-assessment.md`、`constraint-register.md`（参照済み）、`competitive-analysis.md`（market-research SKIP のため不存在）、`team-assessment.md`（team-formation SKIP のため不存在）、`wireframes.md`（rough-mockups SKIP のため不存在）

## Intent と問題

`intent-statement.md` どおり — 現行方式（#1628）は耐久性・隔離の半分を達成したが、因果の正確さ・語彙の一致・Context の統一という「本来の意味での可観測性」が欠けている。TypeScript ロジックの唯一の上流を OTel API ファミリーに統合して是正する。

## 実現可能性とリスクの要点

`feasibility-assessment.md`: **実現可能（条件付き）**。不確実性4点（Logs API stability・Bun Context・bundle 構成・同期 I/O 性能）はすべて Phase 1 walking skeleton で実測検証する。最大リスクは Bun Context Manager の未検証性（R-1）で、hard gate の最初の検証項目に設定済み。RAID の R-1〜R-6 と対応は Q2 で受容済み。

## Scope 境界

`scope-document.md` どおり — In: Phase 1-6＋横断（Event Registry drift guard・mixed schema merge・削除ゲート・全 harness 同期）。Out: #1672 非目標6件。MoSCoW: Must = Phase 1-4／Should = Phase 6／Could = Phase 5。詳細な proto-Unit は `intent-backlog.md`（B-01〜B-11）。

## 体制

solo オーナー（全ゲート承認者）＋ conductor。実装の並行化は Construction の swarm（Bolt worktree、Phase 内 module 単位の Unit）で行う（Q3 確定）。`team-assessment.md`・`wireframes.md`・`competitive-analysis.md` はスコープ上の SKIP ステージ成果物のため不存在（`constraint-register.md` OC-1 と整合）。

## Go/No-Go 推奨

**Go — ただし「Phase 1 までの go」**（Q1/Q4 確定）。Phase 1（#1678）が不合格なら本番正本へ変更を波及させず撤回し #1628 へ戻す。Phase 2 以降の go は Phase 1 合格時に改めて判断する。
