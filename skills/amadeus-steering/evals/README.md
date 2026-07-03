# amadeus-steering evals

## 昇格条件

`amadeus-steering` は、次を満たした場合だけ `.agents/skills/amadeus-steering/` へコピー昇格できる。

- `guided`、`discovery`、`scaffold-only` の手動 eval が完了している。
- `guided` は、目安5問で不足だけを質問し、必要な判断が未確定であれば目安を超えても質問を続ける。
- `discovery` は、既存資料から draft できた項目と根拠ファイルを示し、矛盾または不足だけを目安5問で質問する。
- 質問したターンでは成果物を作らず回答待ちにする。
- `discovery` は、質問したターンでは成果物を追加しない。
- `scaffold-only` は、質問せずに Space（`memory/`、`knowledge/`）の最小成果物を作る。
- `scaffold-only` は、空欄を作らず `未確認` と確認すべき問いを残す。
- `scaffold-only` は、外部システム、境界づけられたコンテキスト、Intent の識別子を推測で作らない。
- 個別 Intent ディレクトリ、`requirements.md`、`use-cases.md`、`units.md`、`bolts.md` を作らない。
- skill 本文が repo の開発用文書や開発用スクリプトを実行時参照にしない。
- `evals.json` が JSON として解釈できる。
- `git diff --check` が成功する。

昇格時は symlink ではなくコピーにする。
昇格コピー対象は `SKILL.md` だけである。
`evals/` は開発用なので昇格先へコピーしない。

## 手動 eval 状態

| モード | 状態 | 確認内容 | 証拠 |
|---|---|---|---|
| `scaffold-only` | 完了 | 質問なしで最小 Space を作り、空欄ではなく `未確認` を残し、Intent を作らない。Amadeus Validator が pass する。 | `/tmp/amadeus-steering-scaffold-only.GrzMDR` |
| `guided` | 完了 | 目安5問の質問を出し、質問したターンでは成果物を作らず回答待ちにする。 | `SKILL.md` と `evals.json` の期待値で確認 |
| `discovery` | 完了 | 既存資料から draft できた項目と根拠ファイルを示し、不足質問3件で回答待ちにする。`aidlc/` は作らない。 | `/tmp/amadeus-steering-discovery.4Dhz4i/discovery-eval-output.md` |

## 再実行コマンド

```sh
bun -e 'JSON.parse(await Bun.file("skills/amadeus-steering/evals/evals.json").text()); console.log("evals.json: ok")'
rg -n 'docs/|scripts/|\.agents/rules|CONTEXT\.md|\.\./' skills/amadeus-steering || true
git diff --check
```
