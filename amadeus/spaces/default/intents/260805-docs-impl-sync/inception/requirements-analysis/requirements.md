# Requirements — docs-impl-sync (260805)

上流入力(consumes 全数): intent-statement.md、business-overview.md、architecture.md、code-structure.md

- `intent-statement.md` — 問題定義・成功指標・スコープ指標を FR/制約の導出元とした(§ Intent 分析、§ 制約)
- `business-overview.md` § docs と実装の同期の業務境界 — 対象読者 3 層と docs 面の業務境界を FR の分類軸に使用(§ 機能要件)
- `architecture.md` § docs と実装の同期構造 — docs ガード群と CI 経路の構造を NFR-3/FR-6 の根拠に使用(§ 非機能要件)
- `code-structure.md` § docs 面の患部配置 — 患部ファイルの配置と修正対象面の列挙に使用(§ 機能要件 FR-1〜FR-5 の対象面)

乖離の全数列挙は `codekb/amadeus/re-scans/260805-docs-impl-sync.md`(正本)、重大度付き目録は `code-quality-assessment.md` § docs 品質に依拠する(observed `1043b7e67`)。裁定は `requirements-analysis-questions.md` の Q1〜Q5(AUTO_DECIDED、grant `intent-grant-d7bbea44ff43fae65262e848d5c4d0fc`)。

## Intent 分析

ユーザーの目的は「ドキュメントを実測で裏付けられた状態へ戻す」こと(intent-statement.md § Problem Statement)。単なる字面修正ではなく、(1) 実装コードと git 履歴を一次証拠として README*.md + docs/ 全域を observed 断面と照合し、(2) 検出乖離の全件を修正し、(3) 実装済みだが未記載の機能の文書を補い、(4) EN/JA 対訳を同一変更で同期する、の 4 点が達成条件。前回 intent 260727-docs-impl-sync の成果物は git 上の正本を参照入力とする(コピーしない — intent-capture Q7=A)。

## 機能要件

対象 observed: `1043b7e67857494f38a4c9020709528e859c641b`。件数はすべて RE 実測からの転記。

### FR-1: クラス A(件数語・実体列挙の不一致 11 件)の全件是正 — 裁定 Q1=B

隣接列挙原則(`cid:functional-design:c3-adjacent-enum-numerals`)に従う: 同一文書内に列挙(表・一覧)が隣接する箇所のみ実値(スコープ 15、センサー 8 等)へ更新し、隣接列挙のない散文の件数語は count-free 表現へ置換する。対象は A-1〜A-11(A-10 の凍結レポート面は FR-4 の扱いに従う)。A-8(37 runner descriptions)は数値の置換ではなく「件数語の除去または母集団の明記」で是正する(RE の Developer scan 訂正 4)。

受け入れ基準: A-1〜A-9・A-11 の各所在(EN/JA 両面)で、実値更新か count-free 置換のいずれかが適用され、残存する誤件数語が対象面 grep で 0 件であること。grep 述語は修正対象面(docs/ + README*.md)に限定し、codekb・record の記録面を含めない(`cid:requirements-analysis:c1-ac-grep-surface-scope`)。

### FR-2: クラス B(配布境界 3 件)+ クラス D の実体誤り(D-1〜D-4、D-7〜D-9)の全件是正

- **FR-2a(Critical)**: `README.md:84` / `README.ja.md:84` の Kimi Code 前提「≥ 0.28.1」を実ハードフロア 0.29.0(`amadeus-utility.ts:1181` `MIN_KIMI_VERSION = [0, 29, 0]`)へ是正する。
- **FR-2b**: `pi` ハーネスの欠落 3 面(B-2 / B-3 / D-2)と README バッジ 2 枚欠落(A-9: Kimi Code / Pi)を是正し、ハーネス列挙を 8 面で一致させる。
- **FR-2c**: `docs/reference/07-sensor-system.md` + JA の `dist/claude/.claude/sensors/` 参照 6 箇所を正本パス(`packages/framework/core/sensors/`、または self-install の `.claude/sensors/`)へ是正する(B-1)。
- **FR-2d**: `docs/README.md:9` / `docs/README.ja.md:5` の「4 ハーネス」記述を現行 8 ハーネスへ是正する(D-4)。
- **FR-2e**: `README.ja.md:7` の version バッジ 0.1.3 を EN と同値(0.1.7)へ是正する(D-3)。バッジ同期機構(`release-version-sync-plan.ts:26` が EN のみ)の是正は FR-6 の Issue 起票対象。
- **FR-2f**: `docs/guide/12-cli-commands.md` Quick Reference へ live help 実出力にある未掲載 verb 系統(`intent` / `space` / `space-create` / `codekb-path` / `plugin`)を追記する(D-7)。
- **FR-2g**: `docs/guide/17-skills.md` のスキル列挙へ `/amadeus-compose` / `/amadeus-election` / `/amadeus-upstream-sync` を追記する(D-8)。
- **FR-2h**: `docs/reference/12-state-machine.ja.md` へ EN `:398-399` の 2 イベント(`AUTO_DECISION_REVIEWED` / `INTENT_COMPLETION_TRANSACTION_COMMITTED`)を反映し、EN/JA の意味内容を同期する(D-9)。

受け入れ基準: 各項の所在で修正後の値が実装実測値と一致すること(検証コマンドは各修正 PR に実出力を添付)。

### FR-3: クラス C + F-1(self-* 4 スコープのユーザー向け解説)— 裁定 Q2=B

一般スコープ(11)と自己開発スコープ(self-* 4)を分離して解説する。`docs/guide/05-scopes-and-depth.md` は一般スコープの章とし、self-* は「Amadeus 自体を開発する場合」の専用節または専用章(EN/JA 対)として新設、05 章・17 章・harness-engineering/04 章から参照する。件数語は FR-1 の隣接列挙原則に従う。

受け入れ基準: (1) `grep -rln "self-feature\|self-document\|self-refactor\|self-fix" docs/guide/` のヒットに解説実体(H2/H3 節を持つ本文。命名注記のみは不可)を含むファイルが EN/JA 対で存在すること。(2) 15 スコープ全名について `grep -l "<scope名>" docs/guide/05-scopes-and-depth.md <self-*解説ファイル>` がスコープごとに 1 ファイル以上ヒットし、かつ解説ファイルが `docs/README.md` または `05-scopes-and-depth.md` からのリンク(`grep -n "<ファイル名>"` で実在確認)で到達可能であること。

### FR-4: 凍結記録の扱い — 裁定 Q3=B

- `docs/research/upstream-sync/**`(A-10 / D-5): 内容不変。各レポートヘッダへ「調査時点の凍結スナップショットであり現況を反映しない」旨の注記を追記する(既存の鮮度宣言があるものは強化)。
- `docs/amadeus-files.md`(D-6): 現況(observed)へ更新し、`docs/README.md` からリンクする(F-10 同時解消)。

受け入れ基準: (1) `docs/research/upstream-sync/` 配下の各 `.md` レポート冒頭 10 行以内に「凍結」または「frozen」を含む注記行が存在し(`head -10 <file> | grep -c "凍結\|frozen"` ≥ 1)、かつ注記行以外の内容バイトが変更前と一致すること(`git diff` が注記行のみを示す)。注記の必須要素は (a) 凍結スナップショットである旨 (b) 調査時点の ref または日付 (c) 現況を反映しない旨、の 3 点。既存の鮮度宣言がある場合の「強化」とはこの 3 要素が揃っていない宣言へ欠落要素を追記することを指す。(2) `docs/amadeus-files.md` の更新内容が更新時点の実測(`ls` / `find` の実出力転記)と一致し、`grep -n "amadeus-files" docs/README.md` が 1 件以上ヒットすること。

### FR-5: 欠落文書 10 件(クラス F)の全件充足 — 裁定 Q4=A(intent-capture Q4=B の執行)

F-1(FR-3 で充足)に加え:

- **F-2**: TLA+ authoring / evidence store CLI(`tla-authoring.ts` / `tla-evidence.ts`)の解説 — plugin 章(19-plugins)または formal-model 章(21/22)への節追加、EN/JA 対。
- **F-3**: plugin import-closure guard(`scripts/import-closure-guard.ts`)— 19-plugins / 11-contributing への節追加。
- **F-4/F-5**: Intent autonomy 自動裁定 review surface(`amadeus-autonomy-review*.ts`)と Intent completion seal(`amadeus-intent-completion.ts`)— reference 章(12-state-machine 隣接または新章)。
- **F-6**: `amadeus-harness-registry.ts` — 最小限の言及(所属章への 1 節)。
- **F-7**: advisory 選択の受理経路(`amadeus-advisory-choice.ts`)— 12-state-machine または 07-sensor-system 隣接への節追加。
- **F-8**: `docs/harness-engineering/live-e2e.ja.md` の新規作成(EN と同期)。
- **F-9**: `live-e2e.md` を索引(`docs/README.md` または harness-engineering 索引)からリンクする。
- **F-10**: FR-4 で充足。

規模の按分(専用章か既存章への節か)は functional-design で確定する。新章の章番号は PR 発行直前とマージ直前に origin/main 実測で再確認する(`cid:code-generation:shared-ledger-insert-collision` 追補)。

受け入れ基準: F-1〜F-10 の各項目について、(1) 充足面の実在 — F-1〜F-7 は対象実装の識別子(`tla-authoring` / `tla-evidence` / `import-closure-guard` / `autonomy-review` / `amadeus-intent-completion` / `harness-registry` / `amadeus-advisory-choice`)ごとに `grep -rc "<識別子>" docs/ README.md README.ja.md` が EN/JA 両面で 1 以上になり、ヒット箇所が利用者向け解説実体(1 行のイベント表記載のみは不可 — 目的・使い方・関連機構を含む節)であること。F-8 は `docs/harness-engineering/live-e2e.ja.md` の実在と EN との節構成一致(`grep -c '^## '` の一致)。F-9 は自己言及を除く `grep -rn "live-e2e" docs/README.md docs/harness-engineering/` のヒット 1 以上。F-10 は FR-4 (2) で判定。(2) 各文書の内容が実装の実測(コマンド実出力・file:line)から転記されていること(NFR-3)。判定は functional-design が項目別に精密化してよいが、この基準を下回る緩和は `cid:build-and-test:no-silent-scope-narrowing` により不可。

### FR-6: ガード構造的盲点(G-1 / G-2)と実装バグの Issue-first 起票 — 裁定 Q5=B

本 intent では実装コードを変更しない。次を Issue-first で起票する(種別判定は `cid:requirements-analysis:issue-type-decision` の完了条件順): (1) G-2 glossary 検査の実 corpus 未配線(bug または enhancement — 完了条件判定に従う)、(2) D-3 構造因 = version バッジ同期・ガードの EN 限定(enhancement)、(3) G-1 docs-only PR の CI skip 経路(documentation または enhancement — 裁定は起票時)。D-9 構造因(t48 等の EN 限定)は (2) と同族として同一または別 Issue で起票する。

受け入れ基準: (1) 上記 3 系統(D-9 構造因の同梱/分離は起票時判断)それぞれについて GitHub Issue が作成され、Issue 番号が build-and-test 成果物(または code-summary)へ記録されていること。(2) 各 Issue が起票前重複検索(`gh issue list --state all` — `cid:requirements-analysis:pre-filing-dup-and-branch-check`)を経ており、種別 1 + 優先度 P 1 のラベルを持つこと(`gh issue view <n> --json labels` の実出力で確認)。(3) 本文が共通契約 6 節(`cid:requirements-analysis:issue-canonical-body`)を満たすこと。

## 非機能要件

- **NFR-1(EN/JA 同期)**: 修正・新規作成するすべての文書は EN/JA を同一変更(同一 PR)で同期する(project.md ALWAYS「paired English/Japanese documentation in the same change」)。
- **NFR-2(検証の正)**: G-1 により docs-only PR では CI テスト層が skip されるため、docs 消費ガード(t174 / t132 / t48 / t52 / t287 / t291 / t-pi-docs-contract)の検証は**ローカル実行を正**とし、実行コマンドと exit code を成果物に記録する(`cid:requirements-analysis:numbers-from-command-output-only`)。codekb G-1 の「docs 消費ガード全数」からの除外 2 本の理由: t414 は実 corpus(実ファイル)を読まないため実行しても本 intent の変更を検査しない(G-2 の実測 — `code-quality-assessment.md` § G-2)、t68(version badge sync)は `README.md`(EN)のみを対象とし JA 非対象(D-3 構造因)だが README.md はローカルで `bun test tests/unit/t68-version-changelog-sync.test.ts` により検証に含める。
- **NFR-3(実測原則)**: 修正で書き込む数値・file:line・コマンド名はすべて実行時点の実出力からの転記とし、記憶起草しない。件数語は隣接列挙原則で構造的陳腐化を防ぐ。
- **NFR-4(凍結記録の不変)**: FR-4 が凍結指定した記録の内容バイトを変更しない(注記ヘッダの追記のみ)。

## 制約

- 実装コード(`packages/`、`scripts/`、`tests/`、`.github/`)の変更禁止 — intent-statement § Initial Scope Signal の既決。発見した実装バグは FR-6 の Issue 起票のみ。
- 対象は `README*.md`(ルート)+ `docs/` 全域。`amadeus/` 配下の workspace 文書・`.claude/` 配下の framework 内部文書は対象外(乖離発見時は Issue 起票のみ)。
- リリース面(version バッジの機構、CHANGELOG)には触れない — バッジ値の是正(FR-2e)は文書側の値の同期であり、同期機構の変更は Issue 起票へ回す。
- コミットメッセージは英語、GitHub Issue/PR は日本語(team.md 既決)。

## 前提

- observed `1043b7e67` の RE 実測(乖離 32 件 / 欠落 10 件 / 盲点 2 件)を修正対象の確定目録とする。実装が本 intent 実施中に前進した場合は、再接地時に対象面の実 diff で目録を再確認する(`cid:code-generation:base-advance-regrounding`)。
- 前回 intent 260727-docs-impl-sync の FD 裁定(BR-2 隣接列挙原則)は現行ノルムとして再適用可能(project.md に persist 済み)。
- docs 総数 209(EN 105 / JA 103 / 非 md 1)は RE 実測。新規文書の追加で変動する。

## スコープ外

- 実装コード・CI・スクリプトの変更(G-1/G-2 の是正、バッジ同期機構の JA 対応、対訳ガードの一般化)— FR-6 で Issue 起票。
- `amadeus/` workspace 文書・`.claude/` framework 内部文書の修正。
- `docs/research/upstream-sync/**` の内容更新(凍結維持 — FR-4)。
- 翻訳の一括品質改善キャンペーン(乖離修正・新規作成に伴う対訳同期のみ行う)。

## 未解決事項

- F-2〜F-7 の各文書の粒度(専用章 vs 既存章への節)と新章の章番号 — functional-design で確定。
- FR-6 の各 Issue の種別確定(完了条件判定)— 起票時に確定。
- RE が未確定として残した 3 点(core tools 件数 116→119 の +3 不整合、docs/README.ja.md の Upstream 節逐語照合、harness annex 差分詳細)— 本 intent の修正作業中に該当面へ触れる場合のみ解消し、それ以外は持ち越す。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-05T09:31:06Z
- **Iteration:** 1
- **Scope decision:** none

トレーサビリティ・引用実在・裁定証跡・必須7節は実測確認済みだが、FR-4/FR-5/FR-6 に明示の受け入れ基準が欠落(特に FR-5 は合否判定手段なし)のため是正まで NOT-READY。

### Findings

- BLOCKER | requirements.md FR-5(欠落文書10件)に受け入れ基準が存在しない — F 各項目の完了判定手段(EN/JA 両面の実参照 grep 等)を RA 段で定義すること(requirements.md:50-63、対照 FR-1 :24 / FR-2 :37 / FR-3 :43)
- FOLLOW-UP | FR-4(凍結注記の必須要素・強化基準)と FR-6(起票完了の確認方法)にも受け入れ基準行がない(requirements.md:45-48 / :65-67)
- NIT | FR-3 の「15 スコープすべてが到達可能」の判定コマンドが未記載(requirements.md:43)
- NIT | NFR-2 のガード列挙が codekb G-1 の全数(+t414)と不一致で除外理由(t414 実 corpus 未配線 / t68 JA 非対象)が未転記(requirements.md:72、対照 code-quality-assessment.md:187,190)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-05T09:43:02Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の4指摘(FR-5=BLOCKER ほか)はすべて具体的な grep/コマンド述語として是正済みで閉包確認。是正 diff の識別子・件数・除外理由は code-quality-assessment.md の一次記録と逐語整合し、新たな誤引用・数値誤りは検出されなかった。

### Findings

- None
