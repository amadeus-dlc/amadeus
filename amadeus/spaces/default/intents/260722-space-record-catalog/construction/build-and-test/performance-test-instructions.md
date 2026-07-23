# Performance Test Instructions

## 上流入力

`code-generation-plan.md`、`code-summary.md`、各 Unit の `performance-requirements.md` を参照する。本変更はローカル CLI の小規模 JSON registry と directory 列挙であり、常駐サービスや負荷試験対象の SLO は存在しない。

## 適用する検査

- resolver は registry を1回読み、選挙 ID の完全一致を行う
- doctor は registry row と directory entry を各1回列挙する
- drift 表示は全件列挙を契約とし、件数上限による黙示的打切りを行わない

## 実行方法

```bash
bun test tests/unit/t261-elections-drift-label.test.ts
bun test tests/integration/t261-election-path-resolver.integration.test.ts
```

## 判定

専用の load test は N/A。対象テストがタイムアウトなしで完了し、アルゴリズムが入力件数に対して線形であることをコードとテストで確認する。サービス SLO 達成とは表現しない。
