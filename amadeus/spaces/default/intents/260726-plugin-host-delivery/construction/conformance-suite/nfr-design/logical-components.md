# 論理コンポーネント — U7 conformance-suite

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions

## 実装モジュール構成

component-methods.md に C7 専用節は存在しない(N/A — C1 verb 表・C3 投影生成物・C4 フック契約・C5 doctor 行・C6 activation 面を**検証対象契約**として消費し、期待値はその契約文からの転記)。構成は `business-logic-model.md` フロー 1-4 からの導出:

| コンポーネント | パス | 内容 |
|---|---|---|
| 追跡表 | `tests/conformance/t188-trace.md` | 32 行+pin ヘッダ(reliability-design.md の様式) |
| 表の機械検査 | `tests/integration/`(新規テスト) | parse → 行数 32 / disposition 3 値 / n-a 根拠 / target 実在の assert |
| compose-semantics 層テスト | `tests/integration/`(t252/t253 の in-process fixture 様式を踏襲) | 合成意味論(set-union / 順序 / 冪等 / 衝突拒否 / BOM / fence / drops 分離) |
| per-harness 層テスト | `tests/integration/`(投影 — U3 と共有)+ `tests/e2e/`(native hook 実起動 — U4 と共有) | 追跡表から covered-existing 参照。新規は adopted 分のみ |
| レポート拡張 | 既存 upstream-sync レポート生成への `ConformanceReportSection` 追加 | suiteResult(exit code 写像の純関数)+traceCoverage(表 parse 再利用) |

新規 CI workflow・新規ランナー・新規依存は作らない(tech-stack-decisions.md — 既存 `tests/run-tests.sh` 4 層+`bun:test`)。

## 保証機構の層別

| 層 | 保証 | 対応 ID |
|---|---|---|
| 追跡表+機械検査 | 32/32 被覆・pin 固定・表が先 | `reliability-requirements.md` REL-U7-1/4 |
| テスト層(compose-semantics / per-harness) | 意味被覆・実起動・暗黙成功禁止・組合せ抑制 | `reliability-requirements.md` REL-U7-3、`scalability-requirements.md` SCALE-U7-1/2 |
| レポート層(純関数写像) | exit code 導出のみ・fail-closed | `reliability-requirements.md` REL-U7-2、`security-requirements.md` SEC-U7-2 |
| 隔離層(tempdir+project-root override) | 本番 record 非汚染 | `security-requirements.md` SEC-U7-1 |
| 計測手順 | CI 増分の実測転記・範囲宣言 | `performance-requirements.md` PERF-U7-1/2 |

## テスト層配置

fs を触る検証は integration 以上へ置く(team.md fs-tests-integration-first):

- **unit(純関数)**: 表 parser の行分類・`ConformanceReportSection` 写像(exit code → verdict、fixture 文字列のみ)
- **integration(実 FS)**: 表の機械検査(実ファイル読取)、compose-semantics fixture テスト、投影 per-harness テスト、レポートの落ちる実証(red 注入)
- **e2e(--ci 非対象)**: native hook 実起動(U4 と共有、scratch 隔離 — `security-requirements.md` SEC-U7-1)。CI 時間計測(`performance-requirements.md` PERF-U7-2)の対象外である旨は表ヘッダで宣言

## 障害分離(failure domains / blast radius / isolation / shared resources)

- **failure domains**: (1) **追跡表+機械検査面**(`tests/conformance/t188-trace.md` と表 parse・assert テスト — データと検査の対)、(2) **テスト実行面**(compose-semantics / per-harness 層 — tempdir+project-root override の隔離環境内で実行)、(3) **レポート拡張面**(`ConformanceReportSection` — exit code 写像の純関数+表 parse 再利用)。
- **blast radius**: テスト実行面の失敗(赤)は CI の合否に閉じ、隔離層(tempdir+project-root override — SEC-U7-1)により本番 record・workspace を汚染しない。追跡表の欠陥(行欠落・disposition 誤り)は「被覆しているつもりの未被覆」という偽の信頼を生む最大リスクだが、表の機械検査(行数 32 / disposition 3 値 / n-a 根拠 / target 実在の assert)が loud に遮断する(REL-U7-1/4)。レポート面の欠陥は upstream-sync レポートの表示に閉じる — suiteResult は実行 exit code からの純関数写像のみで、テスト結果そのものを改変できない(fail-closed — SEC-U7-2)。
- **component isolation strategy**: 実行環境の物理隔離(tempdir+project-root override)、レポートの純関数写像(実行結果以外を入力に取らない — 検証劇場の構造的排除)、既存ランナー 4 層への編入(新規 CI workflow・新規ランナーを作らず、障害調査面を既存 1 系統に保つ)、「表が先 → テストが後」の順序契約(暗黙成功の防止)。
- **shared resources**: **追跡表 `t188-trace.md`**(書込所有者 = U7。covered-existing 参照により U2-U6 の既存テストを読取参照)、**per-harness 層テスト**(投影テストは U3 と、native hook 実起動 e2e は U4 と共有 — 同一挙動のテストは 1 本に集約し二重実装しない)、**0-plugin baseline hash 比較**(U3 REL-U3-1 と共有)、**upstream-sync レポート生成**(既存機構への節追加 — 既存セクションの生成経路へ非干渉)。

(nfr-design Step 6 の必須内容 — U2 ND レビュー iteration 1 の同型 Major 指摘を本 unit へ先取り適用 2026-07-27。本 unit 自身のレビュー iteration ではない)
