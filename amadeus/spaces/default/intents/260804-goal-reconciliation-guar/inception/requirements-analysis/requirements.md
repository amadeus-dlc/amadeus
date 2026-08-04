# Goal Reconciliation Guard 要求仕様

## Intent分析

[Issue #2163](https://github.com/amadeus-dlc/amadeus/issues/2163) は、stage成果物、phase-checkの存在、gate承認、条件付きmirror settlementが成立しても、最新の承認済みゴールとaggregate outputを照合しなければIntentを完了できない契約を復元する`self-fix`である。

ゴールは人間が所有する。オーケストレーターが所有するのは、current approved goalを変更する権限ではなく、workflowのaggregate outputがそれを達成したかを照合し、未達・逸脱・未検証を完了として通さない責任である。

### 成功条件

1. あらゆるworkflow終端経路は、current approved goalに対する有効な`ACHIEVED` receiptを持たなければ`Completed`を書けない。
2. AIはゴールを書き換えられず、通常のstage承認、一括委任、standing delegationもgoal revisionの承認にならない。
3. 後から「何を達成したものとして完了したか」を、goal revision、verdict、evidence、人間裁定まで追跡できる。

## 原則と用語

| 用語 | 要求上の意味 |
|---|---|
| Goal | 人間が所有するIntentの目的、scope、success metrics。承認済みrequirementsはGoalから派生する検証基準であり、Goalそのものを黙示に変更しない |
| Current approved goal | 完了判定に使える唯一の承認済みrevision |
| Change proposal | AIまたは人間が作れるゴール変更案。承認まではゴールではない |
| Goal revision | 人間専用ゲートで明示承認されたゴールの新revision |
| Reconciliation | current approved goalとaggregate output / evidenceのworkflow-level照合 |
| Receipt | 照合対象、verdict、evidence、裁定を拘束するdurable completion evidence |
| `ACHIEVED` | current approved goalの全必須条件が検証済み |
| `DEVIATED` | aggregate outputがcurrent approved goalと異なる |
| `UNVERIFIED` | 必要な証拠、人間裁定、または互換receiptがない |

`Revision Count`はstageの修正回数であり、Goal revisionとして使用しない。mirror settlementはGitHub mirrorの配送境界であり、Goal reconciliationとは別の契約である。

## 機能要求

### FR-1 Goal identityと不変なlineage

- Intent生成時に、scopeが`intent-capture`をSKIPする場合を含め、人間が開始した原入力（Issue、明示した依頼文、またはintent statement）からinitial goalを一意なGoal IDとrevision 0に結び付ける。
- revision 0はIntent生成後に不変とし、後続のRequirements AnalysisはGoalを置換せず、Goalから派生した検証可能なrequirementsとそのtraceabilityを定義する。
- 通常のRequirements Analysis承認は、派生requirementsがcurrent approved goalに忠実であることの承認であり、Goal revisionの承認ではない。目的、scope、success metricsを追加・削除・緩和・置換するrequirements変更はchange proposalとして扱う。
- 各revisionはparent revision、内容digest、作成元、作成時刻を持ち、承認後の内容を書き換えない。
- current approved revision pointerは常に1つとし、人間の明示承認以外で切り替えない。

### FR-2 人間専有のGoal revision

- AIは逸脱を検出し、change proposalを作れるが、Goal revisionを有効化できない。
- change proposalは変更前後、理由、影響するsuccess metrics、現goalでの未達項目、影響、evidenceを表示する。
- Goal revisionを有効化できるのは、専用ゲートに対する人間の直接的な明示操作だけとする。
- 通常のstage承認、一括委任、standing delegation、LLMの自己判定、artifactの書き換えはrevision承認として受理しない。
- user-visibleな仕様逸脱は原則として実装前に提案・承認する。事後発見した場合、承認までのverdictは`DEVIATED`とする。

### FR-3 Workflow-level reconciliation

- 完了直前に、current approved goalのsuccess metrics、明示scope、承認済みrequirementsとaggregate output / evidenceを項目ごとに照合する。
- 承認済みrequirementsはcurrent approved goalへ追跡可能な派生検証基準として照合する。Goalと矛盾するrequirementsはGoalを上書きせず、`DEVIATED`または`UNVERIFIED`として扱う。
- 各必須項目に`ACHIEVED` / `DEVIATED` / `UNVERIFIED`のいずれかとevidence referenceを持たせる。workflow全体の`ACHIEVED`は全必須項目が`ACHIEVED`の場合に限る。
- stage完了数、artifact存在、phase-check存在、テストgreen、mirror settlement単独は`ACHIEVED`の根拠としない。
- 機械検証可能な項目は決定的チェックで判定する。意味的にしか判定できない項目は、参照可能なevidenceを伴う人間の明示裁定だけが`ACHIEVED`を確定できる。
- LLMは候補verdict、根拠、不足証拠を提示できるが、人間裁定を代替できない。

### FR-4 Durable Goal Reconciliation Receipt

- receiptは少なくともIntent identity、Goal ID / revision / digest、scopeとfinal in-scope stage、項目別verdict、evidence reference / digest、全体verdict、人間裁定参照、completion instance、作成時刻を拘束する。
- receiptはcurrent approved revisionと完全一致する場合のみ有効とし、goal、scope、stage graph、evidenceの変更後に再利用できない。
- completionの再試行・回復・idempotent実行は、同一receiptを再検証し、欠落・不一致・改ざんを`UNVERIFIED`として停止する。

### FR-5 単一のcompletion authority

- `Completed`状態、`WORKFLOW_COMPLETED`、Intent registryの`complete`、active cursor解放を確定できる権限を1つのcompletion transactionへ集約する。
- 通常gated approve、non-gated report、direct `complete-workflow`、terminal `finalize`、targeted approval recovery、already-completed recovery、Operation実行 / SKIPを全て同じpreconditionへ通す。
- completion transactionは対象slugが実行時scopeのfinal in-scope stageであることを検証する。
- `finalize`を別writerとして残す場合でも、terminal分岐は単一completion transactionを呼び、stateだけを`Completed`にできない。

### FR-6 Fail-closed completionとリカバリー

- 全体verdictが`DEVIATED`または`UNVERIFIED`の場合、completion transactionをcommitしない。
- `DEVIATED`の場合、人間は「実装をcurrent goalへ戻す」「change proposalを別の人間専用ゲートで審査する」「Intentを未完了で停止する」「Intentを中止する」のいずれかを選べる。
- `UNVERIFIED`の場合、不足証拠と必要な裁定を表示し、証拠追加または人間裁定後に同じreconciliationを再実行できる。
- completion拒否は、stage成果物、audit、worktree、既存receiptを保持し、修正・再検証を可能にする。

### FR-7 Legacy Completed Intent

- receipt導入前のCompleted Intentの状態と監査履歴は一括書き換えしない。読み取り専用の履歴表示は許可する。
- `next` / `report` / `complete-workflow` / terminal `finalize`がlegacy Intentの完了を再確定または書き換える場合、receipt不在を`UNVERIFIED`として停止する。
- legacy Intentを新契約で再確定する場合、immutableな原入力（Intent開始時の依頼、Issue、intent statement）、当時の承認済みrequirements、completion auditからlegacy goal proposalを再構成し、不明・競合する項目を明示する。
- 専用の人間限定migration gateで、再構成したGoal identity / revision / digestと、success metricごとのevidence-backed裁定を明示承認した場合に限りmigration receiptを発行する。migration receiptは人間裁定の代替権限ではなく、その裁定結果を拘束する出力である。
- 原入力が欠落または曖昧な項目は`UNVERIFIED`のままとし、artifact、phase-check、過去のCompleted状態だけからGoalや`ACHIEVED`を推定しない。
- legacy artifactやphase-checkの存在だけから`ACHIEVED`を自動バックフィルしない。

### FR-8 Auditabilityとatomicity

- `WORKFLOW_COMPLETED`からGoal ID / revision / digest、receipt identity、全体verdict、evidence、人間裁定へ追跡できる。
- state、completion audit、Intent registry、cursor解放の完了面は同一トランザクション契約の下で確定し、一部だけをCompletedにしない。
- crash後の再開はreceiptとcompletion instanceを用い、二重完了event、二重裁定、stale revisionの再利用を防ぐ。

### FR-9 Mirrorと完了順序

- Goal reconciliationとmirror settlementを別の型・別のevidenceとして扱う。
- 有効な`ACHIEVED` receiptを確定する前に、workflow完了を前提とするmirror close等の外部作用を実行しない。
- mirror配送失敗はGoal verdictを変更せず、既存のreceiptを保持したまま配送再試行とする。

### FR-10 迂回禁止とcross-harness parity

- Goal guardをconductorの善意、プロンプト遵守、特定harnessのadapterだけに委ねない。canonical state transition側で強制する。
- `AMADEUS_SKIP_ARTIFACT_GUARD`等のartifact / phase-check用bypassはGoal guardを無効化できない。Goal guardに汎用environment bypassを設けない。
- canonical coreから投影される全harnessで、同一のreceipt、verdict、完了precondition、audit契約を強制する。

## 非機能要求

### NFR-1 Integrity / Security

- Goal revision承認は、対象Intent、proposal、parent revision、人間存在証明を拘束し、他Intent・他revision・他セッションへreplayできない。
- receiptの改ざん、欠落、digest不一致、未知verdictは全てfail-closedとする。

### NFR-2 Reliability / Recovery

- 各終端経路は同じ入力に対し同じ判定を返す。一部経路だけがreceiptを省略できない。
- crash、再開、二重呼び出しでもaudit-first / idempotency契約を保つ。

### NFR-3 Testability

- 明示success metricを確実に未達にしたrepo外fixtureで、全終端経路が赤になることを検証できる。
- 正当なcurrent goal達成、証拠付き人間裁定、人間専用ゲートで承認したGoal revisionの正常系を独立に検証できる。

### NFR-4 Distribution parity

- canonical sourceを修正し、package、self-promotion、distribution drift guardにより全harness面の一致を機械検証する。

## 受け入れテストマトリクス

| 軸 | 必須ケース |
|---|---|
| Verdict | `ACHIEVED`のみ完了、`DEVIATED` / `UNVERIFIED`は停止 |
| Goal identity | current revision一致は成功、stale / other Intent / digest mismatchは拒否 |
| Human authority | 専用ゲートの直接人間承認は成功、stage承認 / standing delegation / LLM単独は拒否 |
| Terminal path | gated / non-gated report、direct `complete-workflow`、terminal `finalize`、targeted recovery、already-completed recovery |
| Scope | Operation実行 / SKIP、Intent Capture実行 / SKIP |
| Legacy | 読み取り履歴は維持、再確定はreceipt不在で停止、検証済みmigration receiptで成功 |
| Phase check | 空・無関係ファイルはGoal receiptの代替不可 |
| Recovery | crash / retry / duplicate callで同一receiptを再検証し、二重eventと部分Completedを発生させない |
| Bypass | artifact guard bypassがGoal guardを無効化しない |
| Audit | `WORKFLOW_COMPLETED` からrevision / receipt / evidence / human rulingへ追跡可能 |
| Harness | 全投影面で同一fixtureの判定が一致 |

## 制約

- 正本は`packages/framework/core/`とし、`dist/`やself-install面を独立に手編集しない。
- AI-DLC v2のGoal Ownershipをworkflow-level invariantとして復元し、特定のOperation stageやdomain agentに押し込まない。
- 既存のartifact guard、phase-check guard、mirror settlement、audit-first、human-presence guardを弱めない。
- Goal guardの導入を理由に、個別domainの成功条件を自動意味解析する汎用AI判定基盤へ拡張しない。

## 前提と仮定

- initial goalの入力元はIssue、自由記述のProject文、intent-statementに応じて異なるが、Intent生成時に1つのcanonical Goal identityへ固定できる。後続requirementsはそのGoalから派生し、専用Goal revision gateなしにはGoalを変更しない。
- evidence referenceはリポジトリ内artifact、テスト結果、audit event、外部証跡の安定参照を扱える。
- legacy Completed Intentの一括書き換えは行わず、新契約での再確定が必要になった時点でmigrationを要求する。

## 非スコープ

- 個別domainのsuccess metricを完全自動で意味判定すること
- 人間のGoal ownershipをAI、選挙、standing delegationへ移譲すること
- Operation phaseを全scopeで必須化すること
- `formal-model-check`のTLA+ runnerやauthoring機能の実装
- 既存Completed Intentを無条件に`ACHIEVED`へ自動変換すること
- 正当な方針変更を禁止すること

## 実装に持ち越す設計裁定

次の詳細は本要求の一意性を変えない内部設計として、Code Generationで既存のstate codec、audit-first transaction、completion instanceに整合させる。

- Goal / proposal / receiptの具体的なファイル名とserialization schema
- terminal `finalize`を内部化するか、共通completion authorityを呼ぶadapterとして残すか
- legacy migrationのCLI名と、読み取り履歴に表示するlegacy marker（再構成・人間限定migration gate・receipt発行という権限契約はFR-7で確定済み）
- evidence digestとstage graph digestの具体的な算出方法

これらはFR-1〜FR-10を弱めず、新しい人間裁定を不要に増やさない範囲で決定する。

## トレーサビリティ

| Source | Requirements |
|---|---|
| [Issue #2163](https://github.com/amadeus-dlc/amadeus/issues/2163) | FR-1〜FR-10、NFR-1〜NFR-4 |
| `amadeus/spaces/default/codekb/amadeus/business-overview.md` | Intent分析、成功条件、非スコープ |
| `amadeus/spaces/default/codekb/amadeus/architecture.md` | FR-3〜FR-5、FR-8〜FR-10 |
| `amadeus/spaces/default/codekb/amadeus/code-structure.md` | FR-5、FR-10、NFR-3〜NFR-4 |
| `requirements-analysis-questions.md` Q1 | FR-7 |
| `requirements-analysis-questions.md` Q2 | FR-3、FR-4 |
| `requirements-analysis-questions.md` Q3〜Q4 | FR-2、FR-6 |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-04T04:00:47Z
- **Iteration:** 1
- **Scope decision:** none

Goal Ownership、人間専用権限、共通終端ガードは明確だが、canonical goalの形成契約とlegacy migrationの承認契約が未解決。

### Findings

- BLOCKER | Goalの定義に承認済みrequirementsを含める一方、initial goalをIntent生成時に固定し通常のstage承認やartifact編集ではrevisionできないため、requirementsがcurrent approved goalへ入る正規経路が矛盾している。Evidence: requirements.md「原則と用語」「FR-1」「FR-2」「前提と仮定」。
- BLOCKER | Legacy migration receiptの権限と発行条件が未定義で、Goal ID・revision・digestを持たないlegacy Intentに対して人間のGoal ownershipを迂回し得る。Evidence: requirements.md「FR-7」「実装に持ち越す設計裁定」。
- FOLLOW-UP | Atomicityの受け入れ条件をreceipt persist、audit append、state write、registry update、cursor releaseごとのcrash injection境界として明記するとよい。
- FOLLOW-UP | Intent中止時のstatus、cursor、receipt、audit、restart semanticsを明記するとよい。
- NIT | 受け入れテストマトリクスの「二里event」は「二重event」の誤記。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-04T04:02:15Z
- **Iteration:** 2
- **Scope decision:** none

第1回の2件のBLOCKERは解消済み。initial Goal rev0は人間が開始した原入力から固定され、後続requirementsは派生検証基準として扱われるため、通常のRequirements Analysis承認がGoal revisionになる矛盾はない。legacy migrationも原入力・当時のrequirements・auditからproposalを再構成し、人間限定migration gateでGoal identityと項目別裁定を明示承認した場合だけreceiptを発行するため、人間のGoal ownershipを迂回しない。

### Findings

- None
