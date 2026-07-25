# NFR Requirements Questions — harness-provenance

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## 前提

business-logic-model.mdとbusiness-rules.mdは、intent birth中の同期的な環境変数・文字列・最大5候補のfilesystem存在判定だけを追加し、外部I/Oやnetworkを導入しない。requirements.mdは後方互換性とセンサー非干渉を要求する。technology-stack.mdの既存Bun/TypeScript/Biome/test/dist検査を維持し、新規runtime dependencyは不要である。

## Q1. 性能・スケーラビリティ目標をどう固定するか?

[Answer]: A — 架空のwall-clock SLOを置かず、O(1)・外部I/O/networkなし・CWD probe最大5回・birthあたり判定1回・非env resolutionのprocess cacheを構造的上限とする（ユーザー指示: コード生成まで推奨、2026-07-25）

- A. 架空のwall-clock SLOは置かない。検出をO(1)、外部I/O 0、network 0、CWD probe最大5回の`existsSync`、intent birthあたり判定1回、非env resolutionはprocessあたり1回cacheという構造的上限で固定する。既存test suiteのtimeout・CI所要時間を悪化させないことをregression基準にする（推奨）
- B. intent birth全体へ新規の固定ミリ秒SLOを設定する。数値は明確だが、現行baselineと実行環境差の測定根拠がない
- C. 性能要件なしとする。実装は単純だが、filesystem probe・cache互換性の退行を検出できない
- X. Other

## Q2. env由来データのセキュリティ境界は?

[Answer]: A — raw env値を永続化せず、正規化した7値HarnessTypeだけをstateへ記録する（ユーザー指示: コード生成まで推奨、2026-07-25）

- A. raw env値はログ・audit・stateへ保存せず、7値へ正規化した`HarnessType`だけをstateへ記録する。未知値・空値は`unknown`、credential/secretとして扱う新規データはなし。外部送信・追加権限・新規依存もなし（推奨）
- B. invalid overrideのraw値もstateへ残す。診断性は上がるが、任意環境文字列の永続化面を増やす
- C. env overrideを廃止する。入力面は減るが、承認済みFR-1 AC-1dを破る
- X. Other

## Q3. 信頼性・互換性の完了基準は?

[Answer]: A — unit/integration/全6配布形態/memory互換/CI/dist/self-install検査の全greenとunknownへのgraceful degradationを必須とする（ユーザー指示: コード生成まで推奨、2026-07-25）

- A. 新規stateのHarness exactly-one、既存HarnessなしV7の成功、全resolver分岐、全6配布形態のfresh-process AC-3d negative control、memory template不変、typecheck/lint/test/dist/self-install drift checkの全greenを必須とする。検出不能は`unknown`へgraceful degradationしbirthを継続する（推奨）
- B. unit testだけを必須とする。高速だが、配布経路・state生成・self-installの回帰を検出できない
- C. full repository E2Eだけを必須とする。広いが、resolver分岐の原因特定と決定性が弱い
- X. Other
