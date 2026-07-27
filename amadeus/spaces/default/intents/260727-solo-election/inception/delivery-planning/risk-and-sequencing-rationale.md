# Risk & Sequencing Rationale — solo-election

上流入力(consumes 全数): raid-log.md(R-01〜R-05)、bolt-plan.md(順序)、unit-of-work-dependency.md(依存)、unit-of-work-story-map.md(割れたケースのジャーニー — 順序3の受け手)、components.md(TLA/テストの変更対象 — 順序2・4の対象面)、team-practices.md(落ちる実証・regression の現行 Testing Posture 整合)、requirements.md(FR-06 無退行)。

## 順序の根拠

1. **U1 先行**: U2 の SKILL/ノルム文面は U1 の実装語彙(split 等)を参照する — 未実装挙動の文書先行は mechanism-cite 違反となるため逆順は不可。
2. **Bolt 1 内で落ちる実証を最初に置く**: R-01(tally 変更のチーム退行)の緩和は「修正前挙動の実証→修正→regression」の順でのみ成立する。修正後に実証を書くと偽の落ちる実証になる。
3. **実選挙スケルトンを Bolt 1 の最後に置く**: 集計規則が固定される前に実選挙を回すと、誤った裁定が elections store(append 的な監査面)へ残る — 前 intent 成果を汚す窓を順序で封じる(intra-bolt-order-as-risk-control)。
4. **TLC 探索は dist 再生成前**: 形式検証の赤は実装の巻き戻しを要するため、生成物同期より前に確定させる。

## リスク対応(RAID 引き継ぎ)

- R-01(チーム退行)→ Bolt 1 手順 (1)(3)。R-02(subagent 完遂)→ U2 の定型文言+Bolt 1 スケルトンで実測。R-03(相関誤り)→ 受容済み・運用実績で再裁定。R-04(アンカリング)→ U2 テンプレ検査テスト。R-05(resume)→ ADR-4 で設計固定済み、Bolt 2 の SKILL 文面へ。
