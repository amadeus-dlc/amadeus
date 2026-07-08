# Delivery Planning — 質問と回答

- **Intent**: 260708-installer-distribution
- **ステージ**: delivery-planning (2.8)
- **モード**: Grill me(グリリング — 質問は動的に1問ずつ追記される)
- **深度**: Standard

> このファイルは意思決定の正式記録。

---

## Q1. シーケンシングヒューリスティックと Bolt 粒度

team.md の Walking Skeleton 規定(「最初の Construction Bolt は小さな end-to-end スライスとして扱い、最初に最小の `@amadeus-dlc/setup` 実行経路を通し、以後の拡張前に人間がゲートで確認する」)を前提とした案:

**walking-skeleton-first + 以後は依存順(topological)**、Bolt 粒度は「**Bolt 1 = 薄い縦スライス(U1 の一部+U2 の中核経路)、以後は 1 Unit = 1 Bolt**」:

| Bolt | 内容 | Unit |
|------|------|------|
| Bolt 1(walking skeleton、単独ゲート) | `packages/setup` 骨格+最小の `install` 縦スライス: バージョン解決(最新タグ)→アーカイブ取得→1ハーネス展開→ファイル存在検証。ウィザード・非対話・衝突分岐は最小限 | U1 の一部+U2 の中核 |
| Bolt 2 | U1/U2 の残り(ウィザード、非対話、衝突、導入済み検出、doctor 検証、エラー分類、マニフェスト完全版) | U1+U2 完成 |
| Bolt 3 | upgrade 一式 | U3 |
| Bolt 4 | publish 整備(pack 契約テスト、手順書、メタデータ是正) | U4 |
| Bolt 5 | docs 刷新+バンプ | U5 |

- A. 採用 — walking-skeleton-first+1 Unit ≒ 1 Bolt の5 Bolt 構成(推奨: team.md の規定と R4 緩和策(skeleton での工数早期実測)をそのまま実装する構成。WSJF スコアリングは不要 — 直列 DAG で順序の自由度が小さく、スコアの形式化は儀式になる)
- B. 修正 — Bolt の束ね方・順序を変える(内容を指定)
- X. Other(自由記述)

[Answer]: A. 採用 — walking-skeleton-first+5 Bolt 構成、WSJF 不採用(2026-07-08、Mode: grilling)

---

## Q2. 外部依存(ゲート項目)の確認

Bolt をブロックし得る外部依存の棚卸し:

| 項目 | オーナー | ブロック対象 | リードタイム/緩和 |
|------|----------|--------------|-------------------|
| npm org `amadeus-dlc` スコープ確保(RAID R1) | メンテナ(あなた) | **Bolt 4 の publish 検証最終段**(pack テストや手順書は名前確定だけで先行可) | 数分の作業。フォールバック名(非スコープ)は空き確認済み |
| `vX.Y.Z` タグの初回発行(ASM-006) | メンテナ | **Bolt 1 の実タグ E2E**(モック/フィクスチャで代替可、実タグ検証は初回リリース前) | team.md 新規約に従い次のリリース PR で発行 |
| GitHub API/codeload の可用性 | 外部(GitHub) | 全 Bolt のネットワーク系テスト | モック+実測の二層(FR-012 テスト設計) |

この3項目で外部依存マップを確定するか?

- A. 確定 — 3項目で externals を確定し、R1 とタグ発行はメンテナの公開前タスクとして bolt-plan に明記する(推奨: いずれも Bolt の着手をブロックせず、publish 直前にのみ効く)
- B. 追加 — 他の外部依存がある(内容を指定)
- X. Other(自由記述)

[Answer]: A. 確定 — 3項目(npm スコープ R1 / 初回タグ ASM-006 / GitHub 可用性)で外部依存マップを確定(2026-07-08、Mode: grilling)
