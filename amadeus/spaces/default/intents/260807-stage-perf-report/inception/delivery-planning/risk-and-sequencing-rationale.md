# Risk and Sequencing Rationale — 260807-stage-perf-report

上流入力(consumes 全数): unit-of-work-dependency(エッジなし DAG — 順序空間が自明である根拠として消費)、unit-of-work(U1 単一 Unit・複雑度 M を編成判断の入力として消費)、requirements(A-1 仮説・NFR-5 落ちる実証をリスク登記の正本として消費)、components(規模見積り 700〜900 行を単一 Bolt 妥当性の根拠として消費)、unit-of-work-story-map(FR 全数写像を Bolt スコープ完全性の根拠として消費)

## 順序決定の根拠

- **順序ヒューリスティック: 適用外(順序空間が自明)** — Unit が 1 つ・Bolt が 1 つのため、WSJF / risk-first / value-first / walking-skeleton-first のいずれの経済比較も対象を持たない。2.7 のトポロジー(エッジなし)からの逸脱もない
- **Bolt 粒度の裁定(Q1 = A、2026-08-07T15:44:04Z ユーザー承認)**: 単一 Bolt を採用。2 Bolt 分割(スケルトン先行)は、(i) 単一凝集ファイルで中間契約の設計コストが純増 (ii) 並列の実益なし (iii) Bolt=PR 原則で 1 PR に焦点が収まる、を理由に不採用
- **walking-skeleton の扱い**: project.md Mandated により Bolt 1(唯一の Bolt)のゲートを walking-skeleton ゲートとして維持する — 分割せずともゲート要件は充足される(裁定不要の執行事項)

## リスク登記(最先着手すべきリスク)

| リスク | 影響 | 緩和(Bolt 内順序としての対処) |
|--------|------|-------------------------------|
| R-1: idle 減算の非退化(A-1 仮説) | net 統計が退化すれば中核価値が不成立 | RE D1 で実測済み(1,532 窓中ゼロ化 30 のみ)— Bolt 内で C2/C3 を早期に実コーパスへ当てて再確認 |
| R-2: bun coverage の spawn 盲点 | patch gate 赤で出荷遅延 | ADR-5 の純関数分離+in-process seam を実装初手から適用(NFR-3) |
| R-3: 除外バケット報告の検証劇場化 | 偽の信頼 | NFR-5 落ちる実証を DoD に明記(fixture 注入で赤の実働確認) |
| R-4: 60 秒性能上限(NFR-1) | 回帰上限超過 | RE 試作 aggregator が数秒で完走済み — 統合テストで回帰上限を固定 |

いずれも単一 Bolt 内の実装順・検証順で対処し、Bolt 分割を要しない。
