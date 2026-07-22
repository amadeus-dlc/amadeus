# Team Allocation — 260720-goa-sparse-family

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

確定済み事実のみ記載(approval-handoff:c3 — 捏造なし):

- conductor: e4(本セッション)。builder: worktree 隔離 subagent(c2 規律+E-BFACG fork 前コミット+E-TCRCGS13 resume 規律)。
- reviewer: FD/CG は architecture-reviewer subagent(E-BFAADS13 書込禁止明示)。PR レビューは実装者以外のメンバー(作成時に指名 — pr-reviewer-nomination-creator-first)。
- 非交差監視: e2 #1267 面(requirements.md C-5)。担当規模は components.md の変更面5ファイル・unit-of-work.md U1 単独(unit-of-work-dependency.md の依存なしにより並行割当不要)。unit-of-work-story-map.md の4ジャーニーは単独 conductor 制で充足。team-practices.md の役割規範(自己実装の自己レビュー禁止)どおり builder≠reviewer を維持。
