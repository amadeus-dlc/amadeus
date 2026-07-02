# Construction ノート

## 実行方針

eval 先行の TDD で進める。BR003（記録時点の内容を照合対象にする）と BR004（drift 3種 + スキーマ不適合）の照合セマンティクスを eval の期待値として先に固定してから、`provenance:check` の最小実装を入れる。

B001 が生成する `provenance/Pnnn-<slug>.json` を照合対象にするため、T001 は B001/T002 の実装完了に依存する。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 未着手 | `dev-scripts/evals/provenance-check/check.ts` を作成し、`test:it:provenance-check` を追加してから実装前の失敗（RED）を記録する。実 workspace への `provenance:check .` 実行検証も含める。 | 未登録 |
| T002 | 未着手 | `dev-scripts/provenance-check.ts` を新設し、`package.json` に `provenance:check` を追加し、`test:it:all` chain に `test:it:provenance-generate` と `test:it:provenance-check` を組み込んで GREEN を確認する。 | 未登録 |

## 作業順序

1. T001 で eval と検証入口（`test:it:provenance-check`）を追加し、RED を記録する。
2. T002 で `provenance:check` の最小実装を入れ、`test:it:all` chain へ組み込み、GREEN を確認する。
3. 一時 workspace fixture が成功時も失敗時も片付くことを確認する。

## 未確認事項

- なし。

## 実装判断

- `provenance:check <workspace>` は単一の workspace 引数だけを取る。`provenance:generate` と異なり build/target workspace を分けなかった。照合は記録された `commit` と `path` の組から `git show` で記録時点の内容を取り出す方式（BR003、D001）であり、その `git show` を実行する git リポジトリは検査対象 workspace 自身になるため、build/target の区別を持ち込む必要がなかった。
- drift 種別ごとの判定順序は、(1) commit が対象 workspace の git 履歴に存在するか（`git cat-file -e <commit>^{commit}`）、(2) 存在すれば `git show <commit>:<path>` が成功するか、(3) 成功すれば md5 が一致するかの順にした。最初に失敗した種別だけを1行として報告し、同一エントリで複数種別を重複報告しない。
- stdout の1行フォーマットは `<Intent 相対 path>: <drift 種別> <フィールド名> path=<path> commit=<commit>` にした。`test:it:provenance-check` の eval はこの行を正規表現で照合する。
- スキーマ不適合は、JSON 解釈不能の場合と、9項目のいずれかが欠落している場合の両方を対象にし、どちらも `スキーマ不適合` として1行で報告する。
- `buildWorkspace.path` / `targetWorkspace.path` は BR009 により照合対象にしないため、`provenance:check` の実装はこれらのフィールドを一切読まない（絶対 path の環境依存を検査対象から機械的に排除する）。
