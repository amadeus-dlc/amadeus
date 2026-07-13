# Release & Migration Closure Scalability Requirements

## 上流と適用範囲

本成果物はU-06の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。scale対象はfixed release manifestのfile、receipt、coverage、findingである。現contractは3 provider、4 native driver、4 harness、2 deterministic platform、4 live driverへ閉じる。

## Capacity dimensions

| Dimension | Symbol | Current contract | Target behavior |
|---|---:|---|---|
| provider/native driver | p/d | 3/4 | cardinality 2/1/1、exact set |
| distribution harness | h | 4 | dist 4、self-installはClaude/Codexのみ |
| deterministic platform | o | 2 | macOS + GitHub Actions Linux |
| credentialed live driver | l | 4 | macOS全件、missing 0 |
| functional requirement coverage | q | 26 | FR-01〜FR-26各1以上 |
| release domain | c | 6 | registry/projection/docs/platform/live/Issue all green |
| finding/receipt/file | k/r/f | manifest-driven |全件aggregate、drop 0 |

## Scalability requirements

| ID | Requirement | Verification |
|---|---|---|
| U06-SCALE-01 | file digestは`O(f log f)`以下、receipt/coverage/findingは`O((r+q+k) log(r+q+k))`以下、追加memory線形 | operation/object count |
| U06-SCALE-02 | finding数が増えてもfirst-errorで停止せず、全件canonical aggregateしdrop/duplicateしない | generated finding set |
| U06-SCALE-03 | registry/distro/docs/live/platform集合をclosed expected setへexact matchし、unknown/extraを暗黙許可しない | cardinality/set fixture |
| U06-SCALE-04 | tree変更ごとにnew candidateで全receiptを再評価し、旧closed reportや部分receiptをincremental successへ流用しない | mutation/rebuild test |
| U06-SCALE-05 | receipt/report/provider summaryだけの更新はinput digestを変えず、authored/generated input変更だけがnew candidateを要求する | manifest boundary test |
| U06-SCALE-06 | Issue ensureのpublisher concurrencyを1に限定し、create後re-searchでopen exactly 1を要求する | race fixture |
| U06-SCALE-07 | coverageはFR-01〜FR-26を各1以上へ逆引きし、skip/unimplementedをrow数で覆い隠さない | coverage completeness test |

## Growth and change policy

provider、driver、harness、platform、live matrix、FR集合の追加はhorizontal runtime scalingではなくrelease schema変更である。expected set、registry cardinality、package/docs manifest、coverage、live evidence、test matrixを同一Intentで更新する。dynamic discoveryやunknown receipt acceptanceでclosed contractを迂回しない。

large repository対応でremote database、cache、queue、distributed workerを追加しない。必要になった場合はreceipt provenance、single publisher、candidate immutabilityを再設計する別Intentとする。

## Degradation policy

input/receipt/finding増加時にdomain、driver、platform、coverage rowをsample/dropしない。missing/red/stale/extra/unknownはすべてblocked findingへ集約する。live不足をfake/skip/floor/legacyで補完せず、Linux receiptをmacOS liveへ変換せず、Issue競合を自動修復しない。
