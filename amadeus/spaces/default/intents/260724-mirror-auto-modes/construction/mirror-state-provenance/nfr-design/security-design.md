# Security Design — mirror-state-provenance

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Trust Boundaries

state bytes、repair input、remote markerをuntrusted internal dataとして扱う。state pathはIntent selectorだけから取得し、tempはsame directory、owner-only、symlink非追跡で作る。rename直前にtarget regular-file identityを再確認する。

## Parser Controls

tokenizerはduplicate key、unknown schema／field／statusを全件issue化し、depth 16、string 256 KiB、key 128 bytes、aggregate 2 MiBで停止する。sentinelはstart／end各1個だけを許す。invalidではstate／audit／remote callを0件にする。

## Repair and Marker

repair applyはlock内でchallenge ID、Intent UUID、repository、operation ID、plan digest、exact phrase、TTL 10分、active membershipを再検証する。成功transitionとchallenge削除を同じcommitへ含める。

repair plan wire schemaは次のclosed unionとする。root key順は`schema,kind,intentUuid,repository,operationId,issueNumber,provenanceDigest,action`、全keyを必須にして非該当値も`null`で表す。`schema=1`、`kind="relink"|"abandon"`、Issue numberはpositive safe integerまたはnull、repositoryはlowercase canonical、UUID／operation ID／digest／actionはNFC変換しないvalidated ASCII contract valueとする。JSON numberはleading zeroなし10進、whitespaceなし、LFなしUTF-8 bytesをSHA-256 lowercase hex化する。inspectionとapplyは同じ`encodeRepairPlanV1`だけを使う。

| kind | issueNumber | provenanceDigest | action |
|---|---|---|---|
| `relink` | positive safe integer必須 | remote markerから再構成したcanonical `MirrorProvenanceV1` bytesのSHA-256 lowercase hex必須 | literal `"replace-provenance"` |
| `abandon` | `null`必須 | `null`必須 | literal `"mark-abandoned"` |

`MirrorProvenanceV1`のcanonical bytesはfield順`schema,intentUuid,intentDir,repository,issueNumber,operationId,preparedAt`、whitespaceなしUTF-8 JSONである。variant invariant違反、unknown action、digest 64 lowercase hex以外をchallenge発行前に拒否する。

```json
{"schema":1,"kind":"relink","intentUuid":"00000000-0000-4000-8000-000000000001","repository":"owner/repo","operationId":"op-1","issueNumber":42,"provenanceDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","action":"replace-provenance"}
```

```json
{"schema":1,"kind":"abandon","intentUuid":"00000000-0000-4000-8000-000000000001","repository":"owner/repo","operationId":"op-1","issueNumber":null,"provenanceDigest":null,"action":"mark-abandoned"}
```

markerは永続済みcreate identityだけからcanonical JSON→UTF-8→base64urlで描画する。payload 256 KiB、完全marker 1件、repository／Intent／operation／Issue全field一致を必須にする。

## Disclosure Controls

credential、token、raw stderrをstate、outbox、audit context、warning、markerへ含めない。failure summaryはfixed redacted classificationだけを保存する。

## Verification

symlink swap、duplicate key、oversize、repair replay／cross-binding、marker mismatch、secret sentinelに加え、上記2 golden wire、各variantのnull／action／digest mutationを検証する。
