# Security Test Instructions — 260818-priority-bug-batch-4

## 判定: 適用可能な NFR が存在しない(既存ガードの維持確認のみ)

`requirements.md` にセキュリティの数値目標はなく、新規の認証・認可面も追加していない。認証情報・シークレットの新規取り扱いもない。ノルムに従い、目標なきセキュリティベンチマークは生成しない。

## 維持を確認する既存契約

本 intent の変更が触れる範囲で、既存の fail-closed 契約が緩んでいないことだけを確認する。対象は上流の `code-generation-plan.md` が列挙する step と、`code-summary.md` が申告する変更ファイル・未検証面から導いた。

- **batch identity の受理述語**: Unit 1 が `amadeus-directive.ts` に追加した 1-origin 整数の検証は、conductor が推測値を渡す経路を塞ぐためのもの。非整数・0・負値の拒否は `t113` が主張する(緩めない)
- **lying-conductor ガード**: `finalize` が claimed unit の check を再実行する契約は本 intent で不変。directive が `--check-cmd` を搬送しない設計はこのガードを保つための意図的な非搬送であり、搬送へ倒す変更は認可境界の緩和にあたる
- **outcome 台帳の fail-closed**: Unit 2 の supersession は「最後の観測を採る」規則であり、行の欠落を成功へ丸めない。cancelled unit を無記録のまま通す退行が起きないことを `t533` が主張する

## 判定を覆す条件

認可・入力検証の新規面(新しい外部入力の受理点、権限判定の分岐、シークレットの取り扱い)を持つ変更が加わった場合。その際は当該境界の negative test を落ちる実証つきで追加する。

なお Unit 1 の `code-summary.md` は未検証面として `spentPoolRefusal` の `draining` arm がテスト上 terminal 経路のみを通っていること(`phase !== "open"` の一括判定で draining も同じ経路に落ちる)を申告している。これは拒否側へ倒れる判定であり認可の緩みではないため、本ステージでは追加のセキュリティ検査を課さない。
