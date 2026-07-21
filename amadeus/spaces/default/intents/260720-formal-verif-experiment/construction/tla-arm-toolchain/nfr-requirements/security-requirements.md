# Security Requirements — tla-arm-toolchain

## Threat boundary

`business-logic-model.md` のfixed artifact / offline process、`business-rules.md` のchecksum / safe argv、`requirements.md` のNFR-3、`technology-stack.md` のlocal toolchainを正本とする。脅威はsupply-chain差替え、redirect abuse、PATH shadowing、proxy leakage、shell injection、fixture期待値混入である。

## Acquisition controls

- URL、version 1.7.4、filename、SHA-256、3 redirect origins、128 MiB capをclosed descriptorとして検証する。
- TLS verificationを無効化せず、redirectごとにHTTPS scheme / originを再検証する。credential / Authorization headerを送らない。
- checksum / byte cap / descriptor一致後だけimmutable cacheへpublishする。same path different bytes、partial fileをquarantineし実行しない。

## Offline execution controls

run adapterはfetch portを持たず、proxy / credential environmentを除外したclosed envに加え、OS-level deny-by-default network sandbox / namespaceを必須とする。adapter preflightはnetwork-deny policy identity、platform provider、loopbackを含むsocket禁止probe receiptをmintし、強制不能ならprocessを起動せず`NETWORK_ISOLATION_UNAVAILABLE`を返す。接続試行はsandbox deny receipt付きtyped failureとし、unsandboxed fallbackを禁止する。

Java executableはrealpath、OpenJDK 26.0.1 version outputに加え、resolved `JAVA_HOME`の全regular runtime filesとsymlink targetをcanonical relative path / byte length / SHA-256で列挙した`JdkDistributionManifest`へbindする。少なくとも`bin/java`、`lib/modules`、native libraries、`conf` / security filesを含め、run前にmanifest identityを再検証する。jarも各run前に再hashする。

argvはarrayのまま渡し、shell、glob、command substitutionを使わない。cwd / model / cfg / output pathはrepository-contained allowlistへ限定する。model / cfg / metadataへfixture ID、期待failure、injection branch、Arm S evidenceを含めない。

## Verification

wrong URL / origin / checksum / version、redirect loop、PATH shadowing、JDK module / native lib / security config drift、network sandbox unavailable / socket / DNS attempt、proxy / credential injection、shell metacharacter、path escape、fixture semantic leakageをred fixtureとする。framework / dist / self-install変更は0件とする。
