# Security Design — static-gate-engine

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。repository内容、tool binary、base ledger、human approval receipt、evidence outputを信頼境界として扱い、remote serviceやcredentialは追加しない。

## Trust boundary

| 境界 | 信頼するもの | 拒否するもの |
| --- | --- | --- |
| command | 閉じたcommand、full SHA、正規化済みrepository-relative path | unknown option、短縮SHA、absolute／traversal path |
| source | `O_NOFOLLOW` descriptorと一致するlstat／fstat receipt由来bytes | symlink、inode差替え、non-regular、途中変更 |
| tool | tracked `toolchain-lock.json` のversion／platform／arch／SHA-256と一致する私有copy | PATH解決、元binary直接exec、digest不一致 |
| semantic dependency | frozen lockとcompiler receiptへ結合したdeclaration set | runtime download、別Program、receipt drift |
| previous ledger | literal full SHAに対する固定pathのGit object bytes | working treeからの推測、shell展開、曖昧revision |
| approval | candidate census、classification、reviewer、human gate audit event IDへdigest結合したreceipt | 欠落field、FP混入、identity不一致 |
| approval audit | framework intent resolverが確定したactive intent stateと固定audit rootから一意に読めるhuman gate event | caller指定manifest、receipt内の自己申告event、重複／欠落／内容不一致 |
| evidence output | 親directory inodeへ固定されたcommitter childが作るsame-filesystem hard-link | 上書き、親差替え、symlink destination、cross-device fallback |

## Source pathとTOCTOU制御

`SecureSourceReader` はrootからleafまで各componentを `lstat` してsymlinkを拒否し、leafを `O_RDONLY | O_NOFOLLOW` でopenする。open前後のdevice、inode、file type、sizeを照合し、descriptorからEOFまで一度読む。読取後 `fstat` のdevice、inode、size、mtimeが変われば `SOURCE_CHANGED_DURING_SCAN` とする。

snapshot後のast-grepとTypeScriptはdescriptor由来bytesだけを使う。走査後manifest検証も同じpath policyで新しいdescriptorを開き、初期digestと比較する。realpath確認だけで安全とみなさず、path検査後のsymlink差替えをdescriptor identityで遮断する。

## Tool supply chainとprocess起動

`ToolMaterializer` はpackage binaryを読み、mode `0700` の私有temp directoryへ `O_CREAT | O_EXCL` でcopyする。copy前後のfstatとSHA-256をtracked toolchain receiptへ照合し、合格したcopyのliteral absolute pathだけを `shell:false`、固定argv、固定environment allowlistで一度spawnする。

PATH、`node_modules/.bin`、shell、source文字列、marker理由をcommand構築へ使わない。stdoutはJSON Lines schemaへstrict parseし、unknown field、重複sentinel、非0 exit、version／capability不一致をfail-closedにする。diagnosticは正規化path、location、固定messageだけを含み、source全文、temp path、credential候補を出力しない。

## Ledgerと承認の権限制御

通常 `check` はsource、config、baseline、exemption、evidenceにwrite capabilityを持たない。GitReadPortはfull SHAと固定ledger pathだけを受け、shellを介さない最大2回の `git show` に限定する。baseline／exemptionのgrowth、replacement、stale entryはpolicy violationであり、通常commandに承認・更新機能を持たせない。

evidence workflowは次の一方向capabilityへ分離する。

1. `census-evidence` はbaseline write権限を持たず、未存在のraw evidence pathだけを生成する。
2. `approve-evidence` はraw evidenceを変更せず、全単射のhuman classificationとaudit eventを検証して未存在approved pathだけを生成する。
3. `baseline-candidate` はFP=0とshrink-onlyを検証し、未存在candidate／provenance pathだけを生成する。
4. canonical ledger昇格はrepository review外部の責務で、engine APIからは実行できない。

`ApprovalAuditAuthority` はCLI引数やreceiptからmanifest／record pathを受け取らない。framework共通のproject／space／intent resolverを呼び、canonical project root、`active-space`、`active-intent`、対応する `amadeus-state.md` 内のintent UUIDを相互照合して、固定 `<record>/audit/` rootを内部導出する。raw evidenceのintent UUID／stageはこのstateと一致必須で、cursor欠落、record外escape、state不一致は `RULE_INVALID` とする。

`ApprovalAuditVerifier` はauthorityが返したrootだけをsymlink-safeに列挙し、event IDが全audit shardを通じてちょうど1件存在すること、event typeが人間gate承認であること、対象intent／stage、reviewer、承認時刻がreceiptと一致することを検証する。検証済みactive state digest、audit root manifest digest、event canonical bytes digestをapproved evidenceへ結合し、callerがaudit manifestを差し替えるinterfaceを設けない。

## Atomic new-output-only write

`EvidencePathAuthority` はdestinationを正規化し、basenameが単一path componentであること、親がrepository内のnon-symlink regular directoryであることを確認して、親のdevice／inode receiptを作る。親directory path、expected device／inode、destination basename、temp basename、payloadをliteral argv／stdinで専用Bun committer childへ渡し、そのchildの `cwd` を親directoryに設定する。

`CommitterLauncher` はabsoluteかつregular non-symlinkである `process.execPath` をopen／fstatして親Bun executable identityへ照合し、そのliteral pathを使う。child codeは親module内の固定source constantを `--eval` へ渡し、そのSHA-256をrequest／resultへ結合する。relative module、package resolution、PATH、evidence directory内scriptは使わない。起動は `shell:false`、environment allowlist `{ LANG: "C", LC_ALL: "C", TZ: "UTC" }`、stdioはpayload stdin／result stdout／captured stderrだけとし、追加FD／IPC handleを継承しない。

committer childはwrite前に自身のcode digestと `lstat(".")` のexpected device／inodeを照合し、不一致なら停止する。childのcwdは起動後にdirectory inodeへ固定されるため、以後は `.` 直下の検証済みbasenameだけへ `O_CREAT | O_EXCL`、write、file fsync、close、regular-file lstat、`link(temp, destination)` を実行する。親pathがspawn前に差し替わってもinode不一致でwrite 0、spawn後にrenameされても固定cwd外へescapeしない。`EEXIST`、symlink、non-regular、cross-deviceはfallback renameをせず失敗する。

link前failureではdestinationは未作成、競合writerが先行した場合も既存destination bytesは不変である。link後directory fsync failureは作成有無を推測せず `INTERNAL_ERROR` と固定prefix `EVIDENCE_DURABILITY_UNKNOWN` で返し、temp aliasを保持したまま同じpathへの自動retryや上書きを行わない。

## Threat verification

- path component差替え、symlink、hard-link先の競合、open後書換えをfailure injectionし、解析bytesとverified inodeの結合を確認する。
- package binaryを検証前、copy中、copy後に差替え、実行bytesがreceipt一致の私有copyだけであることを確認する。
- argvにshell metacharacter、marker文、悪意あるpathを与え、literal argumentから逸脱しないことを確認する。
- tool receipt、approval receipt、candidate census、base SHA、ledger digestの各1 field改変を拒否する。
- audit eventの欠落、重複、別intent／stage、reviewer／timestamp不一致を拒否し、verified event bytes digestをapproved evidenceへ結合する。
- callerが偽audit manifest／record pathを渡せないこと、active cursor／state／intent UUID不一致を拒否することをinterface testで固定する。
- 親directoryをcommitter child起動前後にsymlink／別inodeへ差し替え、repository外writeが0件であることを確認する。
- evidence directoryへ偽 `bun`、package、moduleを置き、PATH／cwdから一切実行されず固定child code digestだけが観測されることを確認する。
- check前後のcanonical bytes一致、evidence競合時の既存bytes一致、partial canonical 0件を検証する。

本Unitは個人情報、network、cloud IAMを扱わないため、KMS、VPC、DAST、data-retention controlは非適用である。
