# Logical Components — answer-evidence-sensor

上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1/P-2)、`../nfr-requirements/security-requirements.md`(S-1〜3)、`../nfr-requirements/scalability-requirements.md`(SC-1/2)、`../nfr-requirements/reliability-requirements.md`(R-1〜3)、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(純関数2段パイプライン)。

## 論理構成(実装ファイルへの写像)

| 論理コンポーネント | 実装先 | NFR 対応 |
|-------------------|--------|---------|
| ArgParser | main(amadeus-sensor-answer-evidence.ts) | CLI 誤用 exit 1(AC-1e) |
| TargetFilter | evaluateAnswerEvidence 段1(basename) | P-2/AC-1d |
| CutoffGate | evaluateAnswerEvidence 段2(セグメント parse+定数比較) | AC-2a-c |
| PredicateMapper | evaluateAnswerEvidence 段3(述語写像) | AC-1c/R-3 |
| Manifest | amadeus-answer-evidence.md | P-1(timeout)/P-2(matches) |
| CutoffConstant | amadeus-lib.ts export | ADR-3/R2 緩和 |

## 依存方向

ArgParser→evaluateAnswerEvidence→(amadeus-lib 述語+定数)の一方向 — 循環なし。
