# Performance Design — static-gate-engine

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。15秒目標を完全走査の省略で達成せず、source read、child process、AST構築、集合演算の予算を実装境界へ割り当てる。

## 実行パイプラインと予算

| 区間 | 設計 | 合否証跡 |
| --- | --- | --- |
| contract／Git ledger | schema parseを一度行い、base baselineとexemptionを最大2 Git childで各1回取得 | child種別・回数、入力digest |
| source snapshot | repository-relative path順にdescriptor readを各file1回行い、bytes、digest、stat receiptを同時生成 | expectedCount、totalBytes、file別readCount=1 |
| mirror／tool準備 | snapshot bytesを私有mirrorへ一方向に書き、ast-grep binaryを私有tempへ一度copy・SHA-256検証 | mirrorDigest、toolReceipt、copyCount=1 |
| structural scan | candidate rulesとcoverage sentinelを単一bundleにし、検証済みbinaryを1回spawn | astGrepSpawnCount=1、receiptCount |
| semantic scan | snapshot overlayからTypeScript Program／TypeCheckerを各1個構築し、全nodeの軽量universe walk後、candidateだけpath評価 | programCount=1、nodeCount、candidateCount |
| source再検証 | 初期manifestと同じpathをdescriptor境界で各file1回再読・再hash | file別verificationReadCount=1、afterManifestDigest |
| policy／render | identity keyのMap／Setと一度のsortでratchetを評価し、完成ResultをJSONへ1回serialize | sortCount、stdoutDigest、renderCount=1 |

各区間は単調な同期pipelineで、前段failure時は後段を起動しない。timeoutしても未走査file、未分類candidate、未照合ledgerを成功集合へ補完しない。

## Snapshotとメモリ所有

`SourceSnapshotStore` がsource bytesの唯一のin-memory ownerである。TypeScript hostは同じimmutable byte viewから `SourceFile` を作り、元filesystemを読まない。ast-grep用mirrorはdisk上の派生物であり、別の全source byte配列をprocess内に保持しない。manifest、candidate、findingはfull sourceを複製せず、path、digest、span、identityだけを保持する。

sourceは初期snapshotで1回、走査後検証で1回だけ実体を読む。後者は解析入力ではなく途中変更検出専用である。binary copy、mirror write、evidence writeはsource read countへ含めず、それぞれ明示counterで別計測する。

## Algorithmic boundary

- filesystem列挙、snapshot、semantic universe walk、sentinel照合は `O(n)` とする。
- candidate／finding／ledgerはcanonical identityをkeyとする `Map`／`Set` で差分を取り、最終順序だけ `O(n log n)` でsortする。
- candidateごとのProgram再構築、finding同士の総当たり、sourceごとのspawn／Git呼出を禁止する。
- control-flow評価はsemantic universe全体ではなくcatalogへincludedとなるcandidateに限定する。ただし全nodeの母集合列挙とstructural candidate全単射は省略しない。
- concurrency、worker、cacheを初期実装の成立条件にしない。性能超過時も同じsnapshot authorityとcomplete receiptを保つ。

## Capacityと計測

`tests/tools/rss-tree-sampler.ts` がroot Bun PIDと全descendantの `VmRSS` を10ms間隔で同時合計し、最大値を記録する。L0は261 files／3,920,036 bytesで15秒・2 GiB、L2は522 files／7,840,072 bytesで30秒・2 GiB、L4は1,044 files／15,680,144 bytesで60秒・3 GiBを上限とする。

cold／warmは独立fresh workspace 5件ずつ測り、平均でなく各群最大値を使う。各runはrevision、Bun／TypeScript／ast-grep version、manifest／config／tool receipt digest、expected／scanned、AST node、candidate、finding、child回数、source read回数、sample数、観測PID数、stdout digestを一つのmeasurement recordへ結合する。

## Performance failure方針

timeout、resource exhaustion、child増加、read増加、RSS超過は完全性を弱める契機ではなくtyped Errorまたはbenchmark failureである。scan対象削減、partial receipt容認、semantic path省略、前回cacheによるPassは設けない。15秒超過時は区間timingとcounterから原因を特定し、snapshot共有または集合演算を改善する。

## 検証項目

- L0 cold／warm各5回で最大15秒、ast-grep 1回、Git最大2回、source read各2回を検証する。
- L2／L4で時間、process-tree RSS、expected／scanned全単射、stdout決定性を同時に検証する。
- ast-grep ruleを1件欠落させても短時間Passにならず `RULE_INVALID` になることを確認する。
- filesystem列挙順、temp path、PIDを変えてもstdout bytesとfinding identity順が一致することをgolden testで固定する。

## Iteration 1 Resolution

- ast-grep stdout schema driftを上流どおり `RULE_INVALID/AST_GREP_RULE_INVALID` へ統一した。
- evidence outputは検証済み親directoryを `cwd` とする専用Bun childへcommitを委譲し、child自身のdevice／inode照合後はbasenameだけを使う。通常 `check` のchild上限には影響せず、evidence commandごとにcommitter child最大1回を別計測する。
- CLI entrypoint、command application service、check／evidence pipeline、presenterのcompositionを分離し、approval audit verifierを明示componentとして追加した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T08:26:11Z
- **Iteration:** 1
- **Scope decision:** none

上流との障害分類矛盾に加え、承認証跡と原子的書込みの信頼境界、コンポーネント依存契約が未確定であり、実装者判断なしには安全に構築できない。

### Findings

- Major — reliability-design.md:34 は ast-grep stdout schema drift を INTERNAL_ERROR/AST_GREP_SCHEMA へ写像するが、reliability-requirements.md:24 は stdout schema不正を RULE_INVALID と定めており、同一障害の公開codeが上流契約と直接矛盾する。
- Major — security-design.md:16,35-40 は human gate audit event ID の検証を必須とする一方、logical-components.md には監査台帳の信頼できる読取component／port、event IDの存在・内容・digest結合を検証するinterfaceがなく、自己申告receiptによる承認偽装を防ぐ実装契約がない。
- Major — EvidenceNoReplaceWriter は destination文字列だけを受け、security-design.md:42-46 と logical-components.md:45-46 に親directoryをdescriptorへ固定する境界がないため、検査後に親componentをsymlinkへ差し替えるTOCTOUでrepository外へ新規fileを作成できる。directory FD＋openat/linkat相当、または同等の原子的path authorityが必要である。
- Major — reliability-design.md:54 は link後directory fsync failure時に自動unlinkを禁止するが、logical-components.md:88 はtemp evidence名をfinallyでcleanupすると定めており、durability-unknown時の回復状態と所有権が矛盾する。どの名前を保持・削除するかを単一状態機械で確定する必要がある。
- Major — logical-components.md:57-66 は GateCommandOrchestrator から GateResultPresenter への依存を置くが、LC-SG-01とinterface契約はorchestratorがconsole／process.exitを所有せず完成Resultを返すと定める。またEvidenceWorkflowのcensus処理に必要なsnapshot、ast-grep、semantic、approval-audit依存も示されず、entrypoint・orchestrator・evidence workflow間のcommand別composition boundaryが実装不能なままである。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T08:33:09Z
- **Iteration:** 2
- **Scope decision:** none

前回5件中4件は解消したが、承認監査の信頼元が呼出側入力のままで承認偽装を防げず、修正で追加されたcommitter childにも安全な起動契約が欠ける。

### Findings

- Critical — 前回の承認検証findingは部分解消に留まる。security-design.md:43 と logical-components.md:51-52 は呼出元が渡す auditManifest を検証開始点としているが、そのmanifestをcanonical active intent、固定audit root、trusted runtime stateへ結合するauthorityがない。攻撃者がreceiptと整合する偽manifest／偽eventを同時に指定しても一意性・field一致・event digest検査を通過できるため、human approval偽装を防げない。
- Major — evidence parent差替え対策自体は解消したが、新設committer childの起動境界が未定義である。security-design.md:47-49 は攻撃者が書込み可能なevidence directoryをcwdにしてBun childを起動する一方、literal Bun executable／absolute tracked module、shell:false、固定environment、child code digest、継承FDの契約を定めていない。PATHまたは相対module解決を実装者が選ぶと、検証対象directoryから任意codeを起動できる。
- Resolved — stdout schema driftは reliability-design.md:34 で上流どおり RULE_INVALID/AST_GREP_RULE_INVALID に統一された。
- Resolved — durability-unknown時のtemp alias所有権は reliability-design.md:53-55 と logical-components.md:103-109 で保持・cleanup条件が一致した。
- Resolved — entrypoint、application service、check／evidence pipeline、presenterの依存方向は logical-components.md:68-89 で分離され、前回のcomposition矛盾は解消した。

## Iteration 2 Resolution

- approval audit sourceはcaller入力から削除し、frameworkのintent resolverが確定したactive intent stateと固定 `<record>/audit/` rootから内部導出する。
- committer childは検証済み絶対 `process.execPath`、親moduleに埋め込んだ固定 `--eval` source、`shell:false`、固定environment、閉じたstdioだけで起動し、evidence directoryからcode／moduleを解決しない。
