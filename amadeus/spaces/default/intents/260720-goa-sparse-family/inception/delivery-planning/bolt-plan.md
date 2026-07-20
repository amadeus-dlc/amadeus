# Bolt Plan — 260720-goa-sparse-family

上流入力(consumes 全数): requirements.md(FR-1〜FR-4)、components.md(規模見積り 185-280行)、unit-of-work.md(U1 定義)、unit-of-work-dependency.md(依存なし・YAML edge)、unit-of-work-story-map.md(ジャーニー別価値)、team-practices.md(live プラクティス無変更の前提)

## Bolt 列(単一 Bolt)

| Bolt | Unit | 内容 | 見積り |
|---|---|---|---|
| 1 | goa-sparse-acceptance(unit-of-work.md U1) | FD(スパース文法確定)→ CG(requirements.md FR-1〜FR-4 実装)→ B&T | 185-280行(components.md 見積り) |

Bolt の価値対応は unit-of-work-story-map.md のジャーニー4行どおり(persist 書き手/CLI 利用者/蒸留実装者/CI)。team-practices.md のとおり本 intent でのプラクティス変更はなし(Testing Posture・CI 基準は現行維持)。

- スコープ amadeus は既存コードベースへの増分作業 — walking-skeleton セレモニーは対象外(org 既決)。単一 Bolt につきラダープロンプト非発生。
- unit-of-work-dependency.md の YAML edge(依存なし)どおり並行化なし。
- ブランチ: bolt/goa-sparse-acceptance を main から切り、squash マージ(Way of Working)。
