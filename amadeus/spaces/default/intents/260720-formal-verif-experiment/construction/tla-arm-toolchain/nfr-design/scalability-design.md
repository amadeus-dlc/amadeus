# Scalability Design — tla-arm-toolchain

## 上流と finite profile

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。voters=3、choices=3、submitted tokens=5、received tokens=3、GoA 1..8、initial/amend各1、hold1、workers1を固定する。

## ProfileIdentity

`TlcProfileIdentity` は全domain cardinality、action union、7 invariants、heap、timeout、workersをcanonical encode/hashする。model generator、run manifest、completion proofが同一identityを持つ場合だけ実行/判定する。unknown/+1 token、workers2、partial bound driftをrejectする。

1 cellは1 process/1 workerでfixed pointまで探索する。generated/distinct/queue/depthはsafe integerとしてparseし、overflow/negativeをHARNESS_ERRORにする。artifact cacheはdescriptor identityごと1、staging1、quarantine1で、version変更は新namespaceとする。

## Growth verification

各closed cardinalityと+1、profile drift、stats overflow、2 revision分離、repeated download failureを検査する。合否はactive TLC process=1、run中download=0、unknown action=0、old/new profile混在=0である。

