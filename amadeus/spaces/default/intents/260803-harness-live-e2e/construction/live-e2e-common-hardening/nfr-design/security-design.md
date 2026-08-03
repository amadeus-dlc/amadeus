# Security Design — live-e2e-common-hardening

## 上流入力と目的

本設計は`business-logic-model.md:3-11`を入力とし、U01 production contractを変更せず、同成果物が指定するproduction C2/C4/C8/C9 entry point（`business-logic-model.md:13-25`）へadversarial fixtureを接続する。

## Fixture Trust Boundary

- 実credential、実CLI、実model、networkを使用せず、固定canary、fake clock/PID/start identity、fake adapterだけを使う（`business-logic-model.md:25`）。
- test側`ScopedIoSubstitution`はchild worker内に閉じ、必ず`finally`でrestoreする。production test flag/branchを追加しない。
- observationはkey名、boolean、count、digest、closed codeだけを持ち、raw env/value/path/outputをsnapshotしない。
- 各caseはfresh root、run nonce、seedを持ち、serial実行後にresource/process/module substitution残存0を検査する。

## Required Adversarial Controls

| Boundary | Baseline | Mutant/Fault must detect |
|---|---|---|
| Gate | GHA precedence、strict `"1"`（`business-logic-model.md:27-39`） | probe/spawnが1回でも発生 |
| Credential/env | declared lease、exact allow-list | ambient/source pointer/canary leak |
| Scratch | owner-contained planned/created/cleaned | symlink escape、partial allocation |
| Supervisor | PGID lease、group ESRCH、descendant 0 | supervisor/leader先行終了、PID reuse |
| Output | stdout 1,048,576、stderr 262,144、total 1,310,720 | 1-byte超過、undrained flood、raw保持 |
| Result | closed taxonomy/precedence | unknown code、skip→success、cleanup masking |
| Ledger | atomic/idempotent append（`business-logic-model.md:66-83`） | crash、duplicate、stale lock、partial line |
| Projection | registry+ledger deterministic render（`business-logic-model.md:85-89`） | manual drift、unknown adapter、pending evidence |

## Crash and Secret Safety

fsync/rename位置はIPC barrier acknowledgementで固定し、sleep推測を禁止する（`business-logic-model.md:68-73`）。supervisor abnormal exitではfake runnerが未reap PID/PGID leaseを保持し、group ESRCH後だけreapする。

Bounded output oracleはraw byte単位でstdout/stderr/combinedをcountし、SHA-256をincremental更新する。stdoutは1,048,576 bytes、stderrは262,144 bytes、combinedは1,310,720 bytesまでの固定容量bufferだけを許可する。最初の1-byte超過でbufferへの追加を停止し、`truncated=true`、該当stream、raw byte counts、digestを固定してabort/group terminationを要求する。その後もreapまではchunkをdigest更新後に即破棄してpipeをdrainし、terminal expectationを`FAIL:EXECUTION_FAILED/output-limit-exceeded`とする。stable assertion IDは`OUTPUT_BOUNDED_DRAIN`で、collector保持量が1,310,720 bytesを超えないことを検査する。

`file-and-directory`と`file-only`を別caseにし、後者はdirectory durabilityを主張せずreceipt表示を要求する。failure diagnostic、ledger、matrix、debug-retained treeをcanary digestでscanする。

## Authorization and Non-applicable Controls

U02はtest capabilityだけを所有し、production credential/spawn/ledger writer capabilityを持たない。HTTP、database、AWS/IAM、persistent serviceは追加しないためcloud/network controlsは非適用である。

## Verification

baseline greenと各単一faultの指定assertion redを対で記録する。複合faultはcleanup+leak aggregationだけ許可し、case ID、seed、contract、failed assertion名以外をevidenceへ残さない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:51:41Z
- **Iteration:** 1
- **Scope decision:** none

安全境界とtest-only依存方向は概ね妥当だが、未定義のU01論理コンポーネント契約、必須のfile:lineトレーサビリティ欠落、bounded outputの終端・メモリ制御未定義により実装開始できない。

### Findings

- BLOCKER | U01論理コンポーネント参照が解決不能 | logical-components.mdはU01のLC-LIVE-01〜14をimportし、security-design.mdはPGID lease、output cap、durability contractをそのbaselineとして扱うが、許可された上流business-logic-model.mdにはLC-LIVE ID、対応interface、各controlとのmappingが存在しない。U02はU01 production APIを変更しない契約なので、実装者は存在不明のseamを捏造するかproduction変更を行う必要がある | LC-LIVE-01〜14を現在のU01 public C2/C4/C8/C9 function/typeへ逐語的にmappingし、各LC-TEST componentが呼ぶ既存interfaceを定義する。定義元が別artifactなら正式なconsumeとしてauthoritative scopeへ含める
- BLOCKER | NFR設計の必須file:line traceが欠落 | nfr-design stageは既存決定を再分類・複写せず、適用artifactでは確立済み決定をfile:lineで参照するよう明示する。しかしsecurity-design.mdとlogical-components.mdはbusiness-logic-modelを名前だけで参照し、gate、credential、crash、ledger、projection等の決定を行参照なしで再記述している | 各import済み決定へbusiness-logic-model.md:lineの根拠を付け、新規NFR決定と既存Functional Design契約を区別する
- BLOCKER | Bounded output制御の安全な終端契約が未定義 | security-design.mdはstdout、stderr、totalの上限とcontinued drainを要求するが、byte counting単位、上限到達後の保存・discard方式、process停止条件、terminal result、digest/truncation metadata、collectorメモリ上限が定義されていない。undrained flood caseでは実装次第でメモリ増大またはpipe deadlockが再現する | raw byte単位のcount、固定容量bufferまたはdigest-only drain、最初の超過時のsignal/classification、reapまでのdiscard-drain、receiptへ残すcount/truncated/digest、stable assertion IDをclosed algorithmとして定義する

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:53:34Z
- **Iteration:** 2
- **Scope decision:** none

前回の3 BLOCKERは解消された。未定義LC-LIVE参照は既存C2/C4/C8/C9 seamへ置換され、上流決定にはfile:line根拠が付与された。bounded outputもraw-byte計数、固定容量、超過時abort、継続drain、terminal expectation、stable assertionまで閉じており、追加BLOCKERはない。

### Findings

- None
