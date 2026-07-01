# Construction ノート

## 実行方針

- B003 は policy 参照方針と検出境界を扱う。
- validator または evaluator の実装変更は、今回の要求を満たすために必要な場合だけ行う。
- 今回は policy 文書で検出候補と人間判断対象を分けることで R004 を満たす。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 完了 | policy 参照方針を記録した。 | `.amadeus/steering/policies/git-branching.md` |
| T002 | 完了 | validator と evaluator の検出候補を分けた。 | `.amadeus/steering/policies/git-branching.md` |
| T003 | 完了 | Construction traceability に policy 参照を残した。 | `construction/traceability.md` |

## 実装判断

- validator は現時点では既存の成果物構造検証に使う。
- policy 参照の内容妥当性を自動判定する変更は後続 Issue 候補にする。
- PR URL は未作成のため、`pr.md` は作成していない。

## 検証入口

- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260701-git-branching-policy`
- `npm run test:all`

## 未確認事項

- なし。
