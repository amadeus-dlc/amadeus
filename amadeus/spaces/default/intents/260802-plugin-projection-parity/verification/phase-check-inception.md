# Phase Check — Inception（plugin-projection-parity）

検証日時: 2026-08-03T00:47:33Z  
検証者: conductor  
検証断面: `a8e1ce025a918310ab7d803270bb6fc6b649c598`（`origin/main` から6コミット遅れ。ユーザー指示により本境界承認後・Code Generation前にrebaseする）

## 実行ステージと成果物

self-fixスコープのInception実行集合はReverse EngineeringとRequirements Analysisである。User Stories、Application Design、Units Generation、Delivery Planningなど他のInceptionステージはscopeによりSKIPされている。

| ステージ | 成果物 | 検証結果 |
|---|---|---|
| Reverse Engineering | CodeKB 9成果物 + `re-scans/260802-plugin-projection-parity.md` | 10/10が実在し非0バイト。ユーザー承認済み |
| Requirements Analysis | `requirements.md` + `requirements-analysis-questions.md` | 2/2が実在し非0バイト。Product Lead review iteration 2がREADY |

合計12/12成果物の実在を機械確認した。

## トレーサビリティ

- **Issue → Intent**: [Issue #2018](https://github.com/amadeus-dlc/amadeus/issues/2018) の再オープン理由である「各ハーネスのplugin関係ファイルがコミットされず、fresh worktreeの初回利用とGit cleanlinessを満たさない」をself-fix Intent `260802-plugin-projection-parity` の目的へ固定した。
- **Intent → Reverse Engineering**: `re-scans/260802-plugin-projection-parity.md` とCodeKB 3主要成果物が、Claude面だけにtracked projectionがあり、Codex／Cursor／OpenCode／Kimi面に同等surfaceがないこと、Codex runnerの正規先が `.agents/skills` であること、packageとself-installの所有境界が断線していることを確定した。
- **Reverse Engineering → Requirements**: `requirements.md` のFR-1〜FR-7は、選択設定、5 self-install面、7 package面、Codex固有destination、startup verify-or-repair、promotion owner、既存runtime repair維持へ対応する。REで確定していない新規harnessや新規plugin機能は導入していない。
- **Requirements → Acceptance**: AC-1〜AC-6が、fresh checkoutで初回利用可能、startup後Git clean、Codex正規配置、欠損時だけcurrent harnessを修復、package未選択baseline、drift guard検出をGiven/When/Thenで固定した。
- **Requirements → Construction**: Verification requirementsがtable-driven unit、fresh Git fixture、全self-install面E2E、Kiro package negative、failure/rollback、既存回帰、package/promotion/full CIをCode GenerationとBuild and Testへ引き渡す。

User Storiesと設計系ステージはself-fixスコープでSKIPのため、それらの成果物を捏造していない。要求は既存のCodeKB architectureとcode-structureへ直接遡り、実装先と検証面が未割当の孤児要件はない。

## 品質ゲート

- `required-sections`、`upstream-coverage`、`answer-evidence` は適用対象のRequirements Analysis成果物でPASSED。自Intent監査シャードにRequirements Analysisの `SENSOR_FAILED` は0件。
- Product Lead review iteration 1はreviewer実行環境にread-only readerがなくNOT-READY。成果物本文を同一scopeで搬送して再実行し、iteration 2はREADY。
- iteration 2の非阻害FOLLOW-UPは、FR-4/NFR-3のfailure診断・rollback・unmanaged-file保護とFR-6のorphan/misplacement検出をConstructionのtest inventoryへ明記すること。Code Generationの検証計画へ引き継ぐ。
- §13 learning: Reverse Engineeringで同じ境界をproject ruleへ保存済みのため、Requirements Analysisは0件。自動ソロ選挙 `E-RA-2072-LEARNINGS-1` は2票ともGoA 1で「0件で可」を成立・記録済み。
- formal-model-checkの `never-run` はplugin availabilityとは別の任意advisoryであり、本self-fixのInception成果物を阻害しない。startupやstage開始時にTLCを自動実行しない要件を維持する。

## 整合性と警告

- 訂正前の旧Intent `plugin-optin-parity` はruntime自動導入を正常経路として扱っていたため、要件の正本として流用していない。既存の有効なruntime repairだけをFR-7で補助経路として継承した。
- packageのplugin未選択baselineと、Amadeus self-repositoryの選択済みdogfood projectionを分離しており、配布先へself-repositoryの選択を強制しない。
- 検証断面は `origin/main` から6コミット遅れている。ユーザーのrebase指示に従い、Construction開始前に全差分を保全してrebaseし、競合があれば要件境界を維持して解消する。

## Human approval

- [x] Requirements Analysis成果物を承認し、Inception境界検証後にConstructionへ進む（ユーザー回答 `1`、2026-08-03）

## 判定

Inceptionの実行対象2ステージは、成果物実在、上流トレーサビリティ、センサー、reviewer、§13 learningの完了条件を満たす。`origin/main`へのrebaseをCode Generation開始前に実施する条件で、Constructionへ進行可能。
