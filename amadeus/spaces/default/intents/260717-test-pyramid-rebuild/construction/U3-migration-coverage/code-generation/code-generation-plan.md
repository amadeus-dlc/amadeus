上流入力(engine consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, performance-design.md, security-design.md, unit-of-work.md, requirements.md

# Code Generation 計画 — U3 移設選定台帳・層別カバレッジ整合計画

## 計画状態

- 本ファイルは PART 1 の承認済み計画であり、Step 1〜9を完了した。
- User Stories stage は SKIP 済みのため、架空の story ID は作らない。`unit-of-work.md` の U3 と、U3 の価値「是正計画を materialize する」を trace 起点とする。
- 分類台帳の measurement ref は `3917a283a953165866170d235d3dc25ad2fd3643` に固定する。current HEAD の値へ暗黙更新しない。
- 計画承認前は、163候補の source/evidence 収集、`code-summary.md` の生成、application code・test・config の変更を行わない。
- 具体的な `EvidencePayload` を生成した後、その canonical digest を明示した別の直接 HUMAN_TURN を得るまで、`ApprovalProof`、final state、queue、`U3PlanningResult` を確定しない。過去の設計承認や本計画承認を payload 承認へ流用しない。

## 優先する実装境界

generic な code-generation 手順は application code と test files を想定する一方、FR-7、U3 定義、承認済み NFR Design は、本 intent を「選定台帳と coverage 整合計画の正式 record 化」までに限定している。本計画では後者を優先し、実移設・実装・配線を行わない。

PART 2 の正式成果物は次の1ファイルとする。

- `construction/U3-migration-coverage/code-generation/code-summary.md`: 163候補の canonical `EvidencePayload`、人間承認証跡、選定結果、2 queue、coverage 整合計画、再現・検証証跡

`EvidencePayload` は `code-summary.md` 内の canonical JSON block を唯一の定義点とする。engine の宣言外となる別 JSON、永続生成スクリプト、adapter、extension point は作らない。計画・承認の制御記録は `code-generation-plan.md` と `code-generation-questions.md` に残す。

application code、`tests/`、runner、classifier、metrics collector、CI、repository docs、packages、`dist/`、self-install、実テスト移設、per-tier lcov、強制 gate、Issue 起票、#1157 は変更しない。閉鎖済み [Issue #683](https://github.com/amadeus-dlc/amadeus/issues/683) は再オープンせず、責務も追加しない。

## 実行計画

- [x] **Step 1: スコープ・ref・保護面を固定する**
  - `git rev-parse` / `git cat-file` の stdout で measurement ref と current HEAD の実在を確認する。
  - 開始時の Git status と、record 外の production/test/runner/CI/dist/docs、および state/audit/memory の保護面 manifest を read-only に採取する。
  - 既存 dirty 差分は本作業の成果と混同せず、測定証拠は repo 外の一時領域に置く。
  - Verify: exact ref 解決、開始時 status の保存、既存差分の消失0件。
  - Trace: FR-4、FR-6、FR-7、SEC-D1、`measurement-ref-in-artifacts`。

- [x] **Step 2: U1 正式台帳から母集団を決定的に再導出する**
  - U1 正式 record `construction/U1-size-ledger/code-generation/code-summary.md` の canonical 442-row JSONL を読み、`tier === "unit" && measured !== "small"` の1条件だけで候補を抽出する。
  - U1 record の observedRef、全 row、matrix、compact digest を照合し、現在の worktree や記憶値から台帳を作らない。
  - 排他的 signal bucket と signal 出現数を stdout から導出する。件数を生成入力へハードコードせず、private classifier regex を複製しない。
  - Verify: 442 rows、unit 非 small 163件(medium 162 / large 1)、排他的 bucket `62 / 1 / 9 / 90 / 1` の合計163、signal 出現 `filesystem 153 / spawn 99 / network 1 / timer 1`、file順・KnownSignal順・一意性。数値はコマンド出力後にのみ転記する。
  - Trace: AC-4a、PERF-D2、SCAL-D1/D2、REL-D1〜D4、決定的関数の直接全数適用。

- [x] **Step 3: 163候補の versioned evidence を収集する**
  - 各候補 source を measurement ref 上で最大1回だけ読み、ledger が emit した各 signal に `SignalEvidence` をちょうど1件対応させる。
  - 各 evidence は repository 相対 locator、短い反証可能 fact、`seam-removable | behavior-essential | lexical-false-positive | unknown` の disposition を持つ。
  - source全文、絶対path、環境値、credential、rawな不正値を record へ複製しない。自由記述 fact を final state の分岐条件にしない。
  - `tests/unit/setup-cli-wiring.test.ts` の既知 network lexical false positive を `retier-to-e2e` へ自動送致しない。
  - Verify: candidate集合と evidence集合の全単射、各candidateのsignalsとSignalEvidenceの全単射、locatorの同一file/ref上での実在、candidate=file順、signals=`network → spawn → filesystem → timer`順、field=schema順。
  - Trace: PERF-D1/D2、SEC-D1〜D3、REL-D2/D3。

- [x] **Step 4: canonical `EvidencePayload` と digest を materialize する**
  - `code-summary.md` 内に `{ schemaVersion: 1, observedRef, candidates }` の canonical JSON block を作り、これを唯一の payload とする。
  - canonical bytes を2回生成して byte-equivalent を確認し、SHA-256 `evidenceDigest` を算出する。
  - payload生成時点では `approval-missing` であり、未承認内容を `classification-review` や `ready` へ縮退させない。
  - Verify: schema、candidate/signal全単射、locator、digest再計算、run 1/2 hash一致、payload path実在。
  - Trace: PERF-D1/D2、SEC-D1/D3、REL-D1/D2/D4。

- [x] **Step 5: payload digest を明示した別 HUMAN_TURN で承認を得る**
  - `code-generation-questions.md` に payload path、schemaVersion、observedRef、digest を記し、具体 payload の承認質問を提示して停止する。
  - 推奨回答は digest を含む `Approved sha256:<digest>` とし、数字だけの回答や過去回答を proof に流用しない。
  - 回答後、payload生成後の HUMAN_TURN の実在、human origin、回答内digest、payload再計算digestの exact 一致を audit から read-only に確認し、repository相対 auditRef・timestamp・ordinal を `ApprovalProof` として記録する。audit は直接編集しない。
  - payload内容が変わった場合は旧 proof を失効させ、再生成した digest への別 HUMAN_TURN からやり直す。
  - Verify: `event digest = proof.approvedDigest = evidenceDigest`、payload生成後の human event、一意に解決できる auditRef。
  - Trace: NFR Design Q1、PERF-D1、SEC-D1/D3、REL-D1/D4/D6。

- [x] **Step 6: fail-closed に `U3PlanningResult` を投影する**
  - ledger、payload、proof の構造的不正が1件でもあれば atomic `invalid-input` と diagnostics だけを返し、observation、queue、coverage plan を作らない。
  - valid evidence は承認済み決定表で `seam-to-small | retier-to-integration | retier-to-e2e | classification-review` のちょうど1 final state へ写像する。
  - `reviewQueue` は file 昇順・rankなし、`migrationQueue` は `(rank, file)` 昇順で seam=0、両retier=1とする。
  - review が残れば `open-review`、空なら `ready`。`open-review` の migrationQueue は可視化のみで actionable ではない。
  - Verify: `unitNonSmallCount = reviewQueue.length + migrationQueue.length`、両queueのfile集合が排他的で合計163、1 candidate=1 final state、`ready ⇔ reviewQueue.length === 0`。
  - Trace: AC-4a/4b、TECH-2、REL-D1〜D4、SCAL-D2。

- [x] **Step 7: coverage 整合計画と正式 summary を完成する**
  - 4 NamedTier を `unit → integration → e2e → smoke` の固定順で各1 bindingへ投影し、非ゼロの `${tier}_${size}` を `small → medium → large` 順の `ledgerKeys[]` にする。
  - combined は `existing("coverage/lcov.info") + executed`、unit/integration/smoke は `pending + executed`、e2e は `pending + not-executed`、harness/lib は `not-applicable + not-applicable` とする。
  - per-tier path名、follow-up Issue番号、容量・時間閾値は `PENDING` のまま維持する。
  - `code-summary.md` に observation、163行選定結果、2 queue、result kind、coverage plan、再現証跡、および必須4節 `Files created / modified`、`Key implementation decisions`、`Test coverage summary`、`Deviations from plan` を含める。
  - Verify: 4 binding exact、ledgerKeysの過不足0、`PENDING / N/A / NOT EXECUTED / PASS` の相互代用0、combinedをper-tier pathへ流用していない。
  - Trace: FR-6、TECH-3/4、REL-D5、SCAL-D3/D4。

- [x] **Step 8: record の完全性・決定性・非破壊性を機械検証する**
  - repo外の一時 Bun validator で schema、digest、proof、全単射、locator、count、sort、queue、coverage invariantを全数検査する。
  - exact measurement ref の既存 classifier/metrics関連testと、coverage経路のread-only contract checkを最終変更後に実行する。
  - final command、exit code、files/pass/fail等の集計stdoutを得てからsummaryへ転記する。
  - 新規 executable behavior がないため、新規unit/integration/e2e test fileとtest configは反証可能なN/Aとする。既存必須検査を省略する根拠にはしない。
  - Verify: validator全項目PASS、canonical run 1/2一致、targeted tests exit 0、記載数値とfinal stdoutの一致。
  - Trace: FR-7、PERF-D6、REL-D4、SEC-D4、既存グリーン維持。

- [x] **Step 9: scope guard・センサー・レビューを閉じる**
  - 開始時 manifest/status と比較し、本作業由来の直接変更を `code-generation-plan.md`、`code-generation-questions.md`、`code-summary.md` に限定する。
  - production/tests/runner/classifier/CI/dist/docs/state/memoryへの本作業由来変更0件、消失status 0件、conflict marker 0件を確認する。
  - 成果物生成とpayload承認後、reviewer前に `answer-evidence` を質問票へ手動 fireし、auditの `SENSOR_PASSED/FAILED` 行でverdictを読む。Markdown-onlyのためlinter/type-checkはN/Aとし、無関係なdirty TypeScriptへ発火しない。
  - architecture reviewerへ最大2 iterationで依頼する。payloadを変える是正があればStep 4〜5のdigest再生成・再承認へ戻る。
  - 実測: 手動sensor fire ID `b9c86633` は `SENSOR_PASSED`。review iteration 1は再現手順とStep表記の2点で `NOT-READY` となり、payload外へversioned replay validatorとexact-ref再構成手順を追加してiteration 2へ回す。
  - 実測: review iteration 2はfindings 0で `READY`。review後の§13 surfaceはmemory entries 0、candidates 0、parked 0で、永続化対象はない。
  - READY、sensor PASS、scope guard成立後だけengineへ戻る。state/memoryを直接編集しない。
  - Trace: FR-7、manual-sensor-fire-before-gate-report、sensor-before-reviewer、stage reviewer契約。

## application code / test / config の適用判定

| generic 項目 | 判定 | 根拠 |
| --- | --- | --- |
| Business logic / API / repository / DB / UI | N/A | 本unitは既存U1台帳とrepository内evidenceを正式recordへmaterializeする。実装は承認済みOut |
| Application code / classifier / runner | N/A | 既存資産はread-onlyに再利用し、二重分類器・adapter・配線を作らない |
| 新規 unit / integration / e2e tests | N/A | executable behaviorを追加しない。summary内のversioned replay validatorと既存関連testでrecordを実証する |
| Test configuration / CI | N/A | per-tier lcov、CI job、exit code、強制gateはfollow-upのPENDING/Out |
| Migration / compatibility | N/A | 実移設、後方互換shim、fallback、二重実装は行わない |
| Documentation | recordのみ | U3のplan/questions/summaryだけを変更し、repository docsは変更しない |

## エラー処理と停止条件

- U1 ledgerがcompleteでない、observedRef不一致、行不変条件違反、候補/signals/evidenceの欠落・重複・余剰、未知signal、locator不正、digest/proof不一致が1件でもあれば、完全な計画として続行しない。
- payload承認前は必ず停止する。`approval-missing` を `open-review` や `ready` と報告しない。
- valid payloadでも `reviewQueue` が非空なら `open-review` とし、migrationQueueをactionableと報告しない。
- 既存testが赤い場合は変更前baselineと切り分け、自変更による失敗を直す。無関係な赤をgreenと報告しない。
- plan外のproduction/test/runner/CI/dist/docs変更、仕様変更、未決事項が必要になった場合は停止してユーザーへ直接確認する。

## 計画完了条件

- 具体 payload が別 HUMAN_TURN でdigest単位に承認され、verified `ApprovalProof` を持つ。
- 163候補、排他的bucket、signal counts、final states、2 queue、coverage planが同一入力から再現可能である。
- `U3PlanningResult` のkindとactionabilityが正確である。
- mandatory 4 sections、検証command/exit、scope guard、sensor verdict、reviewer READYが正式recordに残る。
- Out/PENDING境界と既存dirty変更が保護されている。
