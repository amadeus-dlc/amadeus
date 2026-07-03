# 業務概要：amadeus

## 概要

Amadeus は、AI と人間が協調してソフトウェア開発を進めるライフサイクル契約「Amadeus DLC」を運用するプロジェクトである。
AI-DLC v2 と意味論互換の 3 phase 22 ステージ（Ideation、Inception、Construction）を、agent skill、テンプレート、validator、日本語 Markdown 成果物として提供する。

利用形態は 2 つある。

- 配布先 workspace での利用。単一入口 `amadeus` skill が Intake とステージルーティングを行い、成果物を `.amadeus/` に置く。
- 自己開発。Amadeus 本体リポジトリの root `.amadeus/` を steering layer とし、Amadeus DLC で Amadeus 自身を開発する。

## 主要な業務フロー

1. **Intake と Birth**: 入力テーマを `amadeus` skill が判定する（継続、既存 Intent への合流、または人間承認付きの Birth 提案）。Birth は Intent のモジュールファイルと `state.json` を作り、`intents.md` 索引を再生成する。
2. **ステージルーティング**: `state.json`（schemaVersion 2）の `stages` と scope の実行対象から次ステージを解決し、対応する内部 skill（Ideation 7、Inception 8、Construction 7）へ委譲する。
3. **phase 境界**: phase の全ステージ完了後、phase PR の merge を確認して `phaseGates.<phase>` に approval evidence を記録し、phase を進める。
4. **Construction の Bolt 実行**: `bolt-plan.md` の順に Bolt を実行し、walking skeleton は必ず人間が承認する。
5. **検証**: `amadeus-validator` が workspace と Intent の構造を検証する。examples の生成と検査、e2e、eval が CI（`npm run test:all`）で回る。
