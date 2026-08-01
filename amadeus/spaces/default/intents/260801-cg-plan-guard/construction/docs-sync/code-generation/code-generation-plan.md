# Code Generation Plan — docs-sync(U4、Bolt 4)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、requirements.md、components.md、component-methods.md

- 実行形態: gated swarm(batch 4、driver=subagent floor)。worktree `bolt-docs-sync`(base `172193cb1` = Bolt 1-3 着地後)。docs のみ、コード変更なし。
- 本計画は finalize 後の事後作成(cid:code-generation:swarm-unit-artifact-backfill)。

## 手順(実績)

1. BR-U4-4: 対象語彙(bolt_dag_absence / planIntegrityVerdict / guardMessage / swarmEvidenceVerdict / invoke-swarm)の repo 全域 grep で対象面棚卸し(docs+正本知識)。
2. BR-U4-1: 着地実装(Bolt 1-3 の base 内コード)からマーカー・出口定数の実文言を直読して記述(記憶起草なし)。
3. 12-state-machine / 08-construction-and-swarm / 04-phases-and-stages の en/ja 6面へガード3種(発行 redirect/violation・approve 突合・DAG absent/invalid)の発動条件・3部様式・出口を追記(BR-U4-2/U4-3 準拠)。
4. 検証: t132 / t174 / docs 系スイート / typecheck / lint / dist:check 全 exit 0。paths-ignore 盲点は非該当を実測確認。

## 検証(実績)

t132 / t174 / docs 系スイート / typecheck / lint / dist:check 全 exit 0(docs は dist 外 — BR-U4-5)。対象面は BR-U4-4 の実装時 grep が FD 表を上書きする(08-rule-system 系は grep 非該当、実対象は 08-construction-and-swarm — code-summary の棚卸し欄参照)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T21:29:56Z
- **Iteration:** 1
- **Scope decision:** none

Landed commit c02a85cfb / PR #1954 (merged 8e5dc6c47) matches code-summary verbatim (markers, SWARM_* constants, verdict table, en/ja 6-file pairing +74) against amadeus-lib.ts / amadeus-orchestrate.ts; 01-architecture non-applicability reasoning holds. BR-U4-1..5 / U4-AC-1..3 satisfied. Two advisory minors (plan-file H2 floor, FD-table supersession note) were fixed by the conductor before gate.

### Findings

- Minor (advisory, fixed): code-generation-plan.md had 1 H2 under the required-sections floor — second H2 added.
- Minor (advisory, fixed): FD table row 08-rule-system 系(該当時) superseded by implementation-time grep to 08-construction-and-swarm — supersession note added to code-summary (BR-U4-4 authorizes the re-grep).
