# D002: `dry-run` mode 境界

## 背景

既存の `scaffold-only` は、質問せずに Discovery 成果物を作る mode である。

Issue #272 は、成果物を作らずに Intent 候補だけを確認する `dry-run` mode を求めている。

## 判断

`dry-run` は読み取り専用の候補表示 mode として定義する。

`scaffold-only` は質問しない成果物作成 mode として残す。

## 理由

候補確認だけの場面で Discovery 成果物を作ると、次に起こすべき Intent 候補を確認したいだけの用途に対して重くなる。

`dry-run` と `scaffold-only` を分けることで、探索と成果物作成の責務を分離できる。

## 影響

`dry-run` は `.amadeus/` 更新、GitHub Issue 作成、Intent Record 作成、`amadeus-ideation` 自動実行を行わない。

成果物作成へ進む場合は、人間が次の skill を明示する。
