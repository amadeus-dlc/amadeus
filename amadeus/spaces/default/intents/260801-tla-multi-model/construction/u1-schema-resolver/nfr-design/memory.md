# NFR Design Memory — u1-schema-resolver

## Interpretations

- 2026-08-01T21:55:00Z — produces_kinds に従い library kind の本 Unit では performance-design.md / security-design.md の2書のみ生成し、scalability / reliability / logical-components は N/A 扱いで requirements の一段落根拠 + 前方参照を performance-design.md §4 に集約した; 依頼文の "typically performance-design.md + security-design.md" と整合
- 2026-08-01T21:55:00Z — reliability 系の機構(fail-closed・dual-copy)は security-design.md §2/§3 に写像した; fail-closed は NFR-2 で security 要件と共有するため重複記述を避けた

## Deviations

- 2026-08-01T21:55:00Z — questions ファイル(nfr-design-questions.md)は生成しなかった; per-unit ARTIFACT-ONLY 反復として上流 artifacts が全て reviewer READY 済みで設計判断の余地が残っていないため

## Tradeoffs

- 2026-08-01T21:55:00Z — 新規性能機構(キャッシュ等)を設計しない判断を明文化した; 代替(予防的最適化)は ADR-8 measure-first と scalability-requirements の過剰設計禁止に反するため却下

## Open questions

- 2026-08-01T21:55:00Z — なし(次 stage は code-generation、t402 + スキーマ表テスト拡張の赤先行)
