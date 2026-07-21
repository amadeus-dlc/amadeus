# Security Requirements — experiment-contract-provenance

## Threat boundary

`business-logic-model.md` のblind provenanceとstrict parser、`business-rules.md` のinput isolation / allowlist / freeze proof、`requirements.md` のFR-3・NFR-2、`technology-stack.md` のlocal Bun / TypeScript CLIを正本とする。remote service、multi-tenant authentication、regulated personal data、network credentialは本Unitへ導入しない。

保護対象はpublic input manifest、arm-owned source、freeze SHA、event ledger、禁止path scan receipt、transaction identityである。脅威はprivate fixture漏洩、先行arm evidence混入、path traversal、manifest改竄、event replay、same-ID different-bytes、handler substitutionである。

## Authorization and isolation

- commandはfold済みstateと既決のcommand固有proofを満たす場合だけ許可する。start / freezeはactual-input manifest + forbidden-path scan、revealはT freeze receipt、record-skeletonはskeleton evidence、request-promotionはderived promotion permissionを要求する。他commandは対応handlerのtyped preconditionを使い、全command共通の新しいcapability receiptを導入しない。process userの存在だけをauthorizationとしない。
- pathはrepository-relative canonical formへparseし、absolute path、`..` escape、symlink escape、allowlist外pathを拒否する。
- Arm S inputにはArm T path / evidence、sealed fixture detail、B1 evidenceを0件とする。start / freeze時にactual input manifest hashと禁止path scan receiptを再検証する。
- `authoring-start` / `freeze` handler identityをclosed binding setで検証し、unknown / duplicate handlerを起動時に拒否する。

## Integrity and data protection

canonical JSONとdomain-separated SHA-256でmanifest、event、transactionを識別する。同一transaction ID / 異bytesはcorruption、異transactionのevent replayはduplicateとしてfail-closedにする。hashはauthentication secretとして扱わず、provenance integrity identifierとして用いる。

ledgerへsecret、credential、absolute home path、raw sealed payloadを書かない。errorはdiscriminatorとsafe identityを保持するが、private input contentやenvironment全量を含めない。log / reportの実入力manifestはallowlistされたpath identityだけを記録する。

## Verification

security testsはcommandごとのrequired proof欠損、path traversal / symlink escape、unknown fields、private path混入、Arm T→S leakage、missing scan receipt、manifest mismatch、event replay、same-ID different-bytes、handler substitutionをred fixtureとする。新規runtime dependency、network egress、credential readが0件であることをdiff / import scanで検査する。
