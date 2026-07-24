# Security Design — mirror-distribution-docs

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Supply-chain Boundary

core、Projection Registry、generator、docs sourceだけを正本とし、dist／self-install／temporary treeをderived artifactとする。Registryはtool／skill／wrapper／registrationとdocsを列挙する唯一のownership boundaryである。output pathはroot内へcanonicalizeし、absolute、`..`、symlink escapeを拒否する。

## Integrity

tool／skill payloadはraw-byte SHA-256、wrapper／registrationはRegistryが指すsurface golden ownerで比較する。Unicode／newlineを正規化しない。Registry未登録pathをcopy／scan／validateしない一方、公開rootに存在する未登録artifactはcompleteness checkで拒否する。

## Public Artifact Scan

6 dist、4 self-installのtool／skill／wrapper／registrationと日英4文書をRegistryから列挙し、固定scanner／sentinel fixtureでtoken、credential、absolute user pathを検査する。除外はfixture内dummy値＋期待pathだけである。scannerはTransaction Coordinatorのshared read sessionを必須とし、生成途中のsnapshotやRegistry外pathを直接読めない。completeness checkは同じsessionの`listPublicRoot`で実pathを列挙し、Registry期待集合との差分を拒否する。

## Verification

byte mutation、CRLF/NFC、traversal、secret artifact種別、unknown docs marker、未登録公開artifact、filesystem adapterへの禁止依存をnegative fixtureで検証する。
