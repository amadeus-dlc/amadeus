# Securityテスト手順

## 脅威と入力

[code-generation-plan.md](../%7Bunit-name%7D/code-generation/code-generation-plan.md) と [code-summary.md](../%7Bunit-name%7D/code-generation/code-summary.md) に基づき、主にTampering、Information Disclosure、Elevation of Privilegeを対象とする。

- 設定pathのsymlink/inode差し替えによるworkspace外読取り。
- stale/偽造bindingによる別operationの承認。
- 未エスケープ制御文字によるstrict JSON validation迂回。
- legacy mutation verbによるlifecycle認可境界の迂回。
- 診断への絶対path、credential、raw bytes漏えい。

## 実行コマンド

```bash
bun test \
  tests/integration/t257-amadeus-mirror-config.integration.test.ts \
  tests/integration/t268-amadeus-mirror-contract-policy.integration.test.ts \
  tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts \
  tests/unit/t274-amadeus-mirror-state-codec.test.ts
```

依存関係と静的検査はrepository-native gateで実行する。

```bash
bun run typecheck
bun run lint
```

## 成功条件

- `O_NOFOLLOW`とdescriptor identity検証が差し替えを拒否する。
- binding不一致、欠落、消費済み回答でstate/GitHub副作用がゼロである。
- raw U+0000〜U+001Fを全拒否する。
- lintはexit 0で、新規blocking diagnosticがない。
- AWS credentialを必要とするlive testsのskipをセキュリティ成功の代替証拠にしない。
