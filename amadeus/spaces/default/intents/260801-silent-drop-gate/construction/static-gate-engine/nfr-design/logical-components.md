# Logical Components — static-gate-engine

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、NFRを深い同期componentへ割り当てる。通常 `check` は単一Bun processで動く。evidence commandだけは親directory inodeを固定する短命committer childを最大1回使う。network、database、daemonは所有しない。

## コンポーネント一覧

| ID | コンポーネント | 責務 | 所有しないもの |
| --- | --- | --- | --- |
| LC-SG-00 | `GateCliEntrypoint` | commandをapplication serviceへ渡し、完成Resultをpresenterへ一度だけ投影 | scan／policy実装 |
| LC-SG-01 | `GateApplicationService` | commandをcheck／evidence pipelineへ振り分け、完成Resultを返す | console、process.exit、policy実装 |
| LC-SG-02 | `GateContractLoader` | config、catalog、rule、tool receipt、ledger schemaのstrict parse | source走査、fallback判断 |
| LC-SG-03 | `TrustedLedgerLoader` | Git previous setまたは初回provenanceを排他的に解決 | current ledger更新、shell |
| LC-SG-04 | `SecureSnapshotStore` | symlink-safe列挙、descriptor read、immutable snapshot、前後manifest | semantic分類、tool起動 |
| LC-SG-05 | `ReadOnlyMirrorBuilder` | snapshotから私有mirrorを一方向生成しdigest照合 | 元source再読 |
| LC-SG-06 | `VerifiedAstGrepRunner` | binary私有copy検証、単一spawn、candidate／sentinel strict decode | semantic truth、retry |
| LC-SG-07 | `SemanticCensusEngine` | 単一Program、独立universe、structural全単射、全path判定、identity codec v1 | filesystem I/O、ledger policy |
| LC-SG-08 | `FindingPolicyEngine` | exemption、baseline、ratchet、bootstrap条件をpure集合演算で評価 | Git／file write、identity再生成 |
| LC-SG-09 | `EvidencePipeline` | scan componentを再利用するcensus、audit検証付きapprove、candidate生成をcommand別にcomposition | canonical ledger昇格 |
| LC-SG-10 | `EvidencePathAuthority` | 親directoryをdevice／inode receiptとcommitter child cwdへ固定 | policy、payload生成 |
| LC-SG-11 | `EvidenceNoReplaceCommitter` | 固定cwd内basenameだけでhard-link new-output-only commitとphase別cleanup | overwrite／rename fallback |
| LC-SG-12 | `CommitterLauncher` | absolute Bun＋固定eval source＋固定environment／stdioでcommitterを最大1回起動 | PATH／cwd module解決、追加FD継承 |
| LC-SG-13 | `ApprovalAuditAuthority` | framework resolverからactive intent stateと固定audit rootを内部導出 | caller指定manifest／record path |
| LC-SG-14 | `ApprovalAuditVerifier` | authority内全shardからhuman gate eventを一意に読取り、intent／stage／reviewer／時刻／digestを検証 | receipt自己申告の信頼、audit write |
| LC-SG-15 | `GateResultPresenter` | Resultをstdout、stderr、exitへ各1回投影 | Result再分類、stderr parsing |
| LC-SG-16 | `ProcessTreeSampler` | Bunと全descendantの10ms RSS計測 | production verdict変更 |

## Interface契約

```text
GateCliEntrypoint.run(argv):
  GateApplicationService.execute(command) -> GateResultPresenter.present(result)

GateApplicationService.execute(command, immutablePorts):
  Result<GateResult, never>

SecureSnapshotStore.capture(authoredRoots):
  Result<SnapshotAuthority, InfraFailure>

SnapshotAuthority:
  snapshots + beforeManifest + verifyAfterScan() -> Result<ScanSummary, InfraFailure>

VerifiedAstGrepRunner.scan(snapshotMirror, verifiedToolReceipt, ruleBundle):
  Result<StructuralReceipt, ChildFailure>

SemanticCensusEngine.classify(snapshotAuthority, structuralReceipt, semanticCatalog):
  Result<{ apiCandidateCensus; rawFindings; identityReceipt }, RuleFailure>

FindingPolicyEngine.evaluate(census, currentLedgers, trustedPrevious):
  Pass | NonEmptyViolations | InfraFailure

ApprovalAuditAuthority.resolve():
  authorized(activeStateDigest, fixedAuditRoot, auditManifestDigest)
  | invalid(RULE_INVALID, reason)

ApprovalAuditVerifier.verify(auditAuthority, approvalReceipt):
  verified(activeStateDigest, auditManifestDigest, eventDigest)
  | invalid(RULE_INVALID, reason)

EvidencePathAuthority.authorize(destination):
  authorized(parentPath, parentDevice, parentInode, destinationBasename, tempBasename)

CommitterLauncher.commitNew(pathAuthority, immutablePayload, fixedChildSource):
  committed(digest) | not-committed(failure) | durability-unknown(digest)

GateResultPresenter.present(gateResult):
  stdout object x1 + stderr summary x1 + exitCode(0 | 1 | 2)
```

`SnapshotAuthority` だけがsource bytesを所有し、mirrorとTypeScript hostへread-only viewを供給する。`SemanticCensusEngine` がsource、candidate、policy identity codec v1の唯一ownerであり、`FindingPolicyEngine` は受領identityを変更しない。adapter failureはentrypoint手前のexhaustive mapperで閉じたInfraCodeへ変換する。

`fixedChildSource` は親moduleに埋め込んだconstantで、SHA-256をrequest／resultへ結合する。`CommitterLauncher` はabsolute `process.execPath` と `--eval <fixedChildSource>` をliteral argvで使い、cwdからmoduleを解決しない。committer childのmachine resultは親だけが読む専用pipeへ1 objectを返し、user-facing stdoutへ転送しない。`GateResultPresenter` だけが最終stdoutを所有する。

## 依存方向

```text
GateCliEntrypoint
  -> GateApplicationService
       -> CheckPipeline
            -> GateContractLoader
            -> TrustedLedgerLoader -> GitReadPort
            -> SecureSnapshotStore -> SourceReadPort
            -> ReadOnlyMirrorBuilder
            -> VerifiedAstGrepRunner -> ToolMaterializer -> ChildProcessPort
            -> SemanticCensusEngine -> TypeScriptProgramPort
            -> FindingPolicyEngine
       -> EvidencePipeline
            -> Census: CheckPipelineのsnapshot／mirror／tool／semantic部分
            -> Approve: ApprovalAuditAuthority -> ApprovalAuditVerifier -> AuditReadPort
            -> Candidate: FindingPolicyEngine
            -> EvidencePathAuthority -> CommitterLauncher -> EvidenceNoReplaceCommitter child
  -> GateResultPresenter

ProcessTreeSampler -> observed process tree（benchmark/test only）
```

domain componentはfilesystem、Git、child process、consoleをimportしない。adapterはcatalog、exemption、ratchet、success判定を再実装しない。`GateResultPresenter` は完成済みResultだけを受け、stderrやexception messageからstatusを逆算しない。

## Failure domainとblast radius

| failure domain | 影響範囲 | 封じ込め |
| --- | --- | --- |
| contract／ledger | invocation全体、scan前 | typed Error、source／evidence write 0 |
| source snapshot | 当該invocation | partial snapshotを破棄、child spawn 0 |
| ast-grep | 当該invocation | single childをreapし、candidate 0 Passを禁止 |
| semantic universe | 当該invocation | unresolvedを `RULE_INVALID`、policy未実行 |
| policy ledger | 当該revision | finding付きViolationsまたはtyped Error、ledger不変 |
| evidence parent差替え | 当該output | committer childのcwd inode不一致でwrite前停止 |
| evidence link前 | 当該output | canonical未作成、committer childがtempをcleanup |
| evidence link後fsync | 当該output | durability unknown、destination／tempを保持し上書き／自動retry禁止 |
| presenter | 当該CLI boundary | exhaustive variant、複数stdout write禁止 |

## Resource ownership

temporary mirrorとverified binary copyはinvocation-scoped ownerが `finally` でcleanupする。temp evidence名はcommitter childの状態機械が所有し、link前failureではcleanup、commit成功ではdirectory fsync後にunlink、link後directory fsync failureではdestinationとともに保持する。外側のgeneric `finally` はtemp evidenceへ触れない。source snapshot、TypeScript Program、candidate mapはpipeline完了後にまとめて解放し、global cacheへ保持しない。

共有resourceはrepository source、config、Git objects、canonical ledgers、evidence directoryだけである。lock、queue、cloud resource、Herdr／tmux等のterminal multiplexerはruntime dependencyにしない。

## 後続への引渡し

Code GenerationはLC-SG-00〜15をproduction境界、LC-SG-16をbenchmark/test境界として実装し、child count、read count、Program count、active intent authority、audit verification、committer launch、parent差替え、new-output-only failure injectionをtest seamとして公開する。Infrastructure Design対象のcloud resourceはない。CI wiring、canonical corpus値、package／promotion drift guardへの接続は `repository-adoption` Unitが所有する。
