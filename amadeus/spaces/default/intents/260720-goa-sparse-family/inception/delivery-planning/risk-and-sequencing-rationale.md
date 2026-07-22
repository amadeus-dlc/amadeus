# Risk & Sequencing Rationale — 260720-goa-sparse-family

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

- 順序: FD(スパース文法+ADR-4 抽出契約の詳細化)→ CG → B&T の直列(requirements.md FR-1(iii) の委譲解決が実装前提)。
- リスク再掲(feasibility raid-log 継承): R-1(canonical round-trip 保護)→ sweep+t238 回帰で緩和 / R-2(旧 record 互換)→ E-GSFRA2 ピン維持で解消済み / R-3(e2 非交差)→ 監視継続。
- requirements.md の留保面(FR-1 の norm PR トラック分離等)は Bolt スコープからも除外を維持。順序の根拠: unit-of-work-dependency.md(依存なし=並行不要)+components.md(変更面の凝集・185-280行)+unit-of-work-story-map.md(全4ジャーニーが単一 Unit で充足)。team-practices.md の Testing Posture(回帰第一級)を B&T の完了条件に継承。
