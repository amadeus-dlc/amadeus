# Bolt Plan — 260719-mirror-productization

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## Bolt 列(D-08 既決の具体化)

| Bolt | Units | 内容 | ゲート | 前提 |
|---|---|---|---|---|
| Bolt 0(先行タスク) | T-norm(unit 外) | gh optional ノルム改定の norm PR(ADR-7 文言)。leader 執行(norm-changes-via-pr) | norm PR の2名レビュー+ユーザー承認マージ | なし |
| Bolt 1 | U1-mirror-tool+U2-mirror-skill | 移設+status+SKILL の縦スライス(walking-skeleton 扱い — 新配布経路の greenfield 要素) | **単独ゲート**(org.md Walking Skeleton: Bolt 1 は単独・ゲート付き、残り Bolt 実行前にユーザー明示承認) | **Bolt 0 マージ済み**(FR-7 (c) の順序制約 — Bolt 1 PR 作成時点で norm PR MERGED を前提チェック) |
| Bolt 2 | U3-mirror-config | 3層 config 機構+unit テスト | 通常ゲート | Bolt 1 との依存なし(非交差 — 着手は Bolt 1 レビュー中でも可、マージは Bolt 1 後) |
| Bolt 3 | U4-engine-boundary | engine phase 境界分岐+integration テスト | 通常ゲート | Bolt 1(U1 パス前提)+Bolt 2(U3 resolve)の両マージ後 |

## スカッシュマージ・ブランチ規律(team-practices/org.md 準拠)

- 各 Bolt は短命ブランチ→PR→スカッシュマージ(main 1コミット/Bolt、Bolt スラッグ命名)
- 検証は各 Bolt で: typecheck / lint / dist:check / promote:self:check / run-tests.sh --ci+push 前ローカル lcov(N-2)

## ラダープロンプト(org.md Walking Skeleton)

Bolt 1 出荷後に「残りの Bolt はどう実行しますか?」を発火し、選択を amadeus-state.md の Construction Autonomy Mode として永続化する。
