# UC002 CI が標準検証の中で照合を実行し drift を検出する

## ユースケース

CI が標準検証（`npm run test:all`）の中で `provenance:check` を実行し、drift（md5 不一致、commit 不一致、参照先欠落）を検出して fail にする。Agent は fail 出力から対象 Intent と項目を特定して修正する。

## アクター

- ACT002 Agent

## 外部システム

- EXT001 GitHub

## 事前条件

- UC001 で生成された `provenance/` 配下の JSON が存在する Intent が対象である。
- GitHub Actions（CI）が `npm run test:all` を実行できる。

## 基本フロー

1. Agent は、変更を push または Pull Request として提出する。
2. GitHub（EXT001）の CI は、`npm run test:all` の chain の中で `provenance:check` を実行する。
3. `provenance:check` は、`provenance/` ディレクトリが存在する Intent ごとに、記録済みの md5、commit、参照先を再計算した実測値と照合する。
4. drift（md5 不一致、commit 不一致、参照先欠落）を検出した場合、`provenance:check` は失敗として報告し、標準検証を fail にする。
5. Agent は、CI の fail 出力から対象 Intent と不一致項目を特定し、記録または実装を修正して再実行する。

## 代替フロー

| 条件 | 扱い |
|---|---|
| `provenance/` ディレクトリを持つ Intent が存在しない。 | `provenance:check` は失敗せず、標準検証は他の検査結果に従う。 |
| `provenance/` を持たない既存 Intent が対象に含まれる。 | 検査対象から除外し、遡及して失敗させない。 |

## 対応要求

- R002
- R003

## 未確認事項

- なし。
