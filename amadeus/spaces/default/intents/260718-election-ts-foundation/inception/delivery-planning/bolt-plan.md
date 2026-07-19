# Bolt Plan — election-ts-foundation

> 上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

経済順序=Q1 裁定 A(delivery-planning-questions.md)。DAG(unit-of-work-dependency.md)を尊重した risk-first 5 Bolt。本 intent は Inception まで — 本プランは将来の実装 intent が消費する(実装着手はユーザー決定)。

## Bolt 列

| Bolt | 内容 | 対象ユニット | 依存 | ゲート | 見積り(実装/テスト) |
|---|---|---|---|---|---|
| 1 walking-skeleton | 0件確認選挙1件を open→next/report→tally→record まで完走する最小縦スライス(U1 核: 型+最小 tally / U2 核: create+load / U5 核: 最小状態機械)。FR-0 の指令ループ成立を e2e 実証 | U1/U2/U5 の最小核 | なし | **単独・人間ゲート**(project.md Walking Skeleton — 以後の Bolt 実行前に明示承認) | 200-300 / 150-250 行 |
| 2 model-complete | U1 完全化: GoA 全分岐(タイ・ブロック・定足数・early tally)、決定的シャッフル、票検証 fail-closed 5クラス、後着分類 | U1 残余 | Bolt 1 | ラダープロンプト後の選択モード | 150-250 / 200-300 行 |
| 3 io-record-transport | U2 完全化(台帳・実体化・タイムライン)/ U3 全体(render+verify、parseGoaLine round-trip)/ U4 全体(transport 2実装) — ファイル面非交差なら worktree 並行(c6 判定は着手前実測) | U2 残余+U3+U4 | Bolt 2 | 同上 | 400-600 / 350-500 行 |
| 4 cli-complete | U5 完全化: 全 verb 配線・hold 分岐・機械実行器 e2e(ADR-6 CI 層) | U5 残余 | Bolt 3 | 同上 | 150-250 / 150-250 行 |
| 5 skill-wrap | U6: SKILL.md+禁止語彙 grep 検査+ノルム無参照 subagent 実演(ADR-6 実演層) | U6 | Bolt 4 | 同上 | 40-80 / 60-100 行 |

**合算(機械和)**: 実装 940-1,480 / テスト 910-1,400 行 — unit-of-work.md 合算(980-1,440 / 910-1,340)と整合(Bolt 1 のスケルトン切り出し分を Bolt 2/3/4 の残余から控除する再配分のため幅が±40-60 行ずれる。ユニット総量は不変)。

## 運用規範(既決の再掲 — 新規決定なし)

- 各 Bolt は短命ブランチ→PR→スカッシュマージ(org.md)。PR 前 deslop・push 前 lcov・レビュアー即指名(team-practices live)
- Bolt 3 の並行は同時アクティブ builder 最大4の枠内(parallel-bolts)。交差判定は静的目録でなく実 diff(c6)
- Bolt 1 出荷後にラダープロンプト(自律継続 or 全ゲート)— 選択は実装 intent の amadeus-state.md に永続化(org.md Walking Skeleton)
