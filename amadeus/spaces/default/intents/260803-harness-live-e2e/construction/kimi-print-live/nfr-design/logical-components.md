# Logical Components — kimi-print-live

## 上流入力

`business-logic-model.md:7-17`のKimi C5/C6 sliceを、C2 gate、C4 lifecycle、C7 outcome、C8/C9 evidenceへ接続する。

## Components

| ID | Component | Responsibility |
|---|---|---|
| LC-KP-01 | `KimiModelIdParser` | prefix正規化、closed grammar、brand化 |
| LC-KP-02 | `KimiCapabilityProbe` | binary/version/help/dist/lease可否のread-only検査 |
| LC-KP-03 | `KimiConfigBuilder` | typed documentとserializerによる0600 TOML生成 |
| LC-KP-04 | `KimiCredentialAdapter` | opaque lease要求とclosed `CredentialViewSpec`生成 |
| LC-KP-05 | `CredentialLeaseBroker` | source secret、run-private lease view、失効の唯一の所有者 |
| LC-KP-06 | `KimiPrintSpawnSpec` | exact argv/cwd/env、run/process identity |
| LC-KP-07 | `BoundedPrintCollector` | raw byte上限、digest、`no active` matcher、discard-drain |
| LC-KP-08 | `SecretLeakMatcher` | lease-owned secret照合とzeroize |
| LC-KP-09 | `KimiStatusJourney` | exit/timeout/output/filesystem anchorのAND判定 |
| LC-KP-10 | `KimiCleanupReceipt` | symlink/config/lease/scratch/groupの回収証跡 |

## Ownership and Interfaces

C5はLC-KP-01〜04/06を所有し、C4へclosed `KimiPrintSpawnSpec`とopaque `CredentialViewSpec`を渡す。C4はLC-KP-05/07/08/10、supervisor、deadline、registrarを所有し、C5へsource locatorやsecretを返さない。LC-KP-05はclosed credential schemaのsecret-bearing fieldまたは明示的opaque-secret recordだけを抽出し、lease view絶対pathとsymlink targetも加えてLC-KP-08へautomatonとして渡す。metadata scalar、unknown schema、8 bytes未満の値は秘密patternへ昇格せず、曖昧なcredential形式自体をspawn前に拒否する。C6はLC-KP-09を所有し、bounded collectorの`{exit, timedOut, counts, digests, noActiveMatched, leakMatched}`だけを読む。証跡は既存C8 atomic appendとC9 projectionを呼ぶだけで、U06 componentを追加しない。

生成順はgate→Phase closure→model parse→probe→registrar→scratch→config/lease→spawn、終了順はgroup reap→symlink→config→lease→scratch→evidence commitで固定する。cleanupは全対象を試行し、失敗を集約してPASS候補より優先する。

## Failure Domains and Handoff

model/config/credential failureは1 run、output floodとhangは1 process group、C8/C9 failureは既存共通evidence boundaryへ封じる。stale/foreign run nonceとPID start identity mismatchはfail-closedである。Code Generationには10 componentのinterface、具体的なbyte/deadline上限、credential pattern抽出規則、`kimi-print-contract` mutant名を引き渡す。AWS/infrastructure componentは追加しない。
