# Architecture Decisions — ハーネス横断 live E2E

入力参照: `requirements`、`architecture`、`component-inventory`、`team-practices`。`stories`は未生成。各ADRはFR/NFRとApplication Design Q1へtraceする。

## ADR-001: tests/harness内のdeep moduleとして共通seamを置く

Status: Proposed（Application Design gateで確定）  
Trace: FR-3〜FR-6、FR-10、NFR-4/5

### Context

live E2Eは製品runtimeではなくrepository内test infrastructureであり、Bun testから外部CLI/SDKを短命起動する。core frameworkやdistへ共通runnerを投影すると、利用者へ不要なAPIを出荷し、7 harness生成面を増やす。

### Decision

共通contract/policy/adapter/lifecycle/registry/ledger/projectorを`tests/harness/live-e2e/`のdeep moduleへ置く。既存driverは縦スライス単位でadapter portへ接続する。

### Consequences

- Positive: fake integrationが容易、出荷runtimeへ影響しない、段階移行できる。
- Negative: tests/harness内に新しい内部API境界が増える。
- Reversibility: 高い。出荷契約ではないため後からmodule統合可能。

### Alternatives Rejected

- framework coreへ配置: live test専用責務を配布物へ混入する。
- `codex-exec-live.ts`を汎用化: transport条件分岐が集中し巨大helperになる。
- 各driver維持: GHA deny、secret、result taxonomyの非対称を閉じない。

## ADR-002: 共通policyとtransport adapterを分離する

Status: Proposed  
Trace: FR-1〜FR-6、NFR-1/4/6

### Context

CLI、Agent SDK、tmux、ACP、CDPは起動・停止・認証・観測方式が異なる。一方、GHA deny、opt-in、result code、cleanup後漏洩禁止は全transport共通である。

### Decision

Policy/Lifecycleは安全不変量と状態遷移を所有し、adapterはbinary/version/auth/config/command/output normalizationを所有する。adapterからpolicyへの依存を禁止する。

### Consequences

- Positive: 共通contractを弱めず、能力差を正直に表現できる。
- Negative: adapter宣言と共通型の整合testが必要。
- Reversibility: 中。port shape変更は全adapterへ波及するためPhase 1で固定する。

### Alternatives Rejected

- 全transport統一: SDK/TUI/ACP/CDPの異質な終了モデルを隠す。
- common spawn wrapper: SDKやGUIに適用できず浅い抽象になる。

## ADR-003: 型付きregistry + JSONL ledger + Markdown projection

Status: Accepted by Human Decision `2026-08-03T11:19:54Z`  
Trace: FR-11、NFR-2/4/5、Application Design Q1=A

### Context

静的capabilityと時系列run factは更新頻度・競合形状が異なる。保守者はMarkdownを読みたいが、Markdownを正本にするとparserと手編集driftが安全契約へ入る。

### Decision

- TypeScript registry: static capabilityの型付き正本。
- Append-only JSONL: 1行1run receiptの履歴正本。
- Markdown: 両正本から決定的に導出するview。

### Consequences

- Positive: compile-time型検査、append-only diff、機械drift check、人間可読性を両立。
- Negative: projector/checkを保守する必要がある。
- Reversibility: 中。schema versionで移行可能。

### Alternatives Rejected

- 単一JSON: run追加ごとに大きいdocument rewriteとmerge conflictを生む。
- Markdownのみ: parse曖昧性と正本/表示責務の混同。
- adapter別receipt: repository内file増加とindex再構築が必要。
- Intent auditのみ: harness横断の最新状態を直接照会できない。

## ADR-004: adapter別opt-inとGHA hard deny precedenceを固定する

Status: Accepted by Requirements decision  
Trace: FR-1/2、NFR-1/3

### Context

課金substrateを誤起動しないため、runner flagの暗黙許可や全adapter一括許可を避ける必要がある。

### Decision

adapter別専用envの厳密値`"1"`だけを許可し、`GITHUB_ACTIONS=true`を常に最優先denyとする。Claude TUI runnerの自動`AMADEUS_TUI_LIVE=1`設定を廃止する。

### Consequences

- Positive: 課金意図がadapter単位で明示される。
- Negative: full debug runでも利用者がenvを明示する必要がある。
- Reversibility: 低。安全な利用者契約として維持する。

### Alternatives Rejected

- runner flagをopt-in扱い: token消費意図が間接化する。
- 共通global env: 複数adapterを意図せず起動しうる。

## ADR-005: cleanupはworkspace保持とcredential破棄を分離する

Status: Proposed  
Trace: FR-4/5、NFR-1/2

### Context

debug用workspace保持は必要だが、credential materialやsource pointerを残すことは許容できない。

### Decision

debug keepはsanitized workspace/logだけに適用する。credential copy/symlink/token/cache/source pointerはsuccess/failure/debugに関係なく削除・漏洩検査する。scratch確保後はprepare途中、execute/assertのthrow、timeout、abortでも`finally`相当の境界でadapter cleanupと共通leak checkを独立に必ず試行する。cleanup/leak failureは通常の`LiveOutcome`へ変換せず、C8を呼ばないprimary `LiveRunError.cleanup-barrier-failed`とする。元のsuccess/timeout/assertionはsanitizedなsecondary診断としてのみ保持し、ADR-009の`closure-committed`までPASS、supported更新、materialization、projectionを解放しない。

### Consequences

- Positive: 診断可能性と秘密保護を両立。
- Negative: adapterごとにcredential receiptとcleanup責務を宣言する必要がある。
- Reversibility: 低。security boundaryである。

### Alternatives Rejected

- debug時temp全保持: credential残留リスク。
- 常時全削除: failure診断が困難。

## ADR-006: 構造化result taxonomyを単一正本にする

Status: Proposed  
Trace: FR-2/6、NFR-2

### Context

現状はrc、throw、timedOut、test skip文字列が分裂し、未実行と実失敗を横断集計できない。

### Decision

`AMADEUS_LIVE_E2E:<STATUS>:<REASON>`のclosed unionをC1で定義し、adapterはraw transportを共通実行結果へ正規化する。assertion原文はsanitized diagnosticとして保持する。

### Consequences

- Positive: runner、ledger、matrix、testsが同じ語彙を使う。
- Negative: 既存test名のfree-text skipから段階移行が必要。
- Reversibility: 中。code追加はversioned contract changeとして扱う。

### Alternatives Rejected

- adapter自由文字列: taxonomy分裂を固定する。
- exit codeだけ: timeout/auth/assertionを区別できない。

## ADR-007: capability不足はstubで隠さず二択で閉じる

Status: Proposed  
Trace: FR-7〜FR-9、FR-11、NFR-6

### Context

Cursor/OpenCodeや一部Kiro transportは非対話実行・設定隔離・認証・終了条件が未実証である。

### Decision

実測でcapability成立ならadapter+fake integration+minimal liveを同じsliceで追加する。成立しない場合は実測結果、阻害要因、推奨seam、受け入れ条件を持つ後続Issueへ接続する。dormant adapterや`TBD` matrixだけでは完了しない。

### Consequences

- Positive: 対応状態を偽らず、次の実装条件が明確になる。
- Negative: 外部CLIの現行能力によりIntent内実装量が変動する。
- Reversibility: 高。capability成立後に後続Issueでadapterを追加できる。

### Alternatives Rejected

- 先にstub追加: unsupportedをsupportedに見せる。
- 共通contract弱体化: 全adapterの安全保証を損なう。

## ADR-008: run ledger追記をatomicかつreceipt ID冪等にする

Status: Proposed  
Trace: FR-6/11、NFR-1/2/5

### Context

外部journeyがgreenでもreceiptの永続化が失敗すれば、capability matrixを裏付ける監査可能な証跡がない。通常のJSONL末尾writeはprocess crash時に部分行を残し得る。またatomic rename成功後に応答だけ失われた場合、素朴なretryは同じrunを重複記録する。

### Decision

各receiptへrun identity由来の決定的`receiptId`を持たせる。追記時は既存`.codex/tools/amadeus-lib.ts`で実証済みのowner-stamped mkdir lock algorithmをledger専用identityで再利用する。owner tokenはPIDとprocess start epochの組とする。既存ledgerを全検証し、既存byte列を一切再整形せず新規1行を加えたsibling tempをmode `0600`でwrite/fsyncしてatomic renameする。final ledgerを再検証してから、owner一致を条件に`finally`または`process.exit` safety netでlockを解放する。

同一ID・同一内容は冪等な`already-present`、同一ID・異内容はconflictとする。append失敗は`Result.err({ kind: "ledger-write-failed", receipt, cause })`としてrunnerをhard failureにし、greenを返さない。回復はerror内のsanitized receiptを同じIDで明示再記録する。orphan tempはfinal ledger検証後に安全に識別できる場合だけ削除し、自動採用しない。

SIGKILL等の残存lockは、dead PIDまたは5秒grace超過のunstamped directoryだけを回収候補にする。複数reaperをsibling reap mutexで直列化し、private pathへのCAS rename後にowner token/mtimeを再検証して一致時だけ削除する。PID alive/unknown、token不一致、fresh unstampedは自動解除しない。bounded取得timeout時はsanitized owner tokenを表示し、owner停止確認後に同tokenを要求する手動回復を提供する。force deleteは提供しない。

parent directory fsync対応は事前probeし、receiptへ`file-and-directory`または`file-only`のdurabilityを記録する。不明または宣言不一致は成功扱いにしない。

### Consequences

- Positive: final pathに部分JSONL行を公開せず、応答喪失とwriter kill後も重複・他owner誤解除なしで回復できる。
- Negative: 小さいledgerでも追記ごとにbyte-preservingな全量temp write、owner stamp、reap mutex、lock/fsync capability testが必要。
- Reversibility: 中。ledger backendを変えてもreceipt IDとtyped error contractは維持する。

### Alternatives Rejected

- `O_APPEND`で直接1行write: crash時の部分行とdurability境界を閉じられない。
- append失敗をwarning化: 証跡のないgreenを許す。
- retryごとに新ID: rename成功・応答喪失時の重複を判別できない。
- orphan tempを自動採用: final ledgerとの競合時に未検証runを正本化し得る。
- stale lockを時刻だけで強制削除: live ownerやPID再利用時にmutual exclusionを破る。
- lock directoryを手動`rm -rf`: owner token不一致を検出できず、別writerのcritical sectionを壊し得る。

## ADR-009: cleanup barrierとledger commitを別の終端状態にする

Status: Accepted by Human Decision `2026-08-03T23:41:29Z`  
Trace: FR-5/11、NFR-1/3/5

### Context

cleanup/leak failureを通常のfailure receiptへ変換してC8へ追記すると、credential-bearing descendantや未削除scratchが残る状態を正規run factとして確定できる。一方、cleanup完了だけでPASSやadapter materializationを解放すると、C8 append失敗後に証跡のないgreenが残る。

### Decision

状態遷移を`executed → cleanup-barrier-closed → ledger-appended|already-present → closure-committed`に固定する。cleanup barrierは`descendants-zero/reap → scan-before-delete → scratch delete → post-delete absence → credential destroy → matcher zeroize`を順に確認する。途中失敗はC8を呼ばない`LiveRunError.cleanup-barrier-failed`とする。`closure-committed`だけがPASS返却、C7 supported更新、C5/C6 materialization、C9投影を許可する。

### Consequences

- Positive: cleanup不全をrun factへ昇格せず、証跡のないgreenも禁止できる。
- Negative: cleanup failureはC8履歴に残らず、test runnerのhard errorとsanitized diagnosticで追跡する。
- Reversibility: 中。cleanup failure専用の安全な別ledgerを将来設ける場合も、C8 run ledgerとは分離する。

### Alternatives Rejected

- cleanup failureを`FAIL:EXECUTION_FAILED`としてC8へ追記: barrier未完了状態でreceipt生成を許す。
- barrier closeだけでmaterialization: ledger append失敗後の証跡なしgreenを許す。
