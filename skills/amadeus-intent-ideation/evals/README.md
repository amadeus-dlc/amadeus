# amadeus-intent-ideation evals

## 昇格条件

`amadeus-intent-ideation` は、次を満たした場合だけ `.agents/skills/amadeus-intent-ideation/` へコピー昇格できる。

- `guided` は、最大5問の質問を出し、質問したターンでは成果物を作らず回答待ちにする。
- `scaffold-only` は、Ideation 成果物だけを作る。
- `repair` は、既存 Ideation 成果物の構造だけを補修する。
- Intent の入れ物が不足している場合は作業を止め、`amadeus-intent-init` を案内する。
- `requirements.md`、`acceptance.md`、`user-stories.md`、`use-cases.md`、`units.md`、`bolts.md`、`domain/**` を作らない。
- 作成後に `state.json` が JSON として解釈できる。
- 作成後に対象 Intent ID 指定の Execution Validator が pass する。
- skill 本文が repo の開発用文書や開発用スクリプトを実行時参照にしない。
- `evals.json` が JSON として解釈できる。
- `git diff --check` が成功する。

昇格時は symlink ではなくコピーにする。
昇格コピー対象は `SKILL.md` だけである。
`evals/` は開発用なので昇格先へコピーしない。

## 手動 eval 状態

| ケース | 状態 | 確認内容 | 証拠 |
|---|---|---|---|
| `guided` | 完了 | 既存成果物から分かることと不足を示し、質問5件で回答待ちにする。成果物は作らない。 | `/tmp/amadeus-intent-ideation-guided.TvUXLH/guided-eval-output.md` |
| `scaffold-only` | 完了 | Ideation 成果物だけを作り、Execution Validator が対象 Intent ID 指定で pass する。要求、ユースケース、Unit、Bolt、domain は作らない。 | `/tmp/amadeus-intent-ideation-scaffold-only.4xHUf4` |
| `repair` | 完了 | 既存 Ideation 成果物の構造だけを補修し、Execution Validator が対象 Intent ID 指定で pass する。要求、ユースケース、Unit、Bolt、domain は作らない。 | `/tmp/amadeus-intent-ideation-repair.Nj7jRc` |
| init 不足 | 完了 | Intent の入れ物が不足している場合は成果物を作らず、`amadeus-intent-init` を案内して止める。 | `/tmp/amadeus-intent-ideation-init-missing.mErktj/init-missing-eval-output.md` |

## 再実行コマンド

```sh
ruby -rjson -e 'JSON.parse(File.read("skills/amadeus-intent-ideation/evals/evals.json")); puts "evals.json: ok"'
rg -n 'docs/|scripts/|\.agents/rules|CONTEXT\.md|\.\./' skills/amadeus-intent-ideation/SKILL.md || true
git diff --check
```
