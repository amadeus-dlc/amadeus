# Security Test Instructions — goa-sparse-family

上流入力(consumes 全数): `../goa-sparse-acceptance/code-generation/code-generation-plan.md`（`code-generation-plan`）、`../goa-sparse-acceptance/code-generation/code-summary.md`（`code-summary`）、`../goa-sparse-acceptance/nfr-design/security-design.md`。

## 脅威境界と実行

防御対象は version-controlled Markdown / CLI ID の tampering と部分成功である。次を実行する。

```sh
bun test \
  tests/unit/t-norm-metrics.test.ts \
  tests/unit/t238-election-record.test.ts \
  tests/integration/t236-election-loop.integration.test.ts
```

## Security assertions

- duplicate label、範囲外/逆順/重複bin、malformed token、空segmentを record 全体の型付き失敗へ落とす。
- lowercase/空節/先頭末尾hyphen/非文字列 election IDをfail-closedに拒否する。
- errorはstable prefixと最小詳細に限定し、path・credential・stack・別record内容を開示しない。
- parser/validator は filesystem/store/timeline/global state を変更せず、部分集計を返さない。

## 非該当項目

新規network、authn/authz、credential、crypto、database、web surface、dependency はないため DAST、IAM、secret scan の専用追加はN/A。既存 lint/typecheck/full CIを供給網と静的品質のgateとして再実行する。
