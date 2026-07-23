# Integration Test Instructions

## 上流入力と対象

各 Unit の `code-generation-plan.md` と `code-summary.md` に基づき、registry、resolver、選挙ループ、leader-sync 互換性、doctor drift 検査の実 filesystem 境界を検証する。

## 実行方法

```bash
bun test \
  tests/integration/t235-election-store.integration.test.ts \
  tests/integration/t236-election-loop.integration.test.ts \
  tests/integration/t244-election-tie-choice.integration.test.ts \
  tests/integration/t259-elections-registry.integration.test.ts \
  tests/integration/t261-election-path-resolver.integration.test.ts \
  tests/integration/t264-elections-drift-doctor.integration.test.ts
```

全体回帰は次で実行する。

```bash
bun run test:ci
```

## 期待結果

- registry hit、legacy fallback、missing、corrupt の4経路が loud 契約を守る
- date-prefixed directory と registry row が同期する
- election loop と tie choice の既存契約を壊さない
- doctor が registry と directory の双方向差分を advisory として全件列挙する
- 対象 suite と全 CI が fail 0

## テストデータ管理

一時ディレクトリとテスト内 fixture のみを使用する。実利用者の elections record や外部サービスは変更しない。
