# Requirements Analysis 質問票 — 260809-sensor-parseflags-failop

上流入力(consumes 全数): business-overview / architecture / code-structure(codekb — RE 断面の参照元として実読)。加えて RE 正本 `codekb/amadeus/re-scans/260809-sensor-parseflags-failop.md` と Issue #2741(クロスレビュー2名+REFRAME)を一次入力とする。

## 質問と裁定

4問すべて Intent autonomy `semi` の decide-question 梯子で裁定(AUTO_DECIDED・unreviewed — 後日 `list-auto-decisions` でレビュー可能)。仕様変更・ユーザー専権事項は含まない(#2741 は文書化済み欠陥への回復 = バグ修正クラス)。

### Q1. 修正スコープ(REFRAME 裁定事項 (a))

クロスレビューが確定した対象候補: T1 = budget 系3センサー(depth/question/nfr — 両アーム silent)/ T2 = scope-sizing 残渣(値なし任意フラグ)/ T3 = 偶然 loud の同型3本(answer-evidence / required-sections / pr-convergence-report-format — required-sections は `--templates-dir --template-eligible X` で完全偽 green)/ T4 = 意図宣言済み例外(upstream-coverage)/ T5 = 両アーム loud 実測済み(linter / type-check)/ T7・T7b = センサー外(実発現未実測)。

- A: T1 のみ(3本限定)
- B: T1+T2+T3(センサーの同欠陥クラス全数。T4 は意図尊重で除外、T5 は実測 loud のため対象外)
- C: B+T7/T7b(センサー外も含む)
- X. Other (please specify)

[Answer]: **B** — センサーの同欠陥クラスを全数封鎖(T1+T2+T3 = 7ファイル)。T4 は逐語コメントの意図宣言を尊重して除外(citation-semantics-check)、T5 は両アーム loud の実測により欠陥不在、T7/T7b は実発現未実測のため本 intent に含めず Open questions へ固定(issue-first-capture — 起票はユーザー判断)。根拠: bug-zero 系規範の同根全数棚卸し(same-root-inventory)がセンサー面では B を要求し、C は未実測の実発現調査で Minimal fix が肥大する。

### Q2. 実装方式(REFRAME 裁定事項 (b))

RE 実測: self-contained 制約は canonical 化の障害でない(cross-sensor import 前例6本、配布は coreDirs walk で自動)。house idiom(両アーム loud)は dispatcher 含む5本+t31 テストに既存。

- A: 共有ヘルパー — strict parse ヘルパーを既存センサー間 import の作法で1定義し、対象7ファイルが import(オプトイン — upstream-coverage は import しない)
- B: 各ファイルへ house idiom を複製(7重複)
- X. Other (please specify)

[Answer]: **A** — canonical 1定義+per-sensor オプトイン import。根拠: 構築フェーズ規範「複数箇所で消費される定数・列は canonical な1定義から導出」(construction.md Code Completeness)、nfr-budget→depth-budget の cross-import 前例(nfr-budget.ts:76)、B は7重複が将来の部分修正(#2534 型の非対称)を再生産する。配置は budget 系の作法に従い既存センサーファイルへ export(新規モジュールを立てるかは実装時の最小判断 — 逸脱ではない範囲)。

### Q3. ラベル・分類の維持(REFRAME 裁定事項 (c))

スコープ B でも発火経路非発現(dispatcher の対 push)は不変。

- A: bug / P3 / S4-MINOR を維持。origin:bootstrap は付与せず、required-sections 同型の bootstrap 遡及(reviewer-2 主張・未実測)は CG で実測して record に記録のみ
- B: S3 へ引き上げ+origin:bootstrap 付与
- X. Other (please specify)

[Answer]: **A** — 発火経路で到達不能な手動実行限定の欠陥は S4 の定義(軽微・エッジケース)に一致し、両レビュアーも S4 妥当で収束済み。bootstrap 遡及は CG の実測で確定し、確定したら record と Issue コメントに事実として記録(ラベルは主対象 = 非 bootstrap の複製クラスのため不変)。

### Q4. 落ちる実証の様式

- A: 各対象ファイルに in-process seam(`fail` export — t519:275-306 の既存様式)を移植し、値なし・フラグ値化の両アームをネガティブテストで固定+コーパス全数 sweep(正当引数列の緑側)
- B: spawn 経由の CLI テストのみ
- X. Other (please specify)

[Answer]: **A** — bun-coverage-spawn-blindspot(spawn は計測されない)と t519 既存様式の機械的移植。両側実証(赤: 2アーム×対象ファイル / 緑: dispatcher 経由の正当列+既存テスト全 green)を受け入れ基準に含める。

## 裁定の記録

- Q1〜Q4: Intent autonomy `semi` の decide-question 梯子で AUTO_DECIDED — 全問 `kind: decided / basisKind: agent-recommendation`(Q1=b-sensor-class / Q2=a-shared-helper / Q3=a-keep / Q4=a-inprocess)。reviewState = unreviewed — 後日 `amadeus-bolt list-auto-decisions` で人間レビュー可能
- 承認: 2026-08-09T14:20:00Z(semi 宣言の実 HUMAN_TURN — 「self-*スコープ, semiでお願いしたいな」— に基づく engine 権限での自動裁定)
