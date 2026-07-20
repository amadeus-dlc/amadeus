# Team Allocation — 260720-leader-store-sync

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices — 割当対象は unit-of-work.md U1(規模は components.md の 450+300 行)、builder 運用は team-practices.md 参照の c2 追補2、レビュー指名規律は requirements.md の非退行面と unit-of-work-story-map.md の完結性、依存なしの単独割当根拠は unit-of-work-dependency.md

## 割当(確定済み事実のみ — approval-handoff:c3 準拠)

- conductor: e3(本 intent のディスパッチ済み割当)。
- builder: e3 の worktree 隔離 subagent(c2 追補2 準拠 — plan コミット後 fork+プロンプト焼き込み、resume 時は worktree 再掲)。
- reviewer: 実装者以外のメンバーへ PR 作成時に指名(independent-review-on-pr — 現時点の指名は行わない。並行 intent の負荷を見て作成時に選定)。
- 並行度: 単一 Bolt・単一 builder(parallel-bolts の枠内)。

## 交代・引き取り運用

- builder 無応答時は c5/disk-evidence 引き取り(差分検分+検証再実行必須)。resume 時は worktree パス+git 限定を再掲(c2 追補)。
