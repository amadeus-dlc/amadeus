# amadeus-execution-validator evals

## 昇格条件

`amadeus-execution-validator` は、次を満たすことを確認する。

- 配布先ユーザー環境で動く実行時 validator として扱う。
- repo root の `scripts/**` や `pnpm test` を実行時検証入口にしない。
- skill 同梱の `validator/ExecutionValidator.rb` を実行入口にする。
- Ruby 標準ライブラリだけを使う。
- 対象 Intent ID が未指定の場合、全体成果物だけを検証する。
- 対象 Intent ID が指定された場合、全体成果物に加えて対象 Intent を検証する。
- Initialized または Ideation 段階では、後続段階の成果物欠落を不足にしない。
- Inception 段階で Bolt 配下に `tasks.md` がある場合、同じ Bolt 配下の `design.md` を検証する。
- `codebase-analysis.md` が存在する場合、または `state.json.inception.requiredArtifacts` に含まれる場合、必須見出しを検証する。
- `codebase-analysis.md` が存在せず、`state.json.inception.requiredArtifacts` にも含まれない場合は不足にしない。
- `traceability.md` の `既存コード分析からの追跡` が、`分析`、`要求`、`ユースケース`、`ユニット`、`ボルト`、`設計`、`入力` の列を持つことを検証する。
- `evals.json` が JSON として解釈できる。
- `git diff --check` が成功する。

## 手動 eval 状態

| ケース | 状態 | 確認内容 | 証拠 |
|---|---|---|---|
| `workspace-only-validation` | 未実施 | Intent ID 未指定時は全体成果物だけを検証する。 | 未登録 |
| `ideation-intent-validation` | 未実施 | Ideation 段階では Inception 以降の欠落を不足にしない。 | 未登録 |
| `runtime-only-dependency` | 未実施 | Ruby 標準ライブラリだけで検証する。 | 未登録 |
| `bolt-design-before-task` | 未実施 | Bolt 配下の `design.md` が `tasks.md` の入力として存在する。 | 未登録 |
| `codebase-analysis-headings` | 未実施 | `codebase-analysis.md` が条件付き成果物として必須見出しを持つ。 | 未登録 |
| `codebase-analysis-traceability-columns` | 未実施 | `既存コード分析からの追跡` が必須列を持つ。 | 未登録 |

## 再実行コマンド

```sh
ruby -rjson -e 'JSON.parse(File.read("skills/amadeus-execution-validator/evals/evals.json")); puts "evals.json: ok"'
cmp -s skills/amadeus-execution-validator/SKILL.md .agents/skills/amadeus-execution-validator/SKILL.md && echo "SKILL.md: identical"
cmp -s skills/amadeus-execution-validator/validator/ExecutionValidator.rb .agents/skills/amadeus-execution-validator/validator/ExecutionValidator.rb && echo "ExecutionValidator.rb: identical"
ruby skills/amadeus-execution-validator/validator/ExecutionValidator.rb .
git diff --check
```
