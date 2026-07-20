# Bolt Plan — 260720-hold-choice-resolution

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md — Bolt 構成は unit-of-work.md U1(単一 unit ~159行、規模内訳は components.md の変更一覧)と dependency の依存なし判定から、完成条件は requirements.md FR-1〜FR-5 から、検証コマンド列とマージ手順は team-practices.md の Testing Posture / Way of Working から導出。

## Bolt 列

| Bolt | Unit | 内容 | ブランチ | ゲート |
| --- | --- | --- | --- | --- |
| 1(唯一) | tie-choice-resolution | election.ts の tie/非-tie 相互排他分岐+rulingOverride 拡張+SKILL 3面+テスト(unit-of-work.md U1 の完成条件全数) | bolt/tie-choice-resolution(origin/main 起点) | 通常(walking-skeleton 対象外 — 下記) |

## Walking-skeleton stance

amadeus スコープは org 既定の greenfield リスト(mvp/enterprise/feature/poc/workshop/infra)に含まれず、本 intent は既存 scripts/amadeus-election*.ts への brownfield 增分 — stance = scope-dependent → skeleton off。単一 Bolt につき ladder プロンプトも非発生。

## 完成条件(Bolt 1)

- FR-1〜FR-5 の受け入れ条件全数(unit-of-work.md U1 と同一)
- 検証: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` 全 green+落ちる実証の赤実測(E-GMECG 手順: fix コミット後に pre-fix 面切替、復元 ref = fix SHA 明示)
- push 前 lcov: diff 追加行の未カバー 0(local-lcov-pre-push)
- PR 発行 → 実装者以外レビュー → CI green → ユーザー承認 → leader マージ(スカッシュ)
