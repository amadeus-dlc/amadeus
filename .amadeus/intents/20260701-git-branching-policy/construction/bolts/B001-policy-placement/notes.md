# Construction ノート

## 実行方針

- B001 は policy 配置と導線だけを扱う。
- AGENTS.md は操作指示として残し、重複更新しない。
- `.amadeus/steering/policies/README.md` は新規 policy 追加に伴う登録状態の同期だけを扱う。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 完了 | policy overview に Git ブランチ戦略への導線を追加した。 | `.amadeus/steering/policies.md` |
| T002 | 完了 | 個別 policy ファイルを作成した。 | `.amadeus/steering/policies/git-branching.md` |
| T003 | 完了 | policy notes の登録状態を同期した。 | `.amadeus/steering/policies/README.md` |

## 実装判断

- B001 では branch lifecycle の詳細は最小限の見出しに留め、B002 で具体化する。
- PR URL は未作成のため、`pr.md` は作成していない。

## 検証入口

- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260701-git-branching-policy`
- `npm run test:all`

## 未確認事項

- なし。
