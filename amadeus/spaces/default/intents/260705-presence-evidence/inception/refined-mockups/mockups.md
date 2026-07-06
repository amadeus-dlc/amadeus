# Mockups — Presence Evidence（260705-presence-evidence）

上流入力: [wireframes.md](../../ideation/rough-mockups/wireframes.md)、[user-flow.md](../../ideation/rough-mockups/user-flow.md)、[requirements.md](../requirements-analysis/requirements.md)

## 適用判断

成果物は文書（audit-format.md への追記）であり、UI・CLI の新規挙動はない。mockup は「追記後の文書の骨子」で代替する。

## 追記の骨子（英語で執筆。位置と見出しレベルは functional-design で確定 = O-1。以下の `###` は仮置き）

```text
### Evidence verification boundary (docs-only declaration)

- What is verified: reference format + existence of the referenced
  DECISION_RECORDED / GATE_APPROVED in THIS intent's audit shards.
- What is deliberately NOT verified: machine proof that the evidence
  originated from a human (presence correlation was evaluated and
  rejected — see rationale below).
- Defense lines: (1) GUARD_EXEMPTED is always audited with the referenced
  decision in the same audit trail, (2) the human-operated PR gate,
  (3) multi-agent operation records approval transcriptions only upon
  relay-approval receipt (team.md).
- Rejected alternatives: presence correlation (double contract-level cost,
  limited prevention: piggybacking on frequent HUMAN_TURN mints; same-second
  timestamp ties — audit timestamps have second granularity — force window
  semantics) / GATE_APPROVED-only evidence (conflicts with the
  dispatch-transcription operation; semantic mismatch).
- The HUMAN_TURN mint discipline (#497 decision 8) is unchanged.
- Decided by human approval (Issue #506; prompted by the PR #505 Bugbot
  review; recorded as DECISION_RECORDED requirements-analysis in intent
  260705-presence-evidence, 2026-07-06).
```
