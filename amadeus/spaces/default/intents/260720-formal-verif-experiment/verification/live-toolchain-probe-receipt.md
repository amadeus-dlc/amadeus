# Live TLC Toolchain Probe — 実測レシート(2026-07-22)

上流入力(consumes 全数): build-and-test-summary.md, build-test-results.md

## 実行条件

- 実行日時: 2026-07-22T05:51:32.400Z 〜 2026-07-22T05:53:27.725Z(UTC、TLC実行区間)
- 対象コミット: main `ebcdf5c8e`(PR #1327/#1330/#1332/#1337 着地後)
- 実行コマンド: `bun tests/formal-verif/support/tla-real-toolchain-probe.ts <scratch-root>`
- JAVA_HOME: Temurin 26.0.1+8(`java -version` 実測 "openjdk version 26.0.1" — FIXED_JDK_RUN_PROFILE {OpenJDK, 26.0.1} と一致)
- ホスト: darwin(sandbox-exec 隔離、DarwinSandboxExecProvider)

## 実測結果(probe stdout JSON からの転記)

| 項目 | 値 |
| --- | --- |
| TLC artifact sha256 | `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`(2,274,532 bytes、固定ディスクリプタ `d716a11e…` と一致) |
| artifact receiptIdentity | `4dea74a3e8378f4bec16053b030736d57bc0ad251cd53e50ea8443f561de8ee8` |
| modelIdentity(frozen FormalElection) | `dee3d8a63552f041abb0bb8f64d458dd6b230cf6c91cc609ba6c7a9b71970d66` |
| runIdentity | `43db24cdf0eb96cf5a55796754154a8cb15a96c1981f207c93f5e531f3af0b35` |
| jdkSnapshotIdentity | `3dcb93bbb98b155d6257566fca86c5027acc8413292237d80dc319b218ca31c0` |
| sandboxReceiptIdentity | `e797b42ff31455fa6bb53e9929ace27b47b6fd5dff6cc4768f109d78e71f832f` |
| TLC バージョン | 1.7.4(toolVersions.tlc) |
| exitCode / signal / timedOut / outputLimitExceeded | 0 / null / false / false |
| stderr sha256 | `e3b0c442…`(空バイト列の SHA-256 = stderr 出力ゼロ) |
| stdout sha256 | `bd0fb143ff005ec8738db3c61cea9f3cb321645336f0b99f6840a47c723c3b57` |
| verdict | `NOT_DETECTED`(完全探索 — parseTlcOutput174 の completion marker ゲート通過。cid:application-design:finite-exploration-not-detected-proof 準拠) |
| 探索ドメイン(seedOrBound) | workers=1, voters=3, choices=3, maxInitialPerVoter=1, maxAmendPerVoter=1, maxHold=1 |

## 判定

U4(tla-arm-toolchain)の live アダプタ面 — HTTPS artifact 取得(sha 検証)、JDK スナップショット、
sandbox-exec 隔離、TLC プロセス実行、complete exploration 正規化 — が実 OpenJDK 26.0.1 + 実 TLC 1.7.4
で end-to-end 完走することを実測確認した。CI の patch coverage allowlist に登録した live 専用行
(fs-tlc-toolchain.ts 162-225 / 322-353)は本 probe が実機検証の根拠となる。

raw 生成物(tlc-stdout.bin / tlc-stderr.bin)は session scratch にのみ存在し、sha256 を本レシートへ固定した。
