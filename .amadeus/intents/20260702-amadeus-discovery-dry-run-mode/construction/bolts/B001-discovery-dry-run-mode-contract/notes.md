# Construction ノート

## 実行方針

- B001 は source skill の `dry-run` mode 契約だけを扱う。
- 実行時に候補を自動生成する実装は扱わず、skill 本文の契約を整える。
- `dry-run` は読み取り専用 mode とし、`scaffold-only` は質問しない成果物作成 modeとして残す。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 完了 | `dry-run` mode、入力、出力、判定案を source skill に追加した。 | [test-results.md](test-results.md) |
| T002 | 完了 | 過去分析、学習分類、副作用禁止の境界を source skill に追加した。 | [test-results.md](test-results.md) |

## 実装判断

- `dry-run` の出力は、まず人間向けテキストの候補表示として定義する。
- 機械向け JSON は今回の Task に含めず、必要になった場合の未確認事項として残す。
- `dry-run` が `amadeus-history-review` と `amadeus-learning-review` を直接起動するかどうかは今回確定せず、結果を入力にできる consumer として定義する。
- `dry-run` から成果物作成へ進む場合は、人間が `amadeus-discovery scaffold-only`、`amadeus-discovery guided`、または `amadeus-ideation` を明示する。

## 検証入口

- `npm run test:it:amadeus-templates`
- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260702-amadeus-discovery-dry-run-mode`

## 未確認事項

- 機械向け JSON 出力が必要になった場合は後続 Issue 候補として扱う。
