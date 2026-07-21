# Security Design — sealed-fixture-registry

## 上流と threat boundary

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。fixture早期開示、3分類データ混入、path escape、grant replay、payload改竄をfail closedにする。

## ScanPolicy

`ScanPolicy` は `SealedPayloadManifest` を唯一の入力列とし、canonical logical path/content hash/length と実読bytesのbijectionを検証する。symlink、directory、absolute/traversal path、manifest外entryを拒否する。version固定したscannerが secret/personal-data/external-election-store の3分類を全entryへ適用し、全count=0かつ全read成功時だけ `ZeroFindingScanReceipt` をmintする。receipt はrule/scanner identity、entry/path hash、countsのみを持ちmatch contentを複製しない。

## DisclosureCapability

arm codeはsealed storeをreadできない。`ArmFilesystemSandbox` はarm subprocessごとにread allowlistをmount/bindし、sealed root、Registry metadata root、他arm worktreeをnamespaceから除外する。sandbox capability probeに失敗するplatformではarmを起動しない。`DisclosureMaterializer` だけがunforgeable read capability handleを受け、commit済みeventとsingle-use grantを同時に読み、seal/arm/freeze/worktree/destination allowlistを再検証する。grant-ID stagingへwrite/flushし、bytesをseal identityへ再hash後、nonexistent destinationへatomic renameしてparent syncする。receipt commitでgrantを消費し、同grant exact retryだけをidempotentに回復する。arm subprocessはmaterialized destinationだけを次回のclosed read allowlistへ追加できる。

Git/Bun/scannerはrealpath/version/content/rule identityをfreezeし、Git config/hooks/external diff/textconv/locale/environmentをclosedにする。array argvとrepository-contained canonical pathだけを使う。

## Security verification

3分類match、scanner failure/drift、manifest missing/extra/duplicate、path/symlink escape、sealed root direct-read、sandbox capability欠損、freeze前/cross-arm/cross-worktree reveal、grant replay、destination異bytesをred fixtureにする。合否はarmからsealed root可視path=0、credential/network/external store read=0、unauthorized materialization=0、match content receipt=0である。
