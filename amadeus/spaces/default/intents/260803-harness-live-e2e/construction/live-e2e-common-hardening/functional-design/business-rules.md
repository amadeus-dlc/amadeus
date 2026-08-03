# Business Rules — live-e2e-common-hardening

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## Ownership Rules

- BR-O01: U02はtest kitとadversarial suiteだけを所有し、U01 production file/export/schemaを変更しない。
- BR-O02: 契約違反を再現した場合はtestを弱めず、U01 ownerへ`BLOCKER`として返す。
- BR-O03: transport固有command、prompt、anchor、auth方式をfake共通層へ持ち込まない。
- BR-O04: U03〜U11はU02 test kitをimportするが、U02から具体adapterをimportしない。
- BR-O05: FR-3のproduction probeはU01/U03〜U11、reusable preflight oracleとfake declarationはU02が所有する。U02はprobe本体を実装しない。

## Determinism and Isolation Rules

- BR-D01: すべてのproperty caseは再現可能なseedを持つ。
- BR-D02: fake clock、abort、process、filesystem root、environmentをcaseごとに生成する。
- BR-D03: caseはserialに実行し、module substitutionとprocess-global envを並行共有しない。
- BR-D04: 実CLI、実model、実credential、network、課金APIをoffline hardening suiteから呼ばない。
- BR-D05: fault caseは原則1つの`FaultPoint`だけを有効化し、複合faultは診断集約を検証する明示caseに限定する。

## Policy Oracle Rules

- BR-P01: opt-in allow値は逐語的な`"1"`だけである。
- BR-P02: `GITHUB_ACTIONS=true`は全条件より優先し、probe/lease/scratch/spawn/ledger callを0回にする。
- BR-P03: unknown code、status/code不整合、priority違反はtest-definitionではなくproduction contract failureとしてredにする。
- BR-P04: skip、timeout、failure、successを互いに正規化しない。
- BR-P05: retry既定0、明示されたload transientだけ最大1であり、assertion/contract/cleanup/ledger failureをretryしない。

## Secret and Environment Rules

- BR-S01: leak corpusは非秘密canaryを使い、raw credentialをfixture、snapshot、failure messageへ保存しない。
- BR-S02: child envはallow-listのkey集合で検査し、ambient env spreadを許さない。
- BR-S03: source auth/config/hooksのpath文字列、symlink、copy、内容hashがscratch、argv、env、diagnostic、receipt、ledger、matrixに現れたらredである。
- BR-S04: 許可された`CredentialBinding`もchild lifetime終了後に残留してはならない。
- BR-S05: debug保持はworkspace/logだけを対象とし、credential-bearing resourceは常に削除する。

## Lifecycle and Result Rules

- BR-L01: scratch副作用前にregistrarへplanned登録し、作成直後にcreatedへ遷移したことをtraceで検証する。
- BR-L02: prepare途中、execute/assert throw、timeout、abort、successの全経路でcleanupとleak scanを独立に試行する。
- BR-L03: cleanup/leak failureはprimary `EXECUTION_FAILED`であり、元結果をsanitized secondary diagnosticへ保持する。
- BR-L04: timeoutはabortとreapの両方が観測されるまで終端しない。
- BR-L05: skipはscratch開始前に終端し、recorded green receiptを生成しない。
- BR-L06: ledger永続化失敗後にrunnerがsuccessを返したらredである。

## Ledger Rules

- BR-G01: malformed ledgerを一切書き換えずfail-closedにする。
- BR-G02: 同一receipt ID・同一内容は重複なし、異内容はconflictにする。
- BR-G03: final pathへ部分JSONL行を公開しない。
- BR-G04: live/unknown owner lockを回収せず、dead ownerまたはgrace超過unstamped lockだけをCAS回収する。
- BR-G05: write/fsync/rename/revalidation failureでもwriterはowner一致lockを`finally`で解放する。
- BR-G06: recoveryはfresh lock下で同一receipt ID・同一recordを再検証し、重複なしに`already-present`を返す。未確認のdirectory durabilityを主張しない。
- BR-G07: orphan tempは自動採用せず、安全に同一writer由来と確認できる場合だけ除去する。

## Matrix and Evidence Rules

- BR-M01: registryと全行validatedのledgerだけをprojection入力にする。
- BR-M02: adapter ID順のrenderは同一入力でbyte-identicalである。
- BR-M03: runnerはdocsを変更せず、明示`update`だけがgenerated blockを変更する。
- BR-M04: generated marker/column/drift/unknown adapter/malformed receiptの違反を独立caseでredにする。
- BR-E01: 各guardはbaseline greenとmutant redの両方を持つ。
- BR-E02: evidenceはcase ID、seed、contract、failed assertion名だけを保持し、環境値やmachine固有pathを含めない。
- BR-E03: U02完了条件はoffline suite greenと注入red証拠であり、実live greenを要求・主張しない。

## Coverage Rules

| Contract | Required cases |
|---|---|
| FR-1/2 | strict opt-in、GHA precedence、全code、unknown code |
| FR-3 | reusable preflight oracle。production probe実装は対象外 |
| FR-4/NFR-1 | env allow-list、secret/source-pointer leak、debug cleanup |
| FR-5/6 | partial prepare、throw、timeout、abort/reap、cleanup/leak、retry/serial |
| FR-10 | fake baselineと各violationの期待red |
| FR-11 | malformed/conflict/crash/stale-lock/idempotent recovery/concurrency、matrix drift |
