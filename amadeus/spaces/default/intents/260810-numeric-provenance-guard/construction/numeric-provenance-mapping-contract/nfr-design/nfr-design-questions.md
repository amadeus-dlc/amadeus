# NFR Design Questions — numeric-provenance-mapping-contract

本UnitではNFR Requirements成果物がscopeによりabsent-and-expectedであり、宣言済みのSEC-* requirement IDは存在しない。設計は既存 `requirements.md` とFunctional Designを再分類せず参照する。

## Q1. Trust boundary

local sweepが扱うrepository Markdownとpathを、allowlistされたread-only rootとworkspace全体信頼のどちらで検証するか。

[Answer]: E-NFRDU1-1 `allowlisted-read-only-roots`。intent成果物とactive codekb re-scanだけを列挙し、canonical root containment、通常file、snapshot不変を読込前後に検証する。provenanceに記載されたcommandやlinkは実行しない。自動裁定: `auto-decision-ad8fdcef909daf7f71247fbf612374b5`。

## Q2. Integrity chain

sweep authority、Generated Mapping、approvalをlatest-file-winsとimmutable digest chainのどちらで結ぶか。

[Answer]: E-NFRDU1-2 `immutable-digest-chain`。CorpusSnapshot、predicate、labels、statistics、mapping、approval、projectionをdigestで一方向に結び、いずれかの不一致をtyped failureとする。自動裁定: `auto-decision-37154272cfd61e9394f77e63e1f5a99b`。

## 対話方式

[Answer]: E-NFRDU1-0 `guide`。trust boundary、integrity chainの順に裁定した。自動裁定: `auto-decision-d3888fed8f5ac364b5ac0638524f293d`。

## 曖昧性分析

- security-requirements.mdとtech-stack-decisions.mdは本scopeで意図的に生成されていないため、SEC-* IDやcloud controlを新設しない。
- U1はlocal、read-only、networkなしのspec/sweep Unitであり、authentication、authorization service、TLS、KMS、AWS resourceは非該当である。
- 主な保護対象はcorpus境界、path containment、label/mapping integrity、approval provenanceであり、機密情報保管systemではない。
- fail-openはU2 runtime verdictの業務契約であり、U1 authority生成時のsnapshot driftやdigest不一致を黙って許容する意味ではない。
