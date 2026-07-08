# External Dependency Map — installer-distribution

> ステージ: delivery-planning (2.8) / 作成: 2026-07-08
> 出典: `delivery-planning-questions.md` Q2、feasibility RAID

## ゲート項目

| 項目 | オーナー | ブロック対象 | リードタイム | 緩和/回避 |
|------|----------|--------------|--------------|-----------|
| npm org `amadeus-dlc` スコープ確保(R1) | メンテナ | Bolt 4 の publish 最終検証のみ | 数分(npm ログインが必要な人間作業) | 名前は 2026-07-08 実測で空き。フォールバック: 非スコープ `amadeus-dlc`(空き確認済み) |
| 初回 `vX.Y.Z` タグ発行(ASM-006) | メンテナ | 実タグでの E2E のみ | 次のリリース PR で発行(team.md 新規約) | フィクスチャ/モックアーカイブで Bolt 1〜3 の E2E は代替。実タグ検証は初回リリース前に1回 |
| GitHub API / codeload 可用性 | 外部(GitHub) | ネットワーク系テスト | — | モック+実測の二層テスト。rate limit は1実行2リクエスト設計(ADR-003)で回避 |

## 評価

いずれの項目も **Bolt の着手をブロックしない**。人間作業2件(スコープ確保・タグ発行)は bolt-plan の Bolt 4 と全体完了条件に明記済み。
