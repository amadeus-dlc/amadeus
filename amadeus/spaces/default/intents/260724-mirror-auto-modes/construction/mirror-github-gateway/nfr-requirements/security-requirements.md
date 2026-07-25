# Security Requirements — mirror-github-gateway

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Trust Boundaries

GitHub、`gh` stdout／stderr、repository URL、Issue bodyはuntrusted remote inputである。validated `RepositoryIdentity`、positive Issue number、C6発行permitだけをmutation authorityとして扱う。credentialは`gh` credential storeの管理下に置き、process argument、state、audit、summaryへ渡さない。

## STRIDE Controls

| Threat | Control | Verification |
|---|---|---|
| Spoofing | 全API pathへexplicit canonical repositoryを埋め、response `repository_url`を同一identityへ照合 | wrong-repo response test |
| Tampering | shell stringを禁止しimmutable argument arrayを使う。title／bodyは単一argument | metacharacter fixture |
| Repudiation | operation、repository、Issue number、effect certaintyをtyped outcomeへ保持し、C6のoperation IDと相関 | audit integration |
| Information disclosure | summaryはclassification、effect、numeric exit／HTTPだけの固定template | token／path／URL sentinel test |
| Denial of service | 全processに10／30／60秒deadline、findは全page完走かfailure | hanging／large pagination test |
| Elevation of privilege | create／edit／closeは非export `unique symbol` brand permitを必須にし、C6以外のfactory importを拒否 | dependency／type negative test |

## Input and Output Validation

- owner／nameはASCII英数字と`-_.`だけを許可し、trimせずslash／空白を拒否する。
- Issue numberはpositive safe integerだけを受理する。
- JSONはoperation別schemaでparseし、unknown state、missing field、複数JSON値を拒否する。
- search elementの`pull_request` propertyをIssue parse前に除外し、不正pageを全体failureにする。
- remote message、headers、environment、credential helper outputをdiagnosticへ転記しない。
- `gh`はargument arrayで起動し、shell expansion、command substitution、environment token注入を行わない。

## Data and Compliance

Mirror IssueはIntentの共有情報であり、secret／credential／個人データを追加保存しない。provenance markerはrepository／Intent／operationの非秘密識別子だけを含む。GDPR、HIPAA、PCI-DSS固有data処理は非適用であり、適合認証を主張しない。

## Acceptance

1. token、query、absolute pathを含むstderrでも出力summaryは固定templateと完全一致する。
2. forged permit、operation mismatch、repository mismatchをprocess起動前に拒否する。
3. cwd／git remoteを変えてもmutation先が変わらない。
4. invalid remote JSONを成功／empty candidateへ変換しない。
