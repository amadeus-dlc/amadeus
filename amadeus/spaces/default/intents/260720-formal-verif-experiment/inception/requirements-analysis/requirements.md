# Requirements — 260720-formal-verif-experiment

## 上流入力(consumes 全数)

本要件は `intent-statement.md` の停止条件と成功指標、`scope-document.md` の M-1〜M-6 / W-1〜W-5、`business-overview.md` の Amadeus 業務境界、`architecture.md` の repo-local script / CI 境界、`code-structure.md` の選挙CLI・テスト・配布構造、`team-practices.md` の branch / test / release 規律に依拠する。

## Intent Analysis

目的は、選挙プロトコルの既知欠陥を「後から見つけ続ける」状態から、有限の判定集合を機械実行して正しさを閉じる状態へ移すことである。本intentは本採用のCIゲートを完成させるものではなく、同一被検体へ TLA+/TLC と TypeScript 内完結判定器を盲検対照し、全欠陥検出を満たす方式のうち採用候補を実測で決める。

要求の明確性はStandard、変更種別は実証実験、影響範囲は repo-local `scripts/` / `tests/` / CI実験面に限定する。欠陥分母、適格アーム間のコスト停止条件、最初のwalking-skeleton組は `requirements-analysis-questions.md` Q1〜Q3(E-FVERA1R〜3R)で確定済みである。

`team-practices.md:11` の「追加のskeletonは設けない」は、過去のbranch-hygiene intentを本intentとして記した古い記述であり、本intentには適用しない。後発のE-FVERA3Rは本intentに限ってwalking-skeletonを要求する。これはteam全体のbranch、test、release、TypeScript / Bun規律(`team-practices.md:7,15,19,23`)を変更しない。

## Traceability

| 要件 | 上流根拠 |
| --- | --- |
| FR-1、FR-2 | `intent-statement.md:7-9,18-22` の停止条件・成功指標、`scope-document.md:11-12,30-31` のM-1/M-2と依存、E-FVERA1R |
| FR-3、FR-4 | `scope-document.md:13-15,32-35` のM-3〜M-5と盲検境界、`code-structure.md:518-523` のtest / property-based testing構造 |
| FR-5、FR-6 | `intent-statement.md:20-22` の全件検出後コスト最小、`scope-document.md:15-16` のM-5/M-6、E-FVERA2R |
| FR-7 | `intent-statement.md:36` と `scope-document.md:22` のAlloy除外境界 |
| FR-8 | `team-practices.md:11` の古い記述を本intent限定で置換するE-FVERA3R、`scope-document.md:30-35` の依存・blind境界 |
| FR-9、NFR-1〜4 | `intent-statement.md:18-22,32-38` の成功・境界、`architecture.md:233-255,404-419` のone-core-many-harnesses / 同期境界、`code-structure.md:525-537,620-654` のrepo-local test / CI構造、`team-practices.md:7,15,19,23` のbranch / test / release / tool規律 |

`business-overview.md:45-60` は過去intentのReverse Engineering handoffを記した履歴であり、本実験固有の要求は導出しない。本intentでは、同文書が示す「後続工程は検証可能なReverse Engineering事実を入力にする」というrepository業務境界だけを継承し、実験の分母・対象・成功条件は `intent-statement.md`、`scope-document.md` とE-FVERA1R〜3Rを正本とする。

## Functional Requirements

### FR-1 欠陥台帳を閉じる

- PR #1268、#1277、#1273 の修正差分と回帰テストを一次資料とし、実験対象を原則 `D-COUNT = 7` 個の原子的predicate(choice winner、unknown-choice、receivedAt、invalid-timestamp、amend submission、unknown-ref、per-voter resolution)へ正規化する(E-FVERA1R=C)。
- 各台帳行は defect ID、修正PR / Issue、壊れるpredicate、健全baselineの期待、再注入patch、既存回帰テスト、影響ファイルを持つ。
- 同じ根因または同じ観測predicateを二重に数えない。PRに同梱された追加防御を独立欠陥として数える場合は、単独で赤化・緑化できる証拠を必須とする。
- 7 predicateの各行が単独再注入で赤化し、健全baselineで緑化する独立falling proofを持つ場合だけ `D-COUNT = 7` を成立させる。独立実証不能なpredicateが1件でもあれば二重計上せず、根拠のある5 incident/root clusterへ縮約して成功指標と全matrixを `D-COUNT = 5` へ訂正する。非対称なクラスタ分割で6件を作らない(E-FVERA1RのGoA2留保2票を統合)。
- 台帳件数と成功指標の分母が一致しなければ、注入branchを作成しない。

合否: 台帳の各行について、修正commitを含むbaselineは対応predicateが緑、当該変更だけを戻したfixtureは対応predicateが赤となり、全行の和が `D-COUNT` と一致する。

### FR-2 1欠陥1branchで再注入する

- 欠陥ごとに origin/main の同一baselineから独立branchを作り、1branchには台帳上の1クラスタだけを再注入する。
- 注入branchは main へマージせず、branch名・baseline SHA・注入commit SHA・逆適用した修正hunkを台帳へ記録する。
- 他欠陥の修正を巻き戻さない。branch間差分が複数クラスタへ波及する場合は注入を失敗扱いにして分割し直す。

合否: 各branchとbaselineの差分が台帳の許可hunkに包含され、対象predicateだけが赤化し、非対象の回帰集合はbaselineと同じ結果になる。

### FR-3 二つのアームをblind独立でfreezeする

- Arm T は選挙状態機械の最小TLA+仕様と TLC 有界検査を持つ。
- Arm S は TypeScriptで universe 宣言、直積全域性検査、fast-check不変条件、submittedAt / receivedAt のブランド型境界を持つ。
- 二つのアームは別エージェント・別worktreeで起草し、相手アームの実装と注入branchの正体を読まない。
- 公開可能な選挙契約、健全baseline、共通結果schemaだけを共有し、欠陥台帳の期待failureや既存回帰テスト名はfreeze commitまで非開示とする。
- 各アームはfreeze SHAを記録した後でのみ注入branchへ適用する。freeze後の仕様変更は、理由と前後結果を別revisionとして記録し、初回検出率を書き換えない。

合否: armごとに異なるauthor / worktree / freeze SHAが存在し、freezeより前の入力一覧に注入branch・defect ID・期待failureが含まれない。

### FR-4 共通の決定論的verdictを返す

- 各実行は `DETECTED`、`NOT_DETECTED`、`HARNESS_ERROR` のいずれかを返し、arm、defect ID、baseline SHA、arm SHA、seed / bound、開始・終了時刻、exit code、反例またはfailure根拠を記録する。
- `DETECTED` は注入branchで対象契約に反する機械反例またはfail-closed verdictが出た場合だけとする。ツール起動失敗、依存取得失敗、timeout、無関係なtest failureを検出へ数えない。
- 健全baselineで同じ検査が赤になる場合はfalse positiveとして別計上し、注入branchの`DETECTED`を成功へ昇格させない。
- seed、探索bound、tool version、入力SHAを固定し、同一入力の再実行が同じverdictと反例識別子を返す。

合否: 結果schemaが全 `D-COUNT × 2` セルと健全baseline×2セルに存在し、空欄・手書きverdict・exit codeだけからの推定がない。

### FR-5 同一条件でコストを測定する

- `ARM_AUTHORED_LOC` は、armが専有するsource、arm固有test、arm固有configの `git diff --numstat` additions + deletionsとする。両armが使う測定harness・共通schema・共通build configは `SHARED_LOC` として別掲し、どちらのarmにも按分しない。追加依存・設定ファイル数もarm固有とsharedを分離してraw値で残す。
- 実装経過時間はApplication Designで定義する監査event `ARM_AUTHORING_STARTED` から `ARM_FROZEN` までの差とし、commit timestampや会話時刻で代用しない。event名と発火条件は測定開始前に固定する。
- CI実行時間は両armを同一runner class・同一入力集合で測り、Application Designで固定する奇数のnamed constant `BENCHMARK_RUNS` 回の本測定中央値を代表値とする。`BENCHMARK_WARMUPS`、`BENCHMARK_TIMEOUT_SECONDS` もnamed constantとして固定し、warmupを中央値へ含めず、全raw sampleを残す。最初の測定後に変更しない。
- false negativeは注入欠陥を`NOT_DETECTED`としたセル、false positiveは健全baselineを赤にした検査として数える。`HARNESS_ERROR`をどちらにも丸めず失格理由として残す。
- arm固有の依存取得時間を実装・CIコストから除外する場合は、両armに同じ除外規則を適用し、除外前後を併記する。

合否: 全raw値から集約値を再計算でき、arm名を入れ替えても測定手順が変わらない。

### FR-6 採否を閉じた規則で確定する

- 全 `D-COUNT` 欠陥が`DETECTED`であり、`HARNESS_ERROR`がなく、健全baselineのfalse positiveが0であることを適格性のhard条件とする。1件でも`NOT_DETECTED`、`HARNESS_ERROR`またはfalse positiveがあれば、そのarmを勝者にしない。
- 両armが適格な場合だけ、`ARM_AUTHORED_LOC`、`ARM_FROZEN - ARM_AUTHORING_STARTED`、CI実行時間中央値の3軸でPareto比較する。全軸で他方以下かつ少なくとも1軸で小さいarmだけを勝者とし、相互trade-offで非劣位が並ぶ場合は「両方適格・勝者なし」と確定する(E-FVERA2R=B)。`SHARED_LOC` は報告するが比較軸へ含めず、異なる単位を恣意的に加重合算しない。
- 結果は `Arm T採用候補`、`Arm S採用候補`、`両方適格・勝者なし`、`両方失格` の閉じた集合から選び、判断根拠となるmatrixと比較tupleを同じreportに置く。
- 勝者成果物は本採用初版として温存するが、本intentではproduction CIの必須checkへ昇格させない。

合否: 同じmatrix / cost tableを入力すると、人の暗黙補正なしに同じ結果区分へ到達する。

### FR-7 Alloy候補の発動条件を記録する

- いずれかのarmが既知欠陥を取りこぼした場合、取りこぼした契約クラスと両armに共通する盲点を記録し、Alloyを第3arm候補として評価する。
- Alloy追加は自動スコープ拡張せず、実測matrixを添えた別裁定を必要とする。
- 二つのarmが全件検出した場合、Alloyは本intentの対象外のままとする。

合否: matrixに`NOT_DETECTED`が1セル以上あれば取りこぼした契約クラス、共通盲点、別裁定要否を記録し、0セルなら「発動なし」を記録する。記録なしのAlloy追加または自動追加は不合格とする。

### FR-8 walking-skeletonを最初に実証する

- 最初のConstruction Boltは TLA+/TLC arm × #1252 invalid-timestamp をrisk-firstで扱い、注入branch作成、arm freeze、決定論的verdict、CI証跡、raw measurement保存までをend-to-endで完了する(E-FVERA3R=A)。arm仕様のfreeze commit後にだけ注入branchの正体を開示する。
- skeletonの後続比較への影響を明記し、先行armだけが得た知識を相手armへ共有しない。
- skeletonが`HARNESS_ERROR`または非決定的結果なら、残りのfan-outを開始しない。

合否: TLA+/TLC × #1252について、blindなfreeze SHA、注入SHA、決定論的verdict、CI run、raw measurementが相互参照でき、成功時だけ後続fan-outが開始される。1項目でも欠ける、または失敗後にfan-outした場合は不合格とする。

### FR-9 採否レポートを再現可能にする

- レポートは欠陥台帳、branch / commit対応、2armのfreeze provenance、検出matrix、健全baseline結果、raw cost、集約、FR-6結果、Alloy発動判定を含む。
- 6体グリリングで記録された翻意条件ごとに、どの実測セルが支持・反証したかを対応付ける。元記録に存在しない翻意条件を創作しない。
- 各table rowから実行command、CI run、artifact pathへ辿れるようにする。

合否: FR-9の全項目が存在し、matrixとcost tableの各行からcommand、CI run、保存artifactへ機械的に辿れ、同じ入力からFR-6の区分を再計算できる。欠損行、根拠のない翻意条件、再計算不能な集約があれば不合格とする。

## Non-Functional Requirements

### NFR-1 Determinism / Reproducibility

- TLA+ tool version / jar checksum、JVM version、Bun / fast-check version、seed、TLC bound、fixture SHAを固定する。
- network依存はTLC artifactの取得工程に限定し、検査実行自体はrepositoryに固定された入力だけで完結する。
- timeoutや探索上限はservice SLOへ読み替えず、named constantと到達時の`HARNESS_ERROR`を記録する。

合否: 固定した同一SHA / version / seed / boundで各セルを2回実行し、verdictと反例識別子が一致する。不一致、未固定値、network取得に依存する検査実行は不合格とする。

### NFR-2 Reliability / Fail-closed

- 欠損fixture、未知defect ID、schema不一致、tool不在、checksum不一致、未完matrixを成功扱いにしない。
- verdict生成とreport集約を分離し、report側がmissing cellを`NOT_DETECTED`へ暗黙変換しない。
- counterexampleの不存在だけで検出器の完全性を主張しない。既知欠陥でのfalling proofを完成条件とする。

合否: 欠損fixture、未知ID、schema不一致、tool不在、checksum不一致、未完matrixのnegative fixtureがすべて非成功になり、missing cellを成功または`NOT_DETECTED`へ丸めない。1件でもfail-openなら不合格とする。

### NFR-3 Security / Supply Chain

- TLC jarの取得元、version、cryptographic checksumをApplication Designで固定し、CIで照合する。
- secret、個人データ、外部選挙storeを実験fixtureへ取り込まない。保存データはsyntheticまたは既存repository内の公開recordに限定する。

合否: TLC artifactのversion / 取得元 / checksum照合がCI証跡に残り、fixture走査でsecret、個人データ、外部store参照が0件である。checksum未照合または禁止データが1件でもあれば不合格とする。

### NFR-4 Maintainability / Testability

- 共通result schemaと測定harnessはarm固有oracleから独立させる。
- 勝者armの成果物は本採用初版として読める命名・説明・testを持つ。敗者armも実験証跡としてrecordに残すが、production必須経路へ配線しない。
- 新規module / test / CI面は既存`tests/`・repo-local script構造を再利用し、配布frameworkへ同期義務を発生させない。

合否: 共通schema / harnessとarm固有oracleが別moduleとして依存方向を保ち、勝者armに説明とtestがあり、`packages/framework/` と `dist/` の差分が0である。arm固有oracleから共通harnessへの逆流、test欠損、配布差分があれば不合格とする。

## Constraints

- JVM/TLCはrepo-local CI / scriptsに限定し、`packages/framework/`、`dist/`、self-installへ追加しない。
- arm authorは同一人物にしない。注入内容はfreezeまでblindとする。
- construction着手前に選挙CLI面の他in-flight intentとのファイル交差を再実測する。
- 注入branchはmainへマージしない。不可逆なGitHub操作とmain mergeは人間承認を要する。
- User Stories、mockup、deployment / operation、勝者armの本採用CI化は本intentで実行しない。

## Assumptions

- PR #1268、#1277、#1273 の修正差分は独立注入へ分解可能である。FR-1/FR-2で反証された場合は実験を停止し、分母を偽装しない。
- OpenJDKは利用可能で、TLC artifactはchecksum固定で取得できる。取得不能ならArm Tは`HARNESS_ERROR`であり、Arm Sの自動勝者化ではなく実験不成立理由として扱う。
- fast-checkは既存依存として利用できる。
- 既存回帰testは注入正しさの補助oracleであり、2armの検出結果そのものには数えない。

## Out of Scope

- Alloyの自動追加、Z3/SMT導入、選挙以外の状態機械への一般化。
- production必須CI check、配布framework変更、version bump、release、npm publish。
- 既存選挙CLI bugの再修正、注入branchのmain merge、実験外のリファクタリング。
- 人間の主観的なコード美観や学習容易性を、測定定義なしでコストへ加えること。

## Open Questions

- Requirements判断は残っていない。Q1〜Q3はE-FVERA1R〜3Rで解消済み。
- Application Design委任: benchmark反復数、warmup、timeout、TLC bound、jar version / checksumのnamed constants。
