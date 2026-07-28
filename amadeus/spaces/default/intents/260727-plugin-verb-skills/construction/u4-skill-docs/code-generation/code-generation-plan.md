# Code Generation Plan — U4 u4-skill-docs(Bolt 4 / 終端)

上流入力(consumes 全数): business-logic-model.md(導線フロー・投影3系統)、business-rules.md(BR-U4-1〜6)、domain-entities.md(投影配線の3系統表)、performance-design.md(N/A 維持)、security-design.md(固定 verb・不可逆明示)、unit-of-work.md(U4 境界+テスト予算)、requirements.md(FR-3・FR-5)

## 実装計画(builder ディスパッチ内容の記録)

1. SKILL.md 新設(BR-U4-1 mirror 様式、business-logic-model.md Step 1-3、security-design.md の不可逆明示、FR-3c の count-free 導出形、BR-U4-2 マーカー不含)
2. 投影 7面(domain-entities.md の3系統、BR-U4-4 の grep 再列挙)
3. docs 19-plugins EN/JA 入口再構成(BR-U4-5 面区別、requirements.md FR-5b)
4. スキル検査テスト(BR-U4-6、unit-of-work.md の申告済み予算 +40〜80)
5. dist×7/self-install 再生成+全検証+patch gate(performance-design.md の追加負荷なし)

## builder 停止と conductor 裁定(deviation-stop の実例)

builder は実装前に停止し「設計の helper registry(mirrorCoreSkillDirectory)は Intent Mirror 専用 closed registry(projections.ts:1、t285 pin)で plugin スキルに不適」を実測報告 → conductor 裁定: literal entry(election 前例)×7面へ是正(ADR-3 に追記)、テスト層 = integration t354(fs-tests-integration-first)、列挙ガード追随を承認。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-28T01:31:39Z
- **Iteration:** 1
- **Scope decision:** none

SKILL.md・7面 literal 投影(ADR-3 是正後)・docs EN/JA 同期・t354/t31 が FD/NR 契約と一致し、検証再実行 green(dist:check・t354+t31 exit 0)。slop・互換シムなし。残存指摘なし。

### Findings

- None
