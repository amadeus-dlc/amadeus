# Security Requirements — mirror-state-provenance

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Data Classification and Trust

`amadeus-state.md`、repair input、remote markerは改変され得るinternal dataとして検証する。credential、token、raw GitHub stderrは保存対象外である。provenance markerにはIntent UUID、directory identity、repository、operation ID、timestampだけを含め、秘密情報を含めない。

## STRIDE Controls

| Threat | Control | Verification |
|---|---|---|
| Spoofing | markerとlocal provenanceのIntent／repository／operation／Issue numberを全field一致 | mismatch matrix |
| Tampering | duplicate key、unknown schema／field／status、sentinel重複を拒否 | malformed corpus |
| Repudiation | 全state mutationに`MirrorAuditContext`を必須化しoperation identityへ相関 | type／integration test |
| Information disclosure | warning／I/O failureはfixed redacted summaryだけを保存 | secret sentinel test |
| Denial of service | state 2 MiB、receipt／warning各1,000、challenge 100を受入上限とし超過を`invalid`でwrite前拒否 | boundary tests |
| Elevation of privilege | repairはIntent／repository／operation／digest／exact phrase／10分TTL／未消費を同lockで検証 | replay／cross-binding tests |

## File and Input Safety

- state pathは既存Intent selectorから得て、利用者入力pathを直接結合しない。
- temp fileはstateと同一directoryにowner-only permissionで作り、symlink追跡を拒否する。
- rename前にtargetが同じregular file identityであることを再確認する。
- parserは一般`JSON.parse`だけに依存せず、duplicate keyをtoken段階で検出する。
- tokenizerはnesting depth最大16、string UTF-8 bytes最大256 KiB、key最大128 bytes、aggregate最大2 MiBとし、再帰下降はdepth counterで上限前に拒否する。
- repair phraseは完全一致し、trim／case-foldしない。
- markerのbase64url payloadにsize上限256 KiBを設け、超過を`invalid`にする。

## Compliance

本Unitは新たなPII、PHI、cardholder dataを処理せず、GDPR／HIPAA／PCI-DSS適合を主張しない。Git管理されたIntent recordの既存access／retention policyを変更しない。

## Acceptance

1. secret sentinelがstate、audit context、warning、markerへ現れない。
2. symlink swap、duplicate key、sentinel重複で元file bytesが不変である。
3. expired／consumed／別Intent／別repository challengeをmutationなしで拒否する。
