# Security Test Instructions — 260723-t241-ci-residency

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1294-t241-residency/code-generation/)。

## 選定判断: 専用セキュリティテストは追加しない(N/A)

cid:build-and-test:c3(攻撃面・依存・承認 NFR の実測明記がある場合のみ比例選定)に従う。実測: (a) 新規ランタイム依存ゼロ(テスト移設+テスト新規のみ) (b) ネットワーク・認証・シークレット不接触(t241 はローカル tmp project dir への spawn、t257 はローカル FS 走査のみ) (c) 本番コード変更ゼロ。既存必須 scan(lint/typecheck/drift)は全 green で省略なし。

## 既存ガードで担保する面

- t257 の走査は tests/ 配下限定・読み取りのみ(外部入力・ネットワーク不接触)
- 移設 t241 の spawn 先はローカル tmp project dir に閉じ、シークレット・認証情報を扱わない
- 既存 CI の必須 scan(lint / typecheck / dist・self-install drift guard)は本 PR でも全 green(省略なし)
