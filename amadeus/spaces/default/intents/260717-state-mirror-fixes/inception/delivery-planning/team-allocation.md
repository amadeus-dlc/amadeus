# Team Allocation — 260717-state-mirror-fixes

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## 配置

- **conductor**: e1(leader 割当 2026-07-17T22:38:05Z — 本 intent の残りフェーズ続行)
- **builder**: Bolt 1/2 とも conductor 配下の swarm worktree fan-out(サブエージェント)を既定とする — 実装規模(合算 33-45行+テスト 180-230行、unit-of-work.md)が小さく、他メンバーへの Bolt 単位ディスパッチはオーバーヘッド過大。役割は帽子(conduct/build/review)であり固定名に紐付けない(role-model)
- **reviewer**: 各 Bolt PR は実装者(conductor)以外のメンバー2名レビュー(independent-review-on-pr)— PR 作成時に空いているメンバーへ先行指名(pr-reviewer-nomination-creator-first)。自己実装の自己レビュー禁止
- **マージ執行**: leader(ユーザー承認後 — leader-executes-merge / no-AI-merge)

## リソース制約

- 同時アクティブ builder ≤4/intent(parallel-bolts)— 本 intent は最大2で枠内
- レートリミット下の手空き許容(rate-limit-idle-allowance)— 並行度の強制なし
