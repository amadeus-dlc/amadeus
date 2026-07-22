# Tech Stack Decisions — tla-arm-toolchain

## Constraints

`business-logic-model.md` のTLA/TLC adapter、`business-rules.md` のversion / JVM profile、`requirements.md` のrepo-local experiment、`technology-stack.md` のcurrent stackを維持する。production framework、dist、self-installへJVM / jarを配布しない。

## Selected stack

| Concern | Selection | Rationale |
| --- | --- | --- |
| Adapter | Bun 1.3.13 / TypeScript ESM | current CLI、typed parser / Result union |
| Model checker | TLA+ tools 1.7.4 | fixed official artifact / parser grammar |
| JVM | OpenJDK 26.0.1 | JAVA_HOME distribution manifest / version / heap profileを固定 |
| Acquisition | HTTPS fixed URL + SHA-256 + 3-origin allowlist | supply-chain identityを閉じる |
| Cache | `node:fs` immutable ignored cache | acquisitionとoffline runを分離 |
| Identity | `node:crypto` SHA-256 | jar / model / run manifestをcontent-address |
| Tests | `bun:test` + fixed TLC stream fixtures | acquisition / parser / timeoutを決定的検査 |

## Runtime profile

JavaはJAVA_HOME全runtime file manifest / executable realpath / versionを検証し、array argvで`-Xms256m -Xmx1024m`、UTF-8、en-US、UTC、workers=1を固定する。process adapterはOS-level network-deny providerとenforcement probe receiptを必須とし、platform provider不在時はfail-closedにする。TLC output grammarは1.7.4専用incremental parserとして管理し、raw bytesを保持してCRLFだけをLFへ正規化し、unknown markerへfallbackしない。

## Rejected additions and checks

container runtime、dynamic latest download、parallel TLC、distributed checker、shell parser、新規Java libraryを追加しない。CIはacquire / verify stepとOS-level network-denied offline run stepを分離し、package / dist diff 0、network deny probe PASS、JDK distribution / jar checksum一致をmachine receiptで確認する。
