# Security Test Instructions — harness-provenance

上流入力: `harness-provenance/code-generation/code-generation-plan.md`, `harness-provenance/code-generation/code-summary.md`

## Threat scope

対象は環境変数入力の改行/Markdown injection、raw override漏洩、path spoofingの誤用、依存関係の既知脆弱性である。認証、認可、HTTP、database、container、IaC、credentialを新設しないため DAST・auth test・IaC scan は非該当。

## 実行

fail-closed と情報漏洩:

```bash
bun test tests/integration/t270-harness-provenance-birth.test.ts
```

静的品質と依存関係:

```bash
bun run lint
bun audit
```

## 成功条件

- exact 7値以外は `unknown` となり、後段検出へ落ちない。
- raw markerが state、memory、audit、stdout、stderr の5面に存在しない。
- state値は固定unionで、改行やMarkdown injectionを永続化できない。
- 新規 runtime dependency と lockfile変更がない。
- dependency audit finding は本変更起因と既存依存を分離し、本変更が新規導入した Critical/High があればrelease blockerとして記録する。

## テストデータ

固有の無害なinvalid markerを一時fixtureへ渡す。実credential、token、session ID、production auditは使用しない。
