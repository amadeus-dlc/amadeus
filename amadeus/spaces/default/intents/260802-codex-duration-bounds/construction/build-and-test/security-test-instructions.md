# Security Test Instructions — Codex Duration Bounds

## 対象と上流

4 Unitの `code-generation-plan.md` と `code-summary.md` に定義されたaudit、retry、interaction、Unit pool境界を、data minimization、tamper resistance、path confinement、supply-chainの観点で検証する。

## Security Test

- canonical Unit pool eventがclosed unionであり、prompt、answer、credential、authorization header、raw output、absolute pathを持たないことを実生成eventで検証する。
- operation／attempt／reservation／Unit IDがopaqueで、contentやpathを可逆に含まないことを確認する。
- same idempotency key／different fingerprint、canonical field上書き、audit／protected-file改変、worktree外pathをfail-closedで拒否する。
- retryはallowlist 4 fact一致時だけ許可し、認可、permission、config、validation、effect possibleを自動再実行しない。
- exporter未設定時はnetwork egress 0とし、canonical auditをremote exportの成否へ依存させない。
- `package.json` とlockfileに新規runtime／development dependencyがないことを確認する。

## 実行方法

`tests/unit/t425-unit-pool.test.ts`、`tests/e2e/t134-swarm-referee.test.ts`、#1602 audit／registry test、#1998 retry／partial recovery testをblocking controlとする。CLI frameworkにweb service、IaC、container imageがないため、DAST、IaC scanner、image scannerは非該当である。

## 合格基準

固定workloadの `forbiddenEventFields` が空配列、secret sentinel hit 0、canonical tamper accepted 0、path escape accepted 0、新規dependency 0、全7 harnessで同じsecurity predicateを満たすこと。Codexだけのgateやredaction bypassは許容しない。
