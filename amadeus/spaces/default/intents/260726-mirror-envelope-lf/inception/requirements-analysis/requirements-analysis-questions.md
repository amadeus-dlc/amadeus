# Requirements Analysis — 明確化質問(260726-mirror-envelope-lf)

> **承認**: 2026-07-26T11:41:28Z にユーザー承認(AskUserQuestion 回答 Q1=A 受領、本タイムスタンプは回答転記時刻)。
>
> **E-OC1 判定証跡**: Q1 は複数の妥当解を持つ設計方式の選択(ソロモードにつきユーザー直接裁定)。他の論点は選挙不要の機械的執行クラス — (a) 単一系4 verb のパーサ LF/CRLF 両対応は「実出力への回復」で一意 (b) fixture の実 gh 出力化は regression-first ノルムから一意 (c) 過去 intent の設計宣言(security-design.md:37)の誤りは現 intent record への注記で扱い、歴史的成果物は改変しない。
>
> 上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md(codekb、observed で差分リフレッシュ済み)。患部実測は reverse-engineering/scan-notes.md。

## Q1: find(--paginate 検索)の修正方式

実測により `--slurp` の実出力は interleave 文法(`'[' <envelope><page> ('\n,' <envelope><page>)* ']'`)で、設計宣言とも現行パーサとも不一致。LF 対応だけでは `:665 JSON.parse` / `:669 outer.length !== pageCount` で落ちる(クロスレビュー 2/2 実証)。

- A. `--slurp` を外し1ページずつ取得する(クロスレビュー推奨 — 各ページが単一 envelope になり、単一系パーサの LF/CRLF 両対応がそのまま効く。`outer.length === pageCount` 不変条件は「取得ページ数 = 反復回数」として自然に維持)
- B. interleave 文法対応のパーサを新設する(--slurp 維持。パーサ複雑化・実出力文法への追随リスク)
- X. Other (please specify)

[Answer]: A — --slurp を廃止し1ページずつ取得(ユーザー裁定 2026-07-26、AskUserQuestion 回答「--slurp 廃止で1ページずつ」)
