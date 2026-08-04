# Application Design Questions: TLA+ Model Authoring

## 回答方法

- モード: Guide me
- 質問予算: 最大8件。上流の`requirements.md`、`architecture.md`、`component-inventory.md`、team-practicesで確定済みの事項は再質問しない。
- AWS、常駐service、DB、Web/TUIは要件がないため対象外とし、既存TLC child-process境界を維持する。

## 質問

### Q1. authoring責務をstage graphへどう配置しますか？

- A. Requirements Analysisでapplicabilityを判定し、独立したplugin authoring stageで新規作成・改訂・proof・review・registrationを所有するhybrid構成（推奨）
- B. Requirements AnalysisとFunctional Designへのoverlayだけで全責務を分担する
- C. 独立stageだけを追加し、Requirements Analysisのapplicability判定もそこへ移す
- X. Other (please specify)

[Answer]: A. Requirements Analysisでapplicabilityを判定し、独立したplugin authoring stageで新規作成・改訂・proof・review・registrationを所有するhybrid構成（推奨）

### Q2. requirements/design identityとstalenessをどの粒度で管理しますか？

- A. stable IDごとのcanonical content digestを作り、sorted aggregate digestとtrace rowsをversioned evidence bundleへ格納する（推奨）
- B. requirements.mdとdesign artifact全体のfile digestだけで管理する
- C. Git commit SHAだけで管理する
- X. Other (please specify)

[Answer]: A. stable IDごとのcanonical content digestを作り、sorted aggregate digestとtrace rowsをversioned evidence bundleへ格納する（推奨）

### Q3. evidence一式と`model-map.json`登録をどう原子的に観測させますか？

- A. content-addressed evidence bundleを先に確定し、検証済みbundleを参照するmodel-mapのatomic replaceを唯一のvisibility pointにする（推奨）
- B. evidenceとmodel-mapを順番に直接更新し、失敗時にrollbackする
- C. append-only transaction logを新設し、replayで整合させる
- X. Other (please specify)

[Answer]: A. content-addressed evidence bundleを先に確定し、検証済みbundleを参照するmodel-mapのatomic replaceを唯一のvisibility pointにする（推奨）

### Q4. plugin import closureをどこで検証しますか？

- A. plugin projection時にentrypointから相対importを再帰走査し、manifest/bundle/ownedPathsの欠落をfail-closedにする汎用guardを追加する（推奨）
- B. 今回欠けている2 moduleだけをmanifestへ手動追加し、新しいguardは作らない
- C. composed runtimeのE2E実行だけで欠落を検出する
- X. Other (please specify)

[Answer]: A. plugin projection時にentrypointから相対importを再帰走査し、manifest/bundle/ownedPathsの欠落をfail-closedにする汎用guardを追加する（推奨）

- 人間承認: 2026-08-04T14:13:48Z

## 回答確認

- Q1: RA applicability + 独立plugin authoring stageのhybrid構成
- Q2: stable ID単位のcanonical content digest + sorted aggregate digest
- Q3: content-addressed bundle + model-map atomic replace
- Q4: projection時の再帰import-closure guard

- A. この内容で設計成果物を生成する
- B. 回答を変更する
- X. Other (please specify)

[Answer]: A. この内容で設計成果物を生成する

- 人間承認: 2026-08-04T14:18:56Z

## 上流トレーサビリティ

- `inception/requirements-analysis/requirements.md`
- `codekb/amadeus/architecture.md`
- `codekb/amadeus/component-inventory.md`
- team-practices: `memory/team.md`、`memory/project.md`、`memory/phases/inception.md`
- Primary Issue: [#2161](https://github.com/amadeus-dlc/amadeus/issues/2161)
