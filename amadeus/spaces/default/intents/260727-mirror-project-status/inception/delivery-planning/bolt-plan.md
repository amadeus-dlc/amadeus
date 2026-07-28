# Bolt Plan — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices

編成の入力: unit-of-work の5 Unit と規模概算、unit-of-work-dependency のトポロジー3事実、unit-of-work-story-map の受入条件全数写像、requirements のリスク・受入条件、components の変更モジュール割付、team-practices の並行実装・worktree 規律。Q1 裁定(2026-07-27T07:08:44Z)により5 Bolt 直列を既定とする。

## Bolt 編成

| Bolt | Unit | ゲート | 概要 |
|------|------|--------|------|
| 1 | u1-project-sync-skeleton | **単独ゲート(walking skeleton)** | 最小 end-to-end。**Bolt 内実行順序をリスク制御として固定**: (1) GraphQL argv 族+gateway 4メソッド (2) **実 Project での add/update 両 mutation の成立実証+落ちる実証(R-3 の閉包 — 最優先)** (3) policy 既定マッピング+expectedProjectStatus (4) executor 内部ステップ直線経路 (5) projectSync 台帳最小形 (6) config 最小 parse。mutation 実証が失敗したら以降を組まず halt-and-ask |
| 2 | u2-state-reconcile-hardening | 自律モード次第 | pending/safety-blocked reconcile・複数 Project 独立・failure injection |
| 3 | u3-lifecycle-integration | 自律モード次第 | phase boundary 遷移同期・parked 維持・completion close 阻止 |
| 4 | u4-config-overrides-and-diagnostics | 自律モード次第 | mirror-projects 完全形・repair status 拡張 |
| 5 | u5-docs-and-distribution | 自律モード次第 | docs 4文書・契約 parity・7ハーネス dist 再生成・テスト完備検収 |

- 直列既定の根拠: U3・U4 はトポロジー上相互独立だが、components の割付上どちらも executor / lifecycle 面に接触しうる。ソロ運用(team-allocation 参照)では直列が既定で、**着手前にファイル単位の交差を実 diff で確認し、非交差なら swarm 並行へ格上げ可**(cid:code-generation:c6)。
- Bolt 1 承認後にラダープロンプト(残 Bolt の autonomous / gated 選択)を提示する(org.md)。
- 各 Bolt = 1 PR = main へスカッシュマージ(org.md Way of Working)。Bolt ブランチは worktree 分離(cid:code-generation:solo-bolt-worktree-required)。

## Bolt 1 の完了条件(walking skeleton の検収)

- 実 Project #5 に対する add/update mutation の成立実測(または選択肢未解決による safety-blocked の正しい観測 — A-4 の運用前提次第)。
- GraphQL envelope の od -c golden 取得と fake runner テストの green。
- FakeGateway 系4箇所の interface 追従+t280 手動確認+既存スイート green。
- 落ちる実証: 存在しない選択肢名の注入で safety-blocked 化を赤→検出の実測。

## 受入条件のカバレッジ(Bolt 完了時点)

Bolt 1: 受入 1, 2, 10(部分), 13, 14, 18 / Bolt 2: +6, 10, 11 / Bolt 3: +3, 4, 5, 7, 8, 10(完) / Bolt 4: +9, 12 / Bolt 5: +15, 16, 17(= 18項目全数 — unit-of-work-story-map の写像表と一致)。
