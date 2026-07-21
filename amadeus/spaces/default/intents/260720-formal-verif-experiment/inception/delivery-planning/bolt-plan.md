# Bolt Plan — 形式検証対照実験

## 上流入力と計画原則

本計画は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`を入力とする。E-FVEDP1=Aに従い、8 Unitを4 Boltsへ束ねる。各BoltはConstruction stagesを1回通す単位だが、本成果物は計画だけでありConstruction着手やmergeを意味しない。

順序はhard risk-firstである。B1のwalking-skeleton成功後にだけB2を開始し、B2のArm S freeze後にだけB3へ統合し、B3の完全matrix成立後にだけB4で採否を閉じる。数値WSJFはこのfail-closed順序を上書きしない。

## Bolt一覧

| 順序 | Bolt | Units | 推定LOC | Closure |
| --- | --- | --- | ---: | --- |
| 1 | B1 Blind TLA walking-skeleton | U1 `experiment-contract-provenance`、U2 `sealed-fixture-registry`、U3 `execution-evidence`、U4 `tla-arm-toolchain`、U5 `tla-invalid-timestamp-skeleton` | 1,190–1,860 | TLA+/TLC × #1252のblind end-to-end成功 |
| 2 | B2 Independent Arm S freeze | U6 `ts-arm` | 280–450 | 公開入力だけによるArm S freeze |
| 3 | B3 Full matrix and cost | U7 `full-matrix-suite` | 180–300 | 両freeze後の完全matrixとraw cost |
| 4 | B4 Closed decision and wiring | U8 `eligibility-report` | 300–460 | hard eligibility、Pareto、Alloy判定、final wiring |

合計は `unit-of-work.md` と一致する1,950–3,070 LOCである。

## B1 — Blind TLA walking-skeleton

**Walking skeleton:** Yes。U1は単独着地させず、U2〜U4のconcrete handler群とU5の専用integration harnessを同じBoltへ束ねる。ただし5 Unitを単一責務へ潰さず、各Unitの所有・test境界を維持する。U5はU1 portsへU2〜U4 handlersを注入し、U8 final rootには依存しない。

**Definition of Done:**

- U1のpublic schema、command ports、generic dispatcher、authoring event ledger、blind transition validatorがtest doubleで独立greenである。
- U2のD-COUNTは7件すべてに独立red / green falling proofがある場合だけ7とし、不能なら5 clusterへ縮約する。6件を作らない。
- U2のsealed fixture scanがsecret、個人データ、外部選挙store参照0件を証明し、U3がappend-only evidenceとmatrix schemaを検証する。
- U4はTLA+ tools 1.7.4のfixed checksumを検証し、有限domainを固定点まで探索する。completion marker / state統計欠損、timeout、tool errorは`HARNESS_ERROR`である。
- Arm T authorがsealed registry、Arm S、期待failureを見ずにfreezeし、Coordinatorがidentity、worktree、base SHA、公開input hash、freeze SHAを記録する。
- freeze後に#1252だけを限定開示し、U5専用harnessでdeterministic verdict、injection SHA、CI run、raw measurementを相互参照する。同一input hash / seed / boundで再実行した`verdict`と`counterexampleId`が一致しなければskeletonを成功扱いにしない。失敗時は後続transitionを0件にする。

**Confidence hypothesis:** 既存選挙CLIへ、blind freeze→限定開示→TLC verdict→evidence保存の全integration pointを汚染なく結線できる。

**Expected demo:** 同一baselineでArm Tをfreezeし、#1252 reveal後に1セルを実行して決定論的verdictと証跡linkを表示し、failure fixtureではB2開始を拒否する。

## B2 — Independent Arm S freeze

**開始条件:** B1が`SKELETON_PASSED`で閉じた後。同じhealthy baselineから、B1 branchを含まない別worktree / sessionを作る。

**Definition of Done:**

- 別のArm S authorが公開契約、healthy baseline、共通result schemaだけからuniverse、直積全域性、fast-check invariant、submittedAt / receivedAt brand境界を実装する。
- input allowlistにB1 evidence、Arm T path、sealed fixture詳細、期待failureが0件であることを機械確認する。
- Coordinatorがauthor identity、worktree、base SHA、input hash、freeze SHAを記録し、clean worktreeでArm Sをfreezeする。
- 本Boltではfixtureを開示・実行せず、B3 integrationを開始しない。

**Confidence hypothesis:** Arm Sは先行TLA結果から学習せず、同じ公開契約から独立oracleとしてfreezeできる。

**Expected demo:** allowlist receiptとprovenanceを表示し、禁止pathを注入したnegative caseがfreezeを拒否することを示す。

## B3 — Full matrix and cost

**開始条件:** Arm T / Arm Sの両freeze SHAとinput allowlist検査が成立した後。integration mobはこの時点で初めて両成果物へアクセスする。

**Definition of Done:**

- Coordinator / Registryがsealed manifestを内容変更なしで昇格し、canonical healthy baseline + D-COUNT入力を両armへ同一順序で渡す。
- 全セルが`DETECTED` / `NOT_DETECTED` / `HARNESS_ERROR`の共通schemaとraw evidenceを持ち、missing / duplicate / handwritten verdictが0件である。
- 同じhealthy baseline、runner class、input hash、seed、boundで1 warmup + 5 measured full suitesをserial実行し、各suite 120秒、全runの`verdict`と`counterexampleId`一致、全raw sample保存を満たす。
- `ARM_AUTHORED_LOC`、Coordinator event間経過時間、CI suite中央値をarm固有 / sharedに分離して再計算可能にする。

**Confidence hypothesis:** blindにfreezeした二つのarmを、同じ入力と測定規則で比較可能な完全matrixへ統合できる。

**Expected demo:** matrix completeness検査、raw 5 samples、median再計算、両armのfreeze / input provenanceを1つのrun manifestから辿る。

## B4 — Closed decision and wiring

**開始条件:** B3のmatrix / raw costが完全で、U1〜U7が完成していること。

**Definition of Done:**

- hard eligibilityは全D-COUNT `DETECTED`、`HARNESS_ERROR` 0、healthy baseline false positive 0だけを適格とする。
- 両arm適格時だけLOC、authoring elapsed、suite medianをPareto比較し、trade-offが残れば勝者なしとする。
- `NOT_DETECTED`があればAlloy第3arm候補の別裁定要否を記録し、自動追加しない。
- U8のwiring-only rootはU1〜U7のconcrete handlersをdirect import / injectするだけとし、eligibility / Pareto / report評価・表示を重複実装しない。独立wiring testで一意性とerror propagationを検証する。
- reportの全rowがcommand、CI run、artifactへ到達し、同じevidenceから同じ閉じたdecisionを再計算できる。
- 正本の6体グリリング記録に存在する翻意条件を全数列挙し、各条件を支持または反証する実測cellへ対応付ける。未対応条件0件、正本にない創作条件0件を検査する。
- 共通schema / harnessからarm固有oracleへの依存方向を機械検査し、逆流0件を確認する。採用候補armには説明とtestが実在し、`packages/framework/`、`dist/`、self-installのbaseline差分が0でなければB4を完了扱いにしない。

**Confidence hypothesis:** 実測を恣意的加重なしで再現可能な採否へ閉じ、勝者なし / 両方失格も正しく表現できる。

**Expected demo:** 完全・不完全・trade-off・false-positive fixtureから4つの結果区分とAlloy triggerを再計算し、全handler wiringを検証する。

## Gateとmerge規律

各Boltは明示的なConstruction gateに従い、AIはmainへmergeしない。B1〜B4は依存上直列であり、Bolt間の並列実行は禁止する。B1内部ではU1 ports成立後にU2、U3、U4の独立起草を並行できるが、U1を単独で完成・mergeしたとは主張しない。B4 gateは反例ID決定性、翻意条件mapping、依存方向、採用候補armの説明/test、配布面差分0の最終証拠をまとめて確認する。
