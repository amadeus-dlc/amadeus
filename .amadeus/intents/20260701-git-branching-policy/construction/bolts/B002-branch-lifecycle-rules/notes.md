# Construction ノート

## 実行方針

- B002 は B001 で作成した `.amadeus/steering/policies/git-branching.md` の具体ルールを扱う。
- branch lifecycle は Issue 起点、branch 作成、`origin/main` 追従、PR 作成前検証、merge 後処理の順で記録する。
- 例外は通常ルールと同じ policy に記録し、暗黙運用にしない。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 完了 | branch 作成と追従ルールを記録した。 | `.amadeus/steering/policies/git-branching.md` |
| T002 | 完了 | PR 作成前検証と merge 後処理を記録した。 | `.amadeus/steering/policies/git-branching.md` |
| T003 | 完了 | docs-only と緊急修正の例外を記録した。 | `.amadeus/steering/policies/git-branching.md` |

## 実装判断

- merge commit を作業 branch へ入れる運用は既定にしない。
- rebase は作業 branch が単独所有で、PR の確認文脈を壊さない場合だけ使う。
- PR URL は未作成のため、`pr.md` は作成していない。

## 検証入口

- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260701-git-branching-policy`
- `npm run test:all`

## 未確認事項

- なし。
