# Security Design — harness-hook-correctness

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。host payload、child process、project path、generated projectionを既存trust boundary内で検証する。

## Trust boundaries

| Boundary | Accepted input | Control | Rejected behavior |
|---|---|---|---|
| adapter→child runtime | validated args + HookInput | `spawnHookWithRuntime`が`process.execPath`とargv配列を使う | PATH fallback、shell interpolation、credential追加 |
| Kiro IDE→canonical hook context | `unknown` payload | `parseKiroIdeHookContext`の判別union | failed/unknown/malformedを成功artifactへ昇格 |
| tool result→workspace path | 成功writeの既知result文型 | project root基準の正規化とvisible drop | unknown wordingからpath推測 |
| Claude settings→command | `"$CLAUDE_PROJECT_DIR"` + HookSpec | `renderClaudeHookCommand`で11 hook pathだけdouble quote | statusline/permission変更、追加command |
| authored source→projection | package manifest | generator/check | dist手編集の受理 |

## Kiro IDE classification flow

`toolSuccess === false`、unknown tool、malformed/empty payloadはartifact audit/sensorへ転送しない。成功writeでも既知wordingからpathを抽出できなければ、理由付きvisible dropへ閉じる。delegated identityはresult先頭8行の既存`Reviewer`/`Agent` markerだけから抽出し、欠落時は`unknown`とする。

payload依存targetはinvalid payloadでadvisory no-opとする。payload-free runtime compile/state syncはpayloadを根拠にせずaudit tail self-gateだけを使い、payload由来mutationを起こさない。auditはsensorより先に既存eventで記録し、新eventやpayload全量dumpを追加しない。

## Project path・command hardening

Claude authored settingsの承認済み11 hook commandについて、project directoryとscript pathをdouble quoteする。JSON parse、command件数11、全path実在、空白入りtemp workspace起動、未引用0を構造fixtureで確認する。statuslineとpermission globは検査対象だが変更対象ではなく、bytes不変を必須にする。

## Supply-chain・権限境界

正本は既存`packages/framework/core/`と`packages/framework/harness/<name>/`、projectionはgenerator導出とする。新permission、IAM、secret store、encryption layer、network、AWS service、dependencyを追加しない。4 self-install closed listを維持し、6 package面と混同しない。

## トレーサビリティ

本設計は`security-requirements.md`のfail-closed/visible drop、`performance-requirements.md`のsingle-pass、`scalability-requirements.md`の6/11全数、`reliability-requirements.md`のadvisory境界、`tech-stack-decisions.md`のargv/Bun、`business-logic-model.md`のFailure decisionsへ対応する。
