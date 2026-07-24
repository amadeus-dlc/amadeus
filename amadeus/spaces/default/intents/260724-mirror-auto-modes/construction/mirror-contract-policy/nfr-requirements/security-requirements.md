# Security Requirements — mirror-contract-policy

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Trust Boundary and Data Classification

| ID | Boundary／Data | Classification | Requirement |
|---|---|---|---|
| SEC-CP-01 | Global／Space／Intent config file | internal configuration | 既存workspace selectorで解決したpathだけをread-onlyで開く |
| SEC-CP-02 | `auto-mirror` raw value | untrusted structured input | strict parserで`off | prompt | auto`だけを受理する |
| SEC-CP-03 | Intent UUID／boundary kind／boundary instance／operation | internal identifier | FR-10の正本tupleへ固定順序でencodeし、表示用detailをidentityへ含めず、commandとして評価しない |
| SEC-CP-04 | diagnostic | local operational output | credential、token、GitHub response、config file全内容を含めない |

本Unitはcredential、PII、PHI、cardholder dataを新規処理しない。GDPR、HIPAA、PCI-DSS固有の保存・削除・暗号化controlは非適用である。下記のfail-closed入力検証と決定性はprocessing integrity上の設計目標であり、SOC 2認証や特定Trust Services Criteriaへの適合を主張しない。

## STRIDE Requirements

| ID | Threat | Requirement | Verification |
|---|---|---|---|
| SEC-CP-05 | Spoofing | Intent identityをcwdや表示slugから推測せず、既存selectorが返すvalidated Intent UUIDを必須にする | UUID欠落／selector ambiguity test |
| SEC-CP-06 | Tampering | boolean、unknown string、array、object、nullをmodeへcoerceせず、1件でもinvalidならoperationを生成しない | invalid type decision table |
| SEC-CP-07 | Repudiation | event identityはIntent UUID、boundary kind／instance、operationだけを含み、同一入力で同一keyになる。phase名／stage名などの表示用detailを含めない | serialization golden／property test |
| SEC-CP-08 | Information disclosure | diagnosticはlayer、path、key、actual type、expected valuesに限定し、raw value全体と環境変数を出さない | secret sentinel negative assertion |
| SEC-CP-09 | Denial of service | 1 resolutionのread対象を3層へ限定し、recursive directory scan、polling、retry loopを持たない | port call count test |
| SEC-CP-10 | Elevation of privilege | manual invocationをmode bypassとして扱っても、C6のprovenance／repository／landing guardを迂回するauthorityをC2へ与えない | public type／dependency boundary test |

## Input and Command Safety

- C1のpath入力は既存workspace selectorでcanonical recordへ解決し、利用者入力のpath traversalを直接結合しない。
- event keyは標準JSON→UTF-8→base64urlでdataとしてencodeし、shell fragmentへ展開しない。
- C2は`gh`、shell、filesystem writeをimportしない。
- configuration read failureはtyped `read-failure`として返し、既定`prompt`へfallbackしない。
- `auto` standing consentは`create | sync | close`以外へ拡張せず、repair、PR、merge、release、publish、deployを拒否する。

## Secrets and Compliance

- `gh` authenticationは後続Gateway Unitが既存credential storeへ委譲し、本Unitへtokenを渡さない。
- state、audit、event key、diagnosticへsecretを保存しない。
- 新しいretention、data residency、external telemetry、security scan serviceを追加しない。
- repositoryの既存typecheck、Biome、test、dependency policyを維持し、本Intent外のadvisory修復を混在させない。

## Acceptance

1. secret sentinelを含むinvalid configでもstdout／stderr／state／event keyにsentinelが現れない。
2. `true`、`false`、未知値は全件diagnosticになり、policy／GitHub mutationへ到達しない。
3. manual inputはmodeを要求しないが、安全guardを所有するC6以外へremote execution権限を与えない。
4. path traversal文字列をIntent selectorへ渡してもworkspace外fileをreadしない。
