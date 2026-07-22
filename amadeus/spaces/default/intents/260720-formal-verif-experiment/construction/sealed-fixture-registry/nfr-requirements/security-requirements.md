# Security Requirements — sealed-fixture-registry

## Protected assets and threats

`business-logic-model.md` のsealed payload / disclosure grant、`business-rules.md` のblind exclusion / data safety、`requirements.md` のNFR-2/NFR-3、`technology-stack.md` のlocal repository境界を正本とする。脅威はfixture早期開示、secret / personal data / external election store混入、path escape、grant replay、payload改竄である。

## Data safety controls

- payload manifestをscanner inputの唯一の正本とし、logical path / content hash / byte lengthのbijectionを検証する。
- fixed rule-setでsecret、personal data、external election store referenceを全entryに適用し、全count 0かつtool / read成功時だけsealする。
- receiptは分類count、scanner / rule identity、path hashだけを持ち、match content、absolute path、external store URIを複製しない。
- syntheticまたはrepository内公開sourceだけを許し、symlink、directory entry、absolute / traversal pathを拒否する。

## Disclosure authorization

arm codeはsealed storeを直接readできない。materializationはcommit済みDisclosureEventと、seal / arm / freeze / worktree / destination allowlistへbindしたsingle-use grantを同時検証する。

Arm T freeze前、#1252以外の先行開示、skeleton確定前の残fixture、別arm / worktreeでのgrant使用を拒否する。materialized bytesをseal identityへ再hashし、destinationはrepository-contained allowlistへ限定する。

materializationはdestinationと同じdirectoryのgrant-ID staging pathへwrite / flushし、seal identity一致後にnonexistent final pathへatomic renameしてparent directoryをsyncする。receipt append前にcrashした場合、同じgrantの再試行はfinal pathをlookupし、event / grant / destination / exact bytesが一致すればreceiptをidempotentにappendして同じ成功へ収束する。異bytes、別destination、別grantの既存fileは拒否する。grantはreceipt commit時に消費済みとなる。

## Verification

testsは3分類match、scanner failure / drift、manifest entry missing / duplicate / extra、symlink / path traversal、freeze前reveal、grant replay / cross-arm / cross-worktree、materialization write / rename / receipt各境界crash、exact recovery、destination異bytesをred fixtureとする。credential / network / external election store readは0件とする。
