# Reliability Requirements — sealed-fixture-registry

## Reliability model

`business-logic-model.md` のimmutable seal / disclosure / promotion transaction、`business-rules.md` のproof / scan fail-closed規則、`requirements.md` のNFR-1〜NFR-3、`technology-stack.md` のfilesystem / Git境界を前提とする。成功は再読可能なcontent identityとappend-only lifecycleで証明する。

## Durable transactions

seal、disclosure、promotionはsame-filesystem stagingへ全fileを書き、file flush、staging directory sync、exclusive atomic rename、parent directory syncの順に実行し、parent sync後だけsuccessをacknowledgeする。

capacity reservationもappend-only `ACTIVE -> CLOSED | ABORTED` transactionとして同じdurability手順を使う。startupはACTIVE owner / revision / reserved bytesを再読し、same revision resumeまたはverified-stale ownerの明示abort以外で解放しない。reservation close前crashはACTIVEを保持し、close transactionのrename後crashはlookup / sync検証でCLOSEDへ収束する。

rename前crashは旧state、rename後crashはcomplete successor directoryが存在すれば全hash / linkage再検証後にnew stateへ収束する。response喪失時はseal identity、arm / fixture successor、permission nonceでlookupし、同一bytesだけ同じreceiptを返す。

overwrite、delete、same identity / different bytes、same nonce / different manifest、event / grant片側だけを拒否する。staging orphan、torn length / hash、scan receipt driftをsuccess recordへ採用しない。

## Failure and recovery

proof baseline red、target非red、non-target波及、scanner / read failure、branch drift、grant mismatch、permission mismatchは別typed errorとして保持する。failureをzero scan、valid proof、warningへ丸めない。

crash injectionはreservation claim / close、materialization destination write / rename / receipt、seal / disclosure / promotionの各file write / flush、directory sync、rename前後、ack前で行う。合否はack済みrecord消失0、partial success 0、stale reservation二重claim0、exact materialization recovery成功、duplicate lifecycle event 0、同一requestの異receipt 0である。

## Traceability

candidate source、proof commands / raw artifacts、branch / patch、payload manifest / scan、seal、disclosure / materialization、promotionをidentity chainで双方向に辿れる。会話時刻、mtime、branch nameだけをrecovery根拠にしない。
