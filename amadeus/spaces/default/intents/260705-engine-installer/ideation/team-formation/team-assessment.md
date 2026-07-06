# Team Assessment（260705-engine-installer）

上流入力: [scope-document.md](../scope-definition/scope-document.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)

## 体制

1 人の Maintainer と複数エージェントの多体連携体制である（team.md 並行運用ポリシー「多体連携の運用」節準拠。leader + engineer1〜3 のロール固定 worktree）。
本 Intent は engineer2 のロール worktree へディスパッチ済みであり、変更作業は engineer2 の worktree 1 個に閉じる。

## 役割

| 役割 | 担当 | 責務 |
|---|---|---|
| Intent 化承認 / PR merge / 方針転換 | Maintainer（j5ik2o） | 包括委任（2026-07-06 04:07 JST）の範囲外に残る人間判断 |
| gate 承認の中継 | leader | 包括委任に基づく内容確認と中継承認定型文の送付。逸脱・契約級の新規判断の検出時は人間へ戻す |
| 実装 | engineer2 | インストーラ本体 + 専用 eval + README を TDD で実装。4 イベント報告 |
| ピア協議 | leader + engineer1, 3 | 技術的な内容確認（期限 15 分・回答 1 件で成立） |
| PR レビュー | レビューボット + engineer1, 3 + Maintainer | CI とボット対応は実装側、merge 判断は人間 |

## キャパシティ所見

必要スキル（Bun + TypeScript、node:fs の symlink API、JSON マージ、隔離 eval の構築）は既存の開発実績（dev-scripts、engine sandbox e2e、pdm-scope eval）で充足している。追加の人員・スキル獲得は不要である。
