# 260803-advisory-human-choice 差分スキャン記録

## スキャンメタデータ

- Date: `2026-08-03T08:00:01Z`
- Base commit: `a8e1ce025a918310ab7d803270bb6fc6b649c598`
- Observed commit: `498c3034a78bd432dc426f9f807b79c8ae980762`
- Focus: [Issue #2129](https://github.com/amadeus-dlc/amadeus/issues/2129) — Formal Model Check advisoryを人間判断なしで消費・latchしてstageを開始できる構造、および3 checkpoint、main / `--single`、per-unit、state / audit / protocolの同根面。
- Scope: `self-fix`、Brownfield、単一repo `amadeus`、Depth: Minimal、Test Strategy: Comprehensive。
- Scan mode: Developer Code Scanの確定事項を入力に、Architectが既存CodeKBの最新節を履歴へ降格し、実測事実と未承認要件候補を分離して差分合成した。

## Base選定と祖先性

本intent固有のprior re-scan recordは存在しない。他の `re-scans/` をDateで比較し、最新日付 `2026-08-03` の `260802-plugin-projection-parity.md` が記録するobserved `a8e1ce025a918310ab7d803270bb6fc6b649c598` をbaseに採用した。

- 祖先性検証: `git merge-base --is-ancestor a8e1ce025a918310ab7d803270bb6fc6b649c598 498c3034a78bd432dc426f9f807b79c8ae980762`
- 結果: exit `0`（baseはobservedの祖先）
- 距離: `git rev-list --count a8e1ce025a918310ab7d803270bb6fc6b649c598..498c3034a78bd432dc426f9f807b79c8ae980762` = `42`

## 実測された現行構造

1. `amadeus-plugin-activation.ts:247` がadvisory shapeを生成し、`:290` が `(plugin, code)` をlatch keyにする。
2. `amadeus-orchestrate.ts:1307` がadvisoryを発火し、`:1325` がmain / `--single` のdirectiveへ載せる。pending消費は`:697`、wire schemaは `amadeus-directive.ts:140`。
3. main report `amadeus-orchestrate.ts:3955` とsingle report `:4159` にadvisory choice / receipt入力はない。
4. generic presenceは `amadeus-state.ts:2811`、汎用 `GATE_APPROVED` は`:3322`。どちらもplugin/code/choiceを相関しない。
5. `stage-protocol.md:941` はadvisoryを人間へ提示し判断させるが、その判断を検証するengine状態はない。canonical audit registryは81 eventで、advisory固有receiptはない。
6. `functional-design` はper-unitであり、最初の `gate:false` directiveでadvisoryを消費・latchし、全unit後の `gate:true` では再掲されない（`functional-design.md:2`、orchestrator `:3470`, `:3607`）。report時だけのguardではstage body開始前holdにならない。

## Architect Synthesis

### 確定した境界

- 中核不具合はCONFIRMED: advisory通知はあるが、advisory固有の人間選択を入力・保持・検証する状態機械がない。
- 3 checkpointとmain / `--single` / per-unitは、別々の修正ではなく同じ「発行前の人間権限境界」として要件化する必要がある。
- 後段の `formal-model-check` 実行は上流checkpointでの人間判断receiptを遡及生成しない。
- 実際のAI発話内容と実損量はINCONCLUSIVE。構造上可能であることと、過去に必ず発生したことを混同しない。

### Requirements Analysisへ送る未承認論点

- 選択の意味（今すぐ実行／リスクを認識して延期）、鮮度、run / session / specへの相関、再入・replay・stale拒否。
- 最初の `gate:false` を含むdirective発行またはstage body開始のどこでholdするか。
- state、audit、または両者の相関のどれをreceipt正本にするか。canonical eventを追加する場合のprotected writerと一般audit CLIからの自己mint拒否。
- not-ready / changed / never-run / current / not-composed、初回 / 再入 / 新session / spec変更、directive発行前error、将来 `dispatch-subagent` を含む閉包。

receiptのJSON shape、CLI flag、state field、event名はReverse Engineeringでは決定しない。

## 検証結果

- 再利用したDeveloper scanコマンド: `bun test --timeout 120000 tests/integration/t378-advisories-directive-field.integration.test.ts tests/integration/t381-advisory-checkpoints-latch.integration.test.ts`
- 結果: exit `0`、`28 pass`、`0 fail`、`107 expect`
- Architect synthesisでの再実行: なし（上記の確定結果を再利用）
- 現行suiteが固定する面: 3 checkpoint、directive field、main / `--single`、同一run latch。
- 欠落test面: receiptなし拒否、人間選択の一回記録、最初の `gate:false` 前hold、main / single / per-unit対称性、stale / spec-change / new-run / replay、protected writer / self-mint拒否。
- 書込み後の見出し検査: 共有9成果物は各39以上のH2、本recordは6 H2。全対象が最低2 H2を満たす。
- Mermaid構造検査: 新規現在節はopening / closing fence各2、diagram 2、直後の `Text fallback` 2。flowchartの参照nodeは全宣言済み、sequenceのparticipantは3者とも宣言済み、特殊文字を含むlabelは引用符で囲んだ。
- 変更範囲検査: CodeKB配下のstatusは指定された共有9成果物の変更と本recordの新設だけ。repo全体に事前から存在した `intents.json` と対象intent recordの変更には触れていない。

## CodeKB更新範囲

共有9成果物にIssue #2129の現在断面を追加し、直前の `260802-registry-drift-guard` の現在節を履歴へ降格した。既存履歴は削除していない。更新対象は `business-overview.md`、`architecture.md`、`code-structure.md`、`api-documentation.md`、`component-inventory.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`reverse-engineering-timestamp.md` と本recordである。
