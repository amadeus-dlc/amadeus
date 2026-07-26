# 性能要件 — U1 harness-capability-matrix

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 適用可否(N/A の判定)

U1 はコードを搬送しない文書+プローブ Unit である。business-logic-model の「U1 の『ロジック』= プローブ実施と判定の手順(コード変更なし)」と business-rules の BR-U1-1〜7(すべて文書規則で、検証も §12a の成果物レビュー)のとおり、稼働時に実行されるサービスコードが存在しない。したがって、スループット・レイテンシ・同時実行数といった稼働時性能指標は本 Unit に **N/A** とする。

requirements の NFR-2(起動レイテンシ非退行)は自動 compose の no-op 高速路(FR-3c)に対する要件であり、その責務は U2 walking-skeleton-claude が負う。U1 の成果物(能力マトリクス文書)はコンパイル時・実行時いずれのホットパスにも介在しないため、NFR-2 の数値予算は U1 には配賦されない。

technology-stack の「新規外部パッケージもゼロ」「plugin 機構のために runtime dependency を追加しない」方針は、性能最適化のための依存追加(キャッシュライブラリ等)も同様に不要であることを裏づける。常駐 service 向けの cache / 水平スケール / circuit breaker を機械適用しない。

## プローブ所要時間の扱い(受け入れ基準ではない)

business-logic-model のプローブ手順(面の列挙 → 一次資料の直読 → 実測プローブ → クラス割当 → degrade 契約起草)は、7 ハーネス × 6 面に対する一度きりの人手・CLI 実測作業である。その所要時間は成果物の品質に影響せず、繰り返し実行される経路でもないため、時間予算を設けない。

- 合否: 性能に関する受け入れ基準は設けない(上記 N/A 根拠が反証可能な不存在根拠を構成する)。プローブの決定性・再現性は reliability-requirements.md 側の要件で担保する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:43:33Z
- **Iteration:** 1
- **Scope decision:** none

consumes 4 点の実参照・BR/FR 引用の逐語一致・technology-stack 実測所見の裏取りを確認。N/A は反証可能な根拠付きで常駐 service パターンの機械適用なし。未実測数値の基準混入なし。

### Findings

- None
