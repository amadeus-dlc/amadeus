# テスト結果

## 検証結果

| 種別 | コマンドまたは確認 | 結果 | 証拠 |
|---|---|---|---|
| workspace migration | `bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts .` の後、`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .` が pass（Index 生成整合の fail 0） | pass | 実行結果（2026-07-02） |
| eval fixture | `npm run test:it:amadeus-validator`、`test:it:amadeus-validator-domain`、`test:it:state-scaffold` | pass | 実行結果（2026-07-02、各 exit 0） |
| examples | 4 snapshot の validator pass、`npm run test:it:amadeus-templates`、`npm run validate:all` | pass | 実行結果（2026-07-02、exit 0） |
| 全体検証 | `npm run test:all`（メインセッションで再実行して裏取り済み） | pass | exit code 0（2026-07-02） |
| 情報欠落なし | 全 21 workspace モジュールと examples 3 モジュールの `git diff` で削除行 0（純追加）を機械確認。migration 前後の `intents.md` の全文 diff で、辞書順の正規化と 2 件の依存行分割以外の文言が完全一致 | pass | diff レビュー（2026-07-02） |

## 安全性確認

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | 問題なし | migration は既存文言の移設と再生成のみで、新しい情報を作らない（eval 専用の合成 fixture 2 件を除く）。 |
| 権限 | 問題なし | アクセス制御や権限の変更を含まない。 |
| 秘密情報 | 問題なし | 秘密情報や個人情報を扱わない。 |
| 破壊的変更 | 意図された正規化のみ | インデックスの行順が識別子の辞書順へ正規化され、依存関係表が依存ごとの行に分割された（D001 の「生成結果を正とする」に従う）。情報の欠落はない。 |

## CI確認

| 入口 | 結果 | 根拠 |
|---|---|---|
| GitHub Actions（mock）、Cursor Bugbot | 未実行 | PR 未作成のため。PR 作成後に確認し、結果は pr.md と PR 説明から追跡する。 |

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R006 | B004/T001, B004/T002, B004/T003 | validator pass、各 test:it の pass、diff レビュー | workspace、eval fixture、examples が新契約に適合し、情報の欠落がない。 |
| R002 | B004/T004 | `test:it:index-generate` の並行統合ケースの pass | 最終状態でも並行統合の受け入れ条件が成立している。 |

## 補足

- `dev-scripts/evals/llm-templates/check.ts` は当初の変更許可リスト外だが、旧形式の index を合成する fixture が Index 生成整合検査で fail するため、T004 の受け入れ条件（`test:all` GREEN）に従い同種の最小適合（見出し追加、state.json 追加、生成ロジックによる index 再生成）を行った。メインセッションの監査で妥当と判断した。
- eval 専用の合成 Intent fixture 2 件（`20260628-existing-boundaries`、`20260626-loan-boundaries`）は移設元の文言が存在しないため、最小の概要と依存を新規に書いた。
- `examples/skill-provenance.json` は、B003 で変更した 3 skill の全 entry に staleReason が登録済みだったため変更していない。
