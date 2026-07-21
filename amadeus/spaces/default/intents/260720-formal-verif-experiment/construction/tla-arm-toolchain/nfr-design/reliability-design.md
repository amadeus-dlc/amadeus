# Reliability Design — tla-arm-toolchain

## 上流と outcome model

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、artifact integrity、offline replay、closed verdict normalizationを設計する。

## VerifiedArtifactCache

downloadはsame-directory tempへstreamし、flush、hash/length再読、exclusive atomic rename、parent sync後だけreceiptを返す。rename後response喪失はdescriptor/hash lookupで同receiptへ収束する。partial/corrupt bytesは原因receiptをdurable化してからquarantine bytesを削除し、receiptなし削除や2件目quarantineを拒否する。

## TlcStreamParser

`TlcStreamParser174` はincremental UTF-8 decoderとclosed marker state machineを持つ。1-byte/codepoint/marker/line境界とLF/CRLF分割で同じsemantic resultを返し、invalid UTF-8/lone CR/unknown error/warning/contradictory terminal/truncated traceをfailureにする。EOFで、exact completion marker=1、statistics tuple=1、depth marker=1、queue=0、error/warning/trace=0が同一runに揃い、statistics/depthの後に矛盾markerがない場合だけparser自身がterminal reason `EXHAUSTED`をmintする。marker欠損/重複/EOF未到達ではmintせず、exit codeから推定しない。

DETECTEDはnamed invariant、frozen source map、ordered trace一致時だけ、NOT_DETECTEDはexit0、exact completion1、queue0、stats/depth、EXHAUSTED、profile identity、warning0が同一runへ結合した場合だけ生成する。それ以外はtyped HARNESS_ERRORである。

## Recovery tests

acquisition lock owner publish/quarantine/release、preallocation ACTIVE/release receipt、cache write/flush/rename/sync、quarantine receipt/delete、network deny、timeout/kill、completion/stats/depthの欠損/重複/並び/EOF、stream chunk境界へcrash/corruptionを注入する。合否は永久lock=0、orphan reservation採用=0、ack済みjar消失=0、corrupt実行=0、partial NOT_DETECTED=0、同一raw inputの異counterexample identity=0である。
