# Reliability Requirements — tla-arm-toolchain

## Reliability model

`business-logic-model.md` のcache verification / parser、`business-rules.md` のcomplete proof / replay、`requirements.md` のNFR-1/NFR-3、`technology-stack.md` のBun / Java境界を前提とする。availabilityではなくartifact integrity、offline replay、closed verdict normalizationを保証する。

## Artifact durability

downloadはsame-directory temporary fileへstreamし、file flush、hash / length再読、atomic rename、parent directory sync後だけverified cache receiptをacknowledgeする。rename後ack前crashはdescriptor hashでlookup / reverifyし同一receiptへ収束する。

partial / corrupt cache、same hash path different bytes、descriptor driftを拒否する。startupはsingle staging / quarantine slotを検査し、partial hash / length / cause receiptをdurable化した後だけfailed bytesを削除してslotを再利用する。receiptなし削除、2件目quarantine、run前re-hash failureからの自動download fallbackを禁止する。

## Run and parser reliability

同一model / jar / JDK / profile / subject / deadline manifestの2 runは同じverdictとcounterexample identityを要求する。timeout、spawn / kill failure、unknown / contradictory marker、truncated trace、warning、queue nonzero、stats欠損を別failureとして保持する。

counterexampleはnamed invariant、frozen source map、ordered state traceを全て検証した場合だけDETECTEDとする。complete exploration proofが揃う場合だけNOT_DETECTEDとし、exit 0単独を成功にしない。

stream parserはincremental UTF-8 decoderでraw byte identityを保持し、decoded CRLFをLFへ正規化する。1-byte chunks、UTF-8 code point途中、marker途中、line境界、LF / CRLFのどの分割でも同じsemantic parse result / counterexample identityを返す。invalid UTF-8とlone CRはparse failureにする。

## Tests and observability

cache / staging / quarantine write・flush・rename・sync、run start / network deny / timeout / kill、stream chunk / newline各境界へcrash / corruptionを注入する。合否はack済みjar消失0、failed bytes無制限保持0、corrupt JDK / jar実行0、partial探索NOT_DETECTED0、同一raw inputの異counterexample identity0である。

receiptはdescriptor、actual jar、JDK、model / cfg、profile、argv、cwd、deadline、raw streams、exploration proofをidentity chainで結ぶ。
