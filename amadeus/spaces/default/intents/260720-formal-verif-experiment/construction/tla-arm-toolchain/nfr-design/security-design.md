# Security Design — tla-arm-toolchain

## 上流と boundary

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、supply-chain差替え、redirect abuse、PATH/proxy leakage、shell injection、fixture意味漏洩を防ぐ。

## AcquisitionPolicy

`AcquisitionPolicy` はversion/filename/fixed HTTPS URL/SHA-256/3-origin allowlist/128 MiB capをclosed descriptorとして検証し、redirectごとにscheme/originを再確認する。credential/Authorizationを渡さず、TLS disableを許さない。verified bytesだけをimmutable cacheへpublishする。

## OfflineTlcSandbox

offline runnerはfetch portを型上持たず、proxy/credential envを除去し、OS-level deny-by-default network namespaceを必須とする。provider identityとsocket/DNS/loopback deny probe receiptをrun前に検証し、強制不能なら`NETWORK_ISOLATION_UNAVAILABLE`で停止する。

`JdkSnapshotVerifier` はfreeze時にJAVA_HOME全regular files/symlink targetsのcanonical path/length/SHA-256 manifest、OpenJDK 26.0.1 version、java realpathをcontent-addressed read-only execution snapshotへmaterializeする。run前の全manifest再hashはsuite deadline内で行い、snapshot sealと一致した場合だけ `VerifiedJdkSnapshot` capabilityをmintする。runnerは元JAVA_HOMEをnamespace/read allowlistから除外し、JDK、jar、model、cfgを同じimmutable snapshot identityへbindするため、検証後の元path差替えは実行対象へ影響しない。snapshot強制不能ならfail closedとする。argvはarray、pathはsnapshot-relative/repository-contained allowlistとする。

## Verification

wrong origin/hash/version、redirect loop、JDK module/native/conf drift、再hash後の元JAVA_HOME差替え、snapshot seal差替え、sandbox unavailable、socket/DNS、proxy/credential、shell/path escape、fixture leakageをred fixtureにする。framework/dist/self-install変更=0、元JAVA_HOME可視path=0、unsandboxed fallback=0である。
