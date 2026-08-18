# Delivery Planning 質問ファイル — 260817-inception-cost-batch

## 質問ゼロの根拠と Bolt 計画承認

戦略質問・per-Bolt 質問とも、既決事項と上流成果物から一意に導出される(0 questions 形式、blank タグなし):

- **順序ヒューリスティック**: walking-skeleton-first(org.md/project.md が self-feature に義務付け)+トポロジ順(`unit-of-work-dependency.md` の DAG が U1→U2 を一意に強制 — 経済逸脱なし)
- **Bolt 粒度**: 1 Unit = 1 Bolt(PR 粒度 = Bolt ごとの既定、`cid:units-generation:c1`)
- **並行性**: 厳密直列(DAG 依存+共有ファイル `reverse-engineering.md`+record 同梱 PR の `intents.json` 直列着地)
- **外部依存**: gh CLI / GitHub API(optional・fail-open — `external-dependency-map.md` に記載)
- **mob 割当**: team-formation SKIP のため全 Bolt を amadeus-developer-agent(builder subagent)が実装、conductor が統合(`team-allocation.md`)

Bolt 計画承認は Intent Autonomy full の梯子で確定: AUTO_DECIDED `auto-decision-d41c65f2f7beb6923659931aa1dae236`(2026-08-17、grant `intent-grant-edcb102bc13cb317c58295042495ae77`)。

## 決定トレース

- walking-skeleton の対象層・DoD・confidence hypothesis は `bolt-plan.md` の per-Bolt 記載を正とする
