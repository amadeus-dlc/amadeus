# Reliability Design — static-gate-engine

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。availabilityではなく、完全走査、閉じたResult、read-only check、new-output-only evidence、決定的再実行を信頼性境界とする。

## Check状態機械

| 状態 | 成功時 | failure時 |
| --- | --- | --- |
| `contract-loading` | `ledger-loading` | schema／rule不正=`RULE_INVALID`、baseline契約不正=`BASELINE_INVALID` |
| `ledger-loading` | `snapshotting` | toolchain欠落=`TOOL_MISSING`、base ledger欠落／不正=`BASELINE_MISSING | BASELINE_INVALID` |
| `snapshotting` | `structural-scanning` | root／zero／symlink／unreadableを対応InfraCodeへ写像 |
| `structural-scanning` | `semantic-classifying` | partial=`SCAN_PARTIAL`、tool failureを閉じたchild写像へ変換 |
| `semantic-classifying` | `policy-evaluating` | unresolved／coverage mismatch=`RULE_INVALID` |
| `policy-evaluating` | `Pass` または非空 `Violations` | infrastructure failureは `Error` のみ |
| 任意のmanifest確定後状態 | — | 取得済みScanSummary、findings空、exit 2 |

状態遷移は前進のみで、failure後のfallback、前回結果読込、候補0件への置換、同一invocation内retryを持たない。`Violations` は非空findingを型で保証し、`Error` はfindingsを常に空にする。

## Failure taxonomy

child failureは上流の `InfraCode` 閉集合を拡張せず、次へexhaustiveに写像する。

| failure | code | 固定message prefix |
| --- | --- | --- |
| binary／platform receipt欠落、実行不可 | `TOOL_MISSING` | `AST_GREP_MISSING` |
| bundle／capability／contract不正 | `RULE_INVALID` | `AST_GREP_RULE_INVALID` |
| timeout | `INTERNAL_ERROR` | `AST_GREP_TIMEOUT` |
| signal | `INTERNAL_ERROR` | `AST_GREP_SIGNAL` |
| EPIPE等spawn I/O | `INTERNAL_ERROR` | `AST_GREP_IO` |
| resource exhaustion | `INTERNAL_ERROR` | `AST_GREP_RESOURCE` |
| 安全に分類不能なnonzero exit | `INTERNAL_ERROR` | `AST_GREP_EXIT` |
| stdout schema drift | `RULE_INVALID` | `AST_GREP_RULE_INVALID` |

unknown exceptionだけを `INTERNAL_ERROR/UNEXPECTED` にする。既知failureをgeneric catchで覆わず、stderr文字列をcode判定へ使わない。

## 完全走査と再現性

初期manifest、snapshot receipt、ast-grep sentinel receipt、走査後manifestをpath＋digestの全単射で照合する。欠落・余剰・重複は `SCAN_PARTIAL`、途中変更は `SOURCE_CHANGED_DURING_SCAN`、対象0件は `SCAN_ZERO` とし、raw findingを構築しない。

同一revision、config、dependency receiptではidentity、finding順、scan summary、stdout bytesを一致させる。timestamp、PID、temp path、filesystem列挙順をResultから除外する。check前後のsource、config、baseline、exemption、canonical evidence digestを比較し、変更0件をpostconditionとする。

## Evidence commit状態機械

evidence commandは検証済みimmutable payloadを得るまでfilesystem writeを開始しない。

1. parentがrepository内non-symlink directoryであることを検証し、device／inode receiptと単一componentのdestination／temp basenameを作る。
2. absolute `process.execPath`、親module内の固定 `--eval` source、`shell:false`、固定environment、閉じたstdioで、parentを `cwd` とする専用Bun committer childを1回起動する。childはcode digestと `lstat(".")` をreceiptへ照合し、不一致ならwrite前に停止する。
3. childが固定cwd直下へsame-directory tempを `O_CREAT | O_EXCL` で作る。
4. payloadを一度writeし、file fsync、close、regular-file lstat、payload digest照合を行う。
5. `link(temp, destination)` を一度実行する。`EEXIST` は競合として失敗し、既存bytesを変更しない。
6. link成功後にdirectory fsyncを一度行い、成功時だけtemp名をunlinkする。

link前failureはcanonical未作成であり、committer childが自身のtemp aliasをbest-effort cleanupして終了する。link成功後directory fsync failureはdestinationが存在する可能性を含むため `INTERNAL_ERROR/EVIDENCE_DURABILITY_UNKNOWN` とし、destinationとtemp aliasの両方へ自動unlink／retry／上書きを行わない。callerはdestinationを再読してpayload digestを照合し、新しい明示invocationと新しいpathを選ぶ。crashまたはunknownで残ったtemp名はcanonicalではなく、通常checkやevidence入力として探索しない。

## Ledgerとbootstrap回復

baseにcanonical baselineが存在すればGit由来previous setだけを使い、provenance fallbackを拒否する。baseに存在しない初回だけ、bootstrapBaseRevision、approved B_pre、candidate B0、initial exemption、approval receiptの全digest一致を検証する。不一致は `BASELINE_MISSING | BASELINE_INVALID` で、working treeから集合を推測しない。

baseline／exemption growth、同数replacement、stale exemptionは正常に完了したpolicy検査の `Violations`／exit 1であり、schema欠落や読取不能の `Error`／exit 2と混同しない。通常checkはledgerを更新せず、回復は修正後の明示再実行で行う。

## Failure injection matrix

| domain | 注入点 | assertion |
| --- | --- | --- |
| source | lstat、open、read、fstat、再hash | exact InfraCode、partial Pass 0、canonical bytes不変 |
| tool | copy、digest、spawn、timeout、signal、stdout | 上表のcode／prefix、ast-grep spawn最大1 |
| semantic | symbol、union、path、structural全単射 | `RULE_INVALID`、成功evidence 0 |
| ledger | Git欠落、schema、growth、replacement、fallback再利用 | ErrorとViolationsの正確な分離 |
| approval audit | active intent cursor／state／UUID、固定audit root、event欠落／重複／field不一致 | caller指定manifest 0、`RULE_INVALID`、approved evidence 0 |
| evidence | parent差替え、child cwd inode照合、create、write、fsync、close、link、directory fsync、競合writer | repository外write 0、上書き0、成功時partial canonical 0、unknownではtemp／destinationを保持 |
| committer launch | PATH、cwd偽module、BUN_OPTIONS、追加FD、code digest | absolute Bun＋固定eval sourceだけを実行、environment／FD漏洩0 |
| render | unknown internal variant、serialize failure | exhaustive mapping、stdout単一objectまたはexit 2 |

## Recovery objectives

- RPO: check対象canonical bytesの変更0件、link成功済みevidence payloadの欠損0件。
- Retry: 同一invocation内0回。修正後またはcaller判断による新しい明示invocationだけを許可する。
- Recovery bound: read-only checkは原因除去後1回。link前evidence failureは同一payloadを新規pathへ1回、durability unknownはdestination再読1回で状態を確定する。
- Verification: 再実行後にResult、exit、manifest、canonical before／after digest、child countを再読する。

remote failover、backup restore、circuit breakerはfilesystem-local短命CLIには非適用である。
