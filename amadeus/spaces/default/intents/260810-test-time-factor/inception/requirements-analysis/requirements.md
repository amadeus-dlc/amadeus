# TEST_TIME_FACTOR 要件

## 意図分析

CI の処理能力がローカルより低い場合でも、テスト用 timeout が実処理の完了前に発火しないようにする。基準時間はローカルの値を保ち、環境変数 `TEST_TIME_FACTOR` で環境ごとに一貫して拡張する。

## 入力と根拠

- ユーザー指示: ローカルは係数 `1`、CI は能力に合わせて `2` または `3`、`sleep(500 * testTimeFactor)` のように基準値を乗算する。
- `business-overview.md`: CI 能力差と固定 timeout による失敗を記録する。
- `architecture.md`: workflow env →係数 resolver → runner/test wait の未接続境界を記録する。
- `code-structure.md`: `tests/lib/run-tests-args.ts`、`tests/run-tests.ts`、TUI/IDE driver、CI workflow を変更候補として記録する。

## 機能要件

### FR-1: 係数の解決

`TEST_TIME_FACTOR` 未指定時は `1` を解決し、指定時は `1` 以上の有限の数値として解決する。`1` 未満、空文字、`NaN`、無限大、非数値は黙って `1` に変換せずエラーにする。

受け入れ確認: 未指定、`1`、`2`、`3`、`0.5`、`0`、負数、非数値をユニットテストし、`1` 以上だけが解決される。

### FR-2: 基準 timeout の乗算

共通 helper はミリ秒の基準値に解決済み係数を乗算し、timeout API に渡せる正の有限値を返す。小数結果は元より短くならないよう切り上げ、乗算結果が非有限または safe integer 範囲外になる場合はエラーにする。

受け入れ確認: 係数 `1` で基準値不変、`2` で二倍、小数係数で切り上げによる短縮なし、overflow 入力でエラーをテストする。

### FR-3: テスト runner timeout の係数化

`tests/run-tests.ts` が Bun child へ渡す timeout は、既定値と `--test-timeout-ms` で指定した値のどちらも基準値として係数化する。`--test-timeout-ms` は最終値 override ではない。現行の引数検証と suite/perf/coverage 選択契約は保持する。

受け入れ確認: 係数 `2` で既定 `30_000ms` が `60_000ms`、明示 `45_000ms` が `90_000ms` として child へ渡る。

### FR-4: テスト内 timeout の係数化

`bun:test` の test timeout、test harness の deadline、テストが起動する child process の timeout など、テスト完了を待つための timeout 基準値に共通係数を適用する。`AMADEUS_TEST_TIMEOUT` など個別 live test が最終値として明示する override は再乗算しない。個別ファイルが環境変数を直接 parse する二重実装は作らない。

受け入れ確認: 代表的な unit/integration/e2e/harness の各境界で、係数 `2` が timeout API に渡る基準値を二倍にし、明示最終 override はそのまま使う。

### FR-5: timeout に対応する待機値の係数化

timeout を構成・検証する `sleep`、poll interval、settle wait は、`sleep(500 * testTimeFactor)` と同等に基準値へ係数を適用する。timeout と待機値の大小関係を変えず、テストの成功/失敗意味論を保持する。

受け入れ確認: lock concurrency、IDE checkpoint、TUI/IDE driver の代表値が係数 `1` で不変、`2` で二倍になる。

### FR-6: CI の既定係数

GitHub Actions のテスト実行環境は `TEST_TIME_FACTOR: "2"` を明示する。通常 CI、coverage head/base、PBT、release のテスト経路で同じ値を使い、入口ごとの設定漏れを許容しない。

受け入れ確認: workflow 契約テストが全対象 workflow の係数 `2` を観測する。

### FR-7: 意図的な時間契約の除外

性能回帰を測る wall-clock 閾値、timeout 発火そのものを作る slow/hang fixture、ISO 時刻境界を跨ぐことが目的の sleep、本番 CLI の timeout 契約には係数を適用しない。除外は分類根拠が読める形で保つ。

受け入れ確認: perf suite と代表 slow fixture の基準値が係数 `2` でも不変である。

### FR-8: 回帰防止と利用契約

実装トレース: `FR-8` の機械検査は `tests/lib/test-time-factor-guard.ts` が所有する。

共通 helper、runner、代表的な timeout/wait、workflow 配線をテストし、新しいテスト用 timeout を追加する際の利用契約を testing reference に記載する。機械検査は `tests/smoke`、`tests/unit`、`tests/integration`、`tests/e2e`、`tests/harness`、`tests/lib` の timing sink（test timeout、process timeout、deadline、`sleep`/poll/settle）を走査し、共通 helper 未適用の固定値を失敗にする。

除外は repository 内の allowlist にパス、timing sink、FR-7 に基づく理由を記録する。未分類の固定値、存在しない allowlist パス、重複エントリ、理由空欄は検査失敗にする。

受け入れ確認: 共通 helper 未適用の fixture を1件挿入すると機械検査が失敗し、理由付き allowlist または helper 適用後に通過する。併せて対象テスト、typecheck、lint、source-only check とドキュメント/API 一致を確認する。

## 非機能要件

- **NFR-1 後方互換性**: 未指定時は係数 `1` とし、ローカルの現行時間契約を変えない。
- **NFR-2 決定性**: 同じ基準値と係数は、呼び出し箇所に依らず同じミリ秒値を返す。
- **NFR-3 診断可能性**: 不正値は変数名と値の不正を識別できるエラーにする。
- **NFR-4 保守性**: parse と scale は共通 module に集約し、個別テストへ環境解決ロジックを複製しない。

## 制約

- Bun-only TypeScript monorepo の既存 test runner と GitHub Actions を使う。
- source of truth はテスト支援コードと workflow であり、`dist/` や self-install 生成面を手編集しない。
- テストの意味論を変える一括置換は行わず、timeout 用途の分類を伴わせる。

## 前提

- CI の既定係数 `2` はユーザーが推奨案として確定した。
- 係数 `3` はさらに低速な実行環境が workflow または実行時に override する選択肢として残る。

## スコープ外

- 本番 Amadeus CLI の timeout 値変更
- perf suite の性能閾値緩和
- timeout と無関係な sleep の一括置換
- `AMADEUS_TEST_TIMEOUT` など既存個別 override の削除

## 未解決の質問

なし。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T14:44:57Z
- **Iteration:** 1
- **Scope decision:** none

Minimal depth の8 FR、CI 係数2、timeout と対応する sleep/poll/settle の同率拡張、性能閾値・slow fixture・本番 timeout の除外は、ユーザー回答および上流資料と概ね整合しているが、3件の契約を明確化する必要がある。

### Findings

- BLOCKER | FR-1 は有限の正の数値をすべて許可するため1未満の係数で基準 timeout/wait を短縮できる。係数を1以上に限定し境界値の受け入れ確認を追加する必要がある。
- BLOCKER | FR-3/FR-4 と architecture.md の間で明示 override の分類が不足している。--test-timeout-ms は係数化し、AMADEUS_TEST_TIMEOUT など最終値 override は係数化しない契約を明示する必要がある。
- BLOCKER | FR-8 の固定 timeout 残存検出には走査対象、除外記録、失敗条件がなく、QA が成否を判定できない。未分類固定値で失敗する機械検証契約を定義する必要がある。
- FOLLOW-UP | FR-2 は baseMs と factor の積が非有限値になる overflow 時の挙動と受け入れ確認を追加すると境界契約が明確になる。
- NIT | FR-8 の受け入れ確認にある誤記は修正する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T14:48:02Z
- **Iteration:** 2
- **Scope decision:** none

前回の3件のBLOCKERはすべて閉包しました。FR-1/FR-2で係数1以上、境界値、overflow時のエラーを定義し、FR-3/FR-4で基準値と最終overrideを区別し、FR-8でtiming sinkの走査範囲、理由付きallowlist、失敗条件、失敗fixtureをテスト可能な契約として明示しています。Minimal depthの8 FR契約も維持されています。

### Findings

- NIT | FR-8の受け入れ確認にある「対象テス」は、前回指摘どおり「対象テスト」へ修正してください。READY判定を妨げる欠陥ではありません。
