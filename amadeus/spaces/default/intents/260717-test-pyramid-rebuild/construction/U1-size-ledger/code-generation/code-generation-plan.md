上流入力(consumes 全数): HANDOFF.md, amadeus-state.md, requirements.md, unit-of-work.md, unit-of-work-story-map.md, business-logic-model.md, business-rules.md, domain-entities.md, frontend-components.md, performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, performance-design.md, security-design.md, scalability-design.md, reliability-design.md, logical-components.md, nfr-design-questions.md

# Code Generation 計画 — U1 サイズ分類台帳

## 計画状態

- 本ファイルは PART 1 の計画のみであり、全 Step は未着手である。
- User Stories stage はスコープ上 SKIP のため、架空の story ID は作らない。`unit-of-work-story-map.md` の U1「現状可視化」をユーザー価値の正本として追跡する。
- 対象 measurement ref は `3917a283a953165866170d235d3dc25ad2fd3643` とする。
- 承認前は再測定、`code-summary.md` 作成、application code・test・config の変更を行わない。

## 優先する実装境界

generic な code-generation 手順は application code と test files を要求する一方、承認済みの FR-7、U1 定義、HANDOFF、人間指示は、本 intent を「台帳データ + 消費契約の materialize」までに限定している。本計画では後者を優先し、`code-summary.md` を 442-row 台帳の正式 record とする。

PART 2 で追加する成果物は、次の1ファイルだけである。

- `construction/U1-size-ledger/code-generation/code-summary.md`: observedRef、tier×size matrix、全 ledger rows、consumer contract、再現・検証証跡

別の ledger JSON、生成スクリプト、adapter、extension point は作らない。

## 実行計画

- [x] **Step 1: スコープと測定対象を固定する**
  - `git rev-parse` / `git cat-file` の出力で対象 ref が実在する commit であることを確認する。
  - 保護対象（application code、`tests/`、runner、metrics collector、workflow、state/audit/memory）の開始時差分を read-only で記録する。
  - 証跡は repo 外の一時領域に置き、record へ推測値を先書きしない。
  - Trace: FR-1 AC-1b、FR-7、`measurement-ref-in-artifacts`。

- [x] **Step 2: exact ref の再現可能な read-only 測定面を用意する**
  - 対象 commit を repo 外の一時領域へ read-only export し、その tree の `tests/lib/test-size.ts` を唯一の分類源として使う。
  - 一時的な Bun stdin/eval コマンドで `tests/` を全域再帰し、永続スクリプトは作らない。
  - logical repository path、tests-root-relative tier input、containment/read 用 canonical target を分離する。
  - Trace: AC-1a、PERF-D1、SEC-D1、SCAL-D2/D3、LOG-D1/D2。

- [x] **Step 3: matrix と全 ledger rows をコマンド出力として採取する**
  - 各 `*.test.ts` を1回読み、既存 `classifyTestSize` と `parseSizeAnnotation` の結果だけから `file / tier / measured / declared / signals` を出力する。
  - file と matrix key は code-unit 昇順に固定し、tier は tests 直下第1階層由来の開いた集合とする。
  - `observedRef` は Step 1 のコマンド出力を転記する。
  - 442 行および matrix の数値・各 row は、測定コマンド stdout からのみ採用する。上流記載値を生成入力へハードコードしない。
  - Trace: FR-1 AC-1a/AC-1b、R1〜R5、PERF-D4、TECH-1/TECH-2。

- [x] **Step 4: 完全性・決定性を検証する**
  - `candidateCount = rows.length + readFailures.length`、matrix 合計 = rows.length をコマンドで検証する。
  - 同一 ref で2回測定し、正規化済み rows と matrix が byte-equivalent であることを比較する。
  - path/read failure は `incomplete`、重複・母集団確定不能・不変条件違反は `fatal` とし、complete に縮退させない。
  - complete でない場合は materialize を停止し、442 行を満たしたと報告しない。
  - Trace: REL-1/REL-2、REL-D1〜D3、SEC-D2、検証劇場禁止。

- [x] **Step 5: consumer contract の互換性を照合する**
  - matrix key `${tier}_${size}` を、既存 `scripts/metrics-snapshot.ts` の `test_pyramid` collector 出力と read-only に比較する。
  - contract は `observedRef + rows + matrix`、row schema、開いた `Tier`、決定的順序、complete/incomplete/fatal の意味論を記録する。
  - collector 自体を変更・統合せず、現行 snapshot は形式参照にのみ使い、対象 ref の測定証拠に代用しない。
  - Trace: AC-1a、将来条件「消費側棚卸し」、R5、TECH-2、LOG-D2。

- [x] **Step 6: `code-summary.md` を正式 record として materialize する**
  - 冒頭に全上流入力、measurement ref、測定方法と complete verdict を記す。
  - コマンド出力から matrix と全442 rowを欠落なく転記し、再現コマンド・比較結果・consumer contract を同じファイルへ収める。
  - 数値、件数、row、verdict は実行結果と対応する stdout/exit code からだけ記録する。
  - 独立 ledger file や未配線 consumer API は作らない。
  - Trace: U1 目的/成果物/受け入れ基準、FR-1、U1「現状可視化」。

- [x] **Step 7: 既存検査で非破壊性を確認する**
  - 既存 classifier/drift tests と metrics snapshot の unit/integration tests を実行し、最終実行の command と exit code を記録する。
  - 台帳 row 数、matrix 合計、並び順、observedRef、collector-compatible key を一時 read-only validator で再検査する。
  - 新規 executable surface がないため E2E/performance/security test の新設は行わず、既存必須検査の省略根拠にはしない。
  - Trace: FR-7「既存グリーン維持」、Comprehensive Test Strategy、PERF-D4、REL-D2。

- [x] **Step 8: 最終 diff と Out 境界を検査する**
  - 開始時差分と比較し、本作業による変更が本計画と `code-summary.md` だけであることを確認する。
  - `tests/lib/test-size.ts`、`scripts/metrics-snapshot.ts`、`tests/run-tests.*`、tests、packages、CI、state、audit、memory が本作業で変わっていないことを検査する。
  - 実テスト移設、新分類器、生成スクリプト/CI恒常配線、collector consumer統合、tier-aware gate、#683配線、#1157 への変更が0件であることを記録する。
  - Trace: FR-7、HANDOFF 継承制約、LOG-D5。

## application code / test / config の適用判定

| generic 項目 | 判定 | 根拠 |
| --- | --- | --- |
| Business logic / API / repository / DB / UI | N/A | U1 の正式成果は既存純関数の測定出力を materialize する record。実装は承認済み Out |
| Application code | N/A | `buildLedgerRow` / `buildSizeLedger`、driver、consumer 統合、生成 script は後続 intent |
| 新規 unit test files | N/A | 新規 production behavior がなく、既存 classifier/drift test を再利用 |
| 新規 integration test files | N/A | collector は変更せず、既存 metrics snapshot integration test を再利用 |
| 新規 E2E test files | N/A | CLI、runner、endpoint、UI など新規 executable surface がない |
| Test configuration | N/A | Bun test 構成・runner を変更しない。既存設定で対象検査を実行 |
| Deployment / IaC / runtime config | N/A | ローカル record materialization であり infrastructure を持たない |

N/A は PASS を意味しない。新規ファイルを作らない代わりに、Step 7 の既存検査と一時 read-only validator の実測証拠を `code-summary.md` に残す。

## FR / AC トレーサビリティ

| 要求・既決設計 | 対応 Step | 完了条件 |
| --- | --- | --- |
| FR-1 / AC-1a | 2, 3, 4, 6 | exact ref の全域再帰測定から matrix + 全442 rowを正式 record 化 |
| FR-1 / AC-1b | 1, 3, 6 | observedRef と全数値/rowがコマンド出力に追跡可能 |
| FR-7 | 1, 7, 8 | 既存 green を確認し、application code・tests・runner・CI変更0件 |
| SizeLedger / R1〜R5 | 2, 3, 5, 6 | 既存分類器、row schema、開いた tier、`${tier}_${size}` を維持 |
| PERF-D4 / REL-D1〜D3 | 3, 4, 7 | 単一読取、決定的順序、完全性式、failure semantics を実測確認 |
| SEC-D1/D2 / SCAL-D2/D3 | 2, 4 | logical/canonical path を分離し、source・絶対 path を record へ含めない |
| LOG-D5 / HANDOFF Out | 8 | 禁止対象への本作業由来 diff がない |

## 承認待ち

この計画の承認後にだけ Step 1 から順に実行し、完了直後に各 checkbox を更新する。現時点では PART 2 を開始しない。
