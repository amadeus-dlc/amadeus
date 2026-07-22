# Bolt Plan — 260720-leader-store-sync(#1281)

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices — Bolt 構成は unit-of-work.md U1 と unit-of-work-dependency.md の単一 unit 判定、規模は components.md の 450+300 行、完了条件は requirements.md FR-1〜5、ゲート運用(スカッシュ・Bolt 単位 PR)は team-practices.md が参照する live 層、ジャーニー整合は unit-of-work-story-map.md に依拠

## Bolt 構成

| Bolt | Unit | 内容 | ブランチ | ゲート |
| --- | --- | --- | --- | --- |
| 1(唯一) | leader-sync-tool | scripts/amadeus-leader-sync.ts+2層テスト(unit-of-work.md U1 の完成条件全数) | bolt/feat-1281-leader-sync(origin/main 起点) | 通常(walking-skeleton 対象外 — 下記) |

- **walking-skeleton stance**: amadeus スコープは org 既定リストの greenfield 群に含まれず、本 intent は既存 scripts/ 層へのツール追加(brownfield 增分)— stance = scope-dependent(engine 既定に従い skeleton off。単一 Bolt につき ladder プロンプトも非発生)。
- **着手前提(B-4 執行)**: 実装着手前に並行 intent(e1 #1279 / e2 #1267 / e4 #1254)の実 diff 目録と scripts/amadeus-leader-sync.ts・tests/ 新番号の非交差を確認(c6 — 実 diff 判定)。
- **Bolt Refs**: 実装後に state の Bolt Refs へ slug 形 `feat-1281-leader-sync` を設定(bolt-refs-slug-form)。

## 引き渡し事項(unit 外 — leader 執行)

- FR-2 同期契機ノルムの persist(PM ラウンド毎+N 選挙超過の二重契機、N = tool の named constant を参照)— **tool 着地後の norm PR**(norm-changes-via-pr、2名レビュー+ユーザー承認)。本 Bolt の完了条件には含めない(構成順: tool が先・ノルムが後 — ノルムが参照する `status` verb の実在が前提)。
