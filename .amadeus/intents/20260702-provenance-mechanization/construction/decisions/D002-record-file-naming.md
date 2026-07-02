# D002: 記録ファイル命名規則の採用

## 背景

Unit Design Brief の GD001（記録先を Intent 直下の `provenance/` ディレクトリとし、実行単位の JSON を累積する）は、具体的なファイル命名規則を Construction の Functional Design で確定するとしていた。

## 判断

ファイル名は `provenance/Pnnn-<slug>.json` とする。`Pnnn` は Intent 内の3桁連番で、欠番を再利用しない。slug は作業内容を表す小文字英数字とハイフンとする。

## 理由

- Amadeus の既存の識別子規約（`Rnnn`、`Bnnn`、`Dnnn` など）と同型にすることで、成果物間の参照や grep が容易になり、命名規則を新たに学習するコストを避けられる。
- 3桁連番で欠番を再利用しない方式は、`provenance:generate` が既存ファイルを上書きせず次番号を使う契約（R001 の受け入れ条件）を機械的に実現できる。

## 影響

- R001 はこの命名規則を前提にする。
- `functional-design/business-rules.md` の BR002、BR007 の根拠になる。
- `provenance:generate` の実装は、対象 Intent の `provenance/` 配下を走査して既存の最大連番を取得し、次番号でファイルを作成する。
