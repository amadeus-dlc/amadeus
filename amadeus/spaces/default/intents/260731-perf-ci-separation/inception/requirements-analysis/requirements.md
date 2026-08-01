# Requirements — 260731-perf-ci-separation

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices(N/A — 本 intent の scope(self-feature)では practices-discovery が SKIP のため team-practices 成果物はディスクに存在しない。チームプラクティスは memory 層(team.md / project.md)が ambient に適用されており、本要件の NFR-3(TDD 既定)と検証コマンド群(AC-5)はそこから導出している)

トレーサビリティ: 本要件は intent-statement.md の確定裁定4件(Q1=A/Q2=A/Q3=B/Q4=C)と Success Metrics、scope-document.md の In/Out 境界、および codekb(architecture.md / code-structure.md / business-overview.md の 260731-perf-ci-separation 節 = RE 実測)から導出する。実測引用の測定 ref は observed `da51af375`。

## FR-1: perf tier の新設(run-tests)

**要求**: `tests/perf/` ディレクトリを新しいテスト tier として新設し、実時間性能検証テストをそこへ移設する。

- FR-1a: `tests/run-tests.ts` の `Level` 型(現行 `tests/run-tests.ts:71` — `"smoke" | "unit" | "integration" | "e2e"`)に `"perf"` を追加し、`--perf` フラグで perf tier のみを実行できる
- FR-1b: `--ci` プロファイル(`:197-202` — smoke+unit+integration)は perf tier を**含まない**(変更なしの構造で自然に除外 — perf はディレクトリ tier のため)
- FR-1c: `--all` / `--release` は perf tier を**含む**(full profile の意味論維持)
- FR-1d: 既存 CLI 契約は byte-identical に維持する — `tests/smoke/t05-run-tests-parallel.test.ts` が pin する挙動(不正 `--parallel` → exit 2、サマリ様式等)を破らない
- FR-1e: 移設対象の選定基準: 「実時間(wall-clock / performance.now)に対する絶対または相対予算を assert し、かつ子プロセス spawn または大量反復で実測時間が支配的なテスト」。RE 実測による候補: `tests/integration/t258-lifecycle-transaction.test.ts`(予算 :491-492、timeout :529)、`t259-guard-corpus.test.ts`(:104-105、:121)、`t257-status-registry-migration.test.ts`(:200-201、:260)、`t269-amadeus-mirror-contract-policy-performance.integration.test.ts`(1ms/50ms 予算)、`t292-mirror-distribution-performance.integration.test.ts`、`t-plugin-stage-discovery-performance.integration.test.ts`(:33-35)。最終目録は design の実測棚卸しで確定(ファイル内に機能テストが同居する場合の分割可否を含む)
- FR-1f: **純粋・安価な述語ピンテストは blocking スイートに残す**: `tests/unit/latency-median-budget-gate.test.ts`、`tests/unit/plugin-discovery-overhead-gate.test.ts`(ゲート述語の落ちる実証 — 移設禁止)
- 受け入れ基準 AC-1: `bash tests/run-tests.sh --ci` の実行ファイル集合に tests/perf/ 配下が含まれない(runner 出力の実測)。`bash tests/run-tests.sh --perf` が移設全ファイルを実行し green。`--all` が両方を含む。t05 既存 assert 全 green

## FR-2: perf.yml の新設(非 blocking 定期実行)

**要求**: `.github/workflows/perf.yml` を新設し、性能検証を毎日1回の schedule + workflow_dispatch で実行する(Q1=A)。

- FR-2a: トリガーは `schedule`(cron、毎日1回。混雑回避のため 0分/30分を避けた off-peak 時刻を design で確定)+ `workflow_dispatch`。**注**: 本 repo に `schedule:` トリガーの前例は現存しない(RE 実測 — grep 0件)。非 blocking の先例は ci.yml `metrics-snapshot`(:475、ci-success の needs 外)と metrics-maintenance.yml
- FR-2b: 実行内容: (i) `bash tests/run-tests.sh --perf`(bun test 系 perf 層) (ii) `bun run distribution:benchmark`(3 replicas 相当)+ `bun run distribution:benchmark:aggregate`(Q2=A の移設先)
- FR-2c: PR blocking にしない — ci.yml の `ci-success` の needs に入れず、branch protection ruleset(18843917 — required check は「CI Success」のみ、2026-07-31 gh api 実測)にも追加しない
- FR-2d: main 上の失敗は workflow 失敗として loud に可視化する(GITHUB_STEP_SUMMARY への要約出力を含む)。自動 Issue 起票・通知連携は行わない(Q3=B)
- FR-2e: 各 job に timeout-minutes を明示する(無制限 job を作らない — 現行 distribution-benchmark の timeout 無指定を踏襲しない)
- 受け入れ基準 AC-2: workflow_dispatch での手動実行が green(全 perf テスト+benchmark 連鎖の完走)。ci-success の needs に perf.yml 由来 job が存在しない(yml 実読)

## FR-3: ci.yml からの性能検証の除去

**要求**: PR blocking パイプラインから実時間性能検証を除去する(Q2=A)。

- FR-3a: `distribution-benchmark`(:224、matrix 3 replicas)と `distribution-benchmark-aggregate`(:255)job を ci.yml から削除
- FR-3b: `distribution-release-gate`(:279)の PERFORMANCE_RESULT 検査を除去し、contract 検査(`distribution-contract`)のみ残す(gate job 自体の残置形態は design で確定)
- FR-3c: `tests` / `coverage-head` / `coverage-base` job は変更しない(FR-1 のディレクトリ移設により `--ci` から自然除外される)
- FR-3d: 検証の無音喪失禁止(P2): ci.yml から消える検証項目の全数が perf.yml に現れることを、移設前後の検証項目対照表(design 成果物)で機械照合する
- 受け入れ基準 AC-3: 移設後の ci.yml に benchmark 実行が存在しない(grep 実測 — 対象面は .github/workflows/ci.yml に限定。codekb・record 等の記録面は対象外)。ci-success の needs 集合が既存8項から不変

## FR-4: #1830 経路A の是正(t258 の 120s timeout)

**要求**: t258 のテスト全体 timeout(`:529` の `}, 120_000)`)を、ランナー機種差・負荷で偽赤にならない形へ是正する(Q4=C)。

- FR-4a: 是正後の timeout 予算は、クロスレビュー実測(Issue #1835 のコメント: 全 attempt 22断面の分布 — pass 91.2〜119.7s、fail 120.4〜122.1s、予算線が分布の内側)に対し、**観測分布の最大値に対する余裕(headroom)を明示した導出**とする。予算値と導出式・根拠データは実装コメントまたは design 成果物に記録する(cid:nfr-requirements:derived-value-shows-formula)
- FR-4b: 是正の方式(予算引き上げ / サンプル数削減 / タイミングシーム化)は design で確定する。方式選定は cid:build-and-test:bt-timeout-verification-shape(短縮可能なタイミングシームでの決定的検証を実時間待機より優先)を判断基準に含める
- FR-4c: 絶対 median 予算(500ms/750ms)の基準変更は**行わない**(#1830 経路B — スコープ外、別 intent)
- FR-4d: t257(:260 の同型 120_000)への波及は design で意識的に判断し、判断根拠を記録する(同根だが実測 28.6s = 予算の24%で崖にない — #1835 クロスレビュー実測)
- 受け入れ基準 AC-4: 是正後の予算線が観測分布(22断面)の外側にあり、headroom 導出式が成果物に実在する

## FR-5: coverage 整合の維持

**要求**: perf テスト移設後も coverage 系ゲートを green に保つ(検証劇場・無音劣化なし)。

- FR-5a: `tests/gen-coverage-registry.ts` の tier 列挙(`:771-774` — CLAIMS_TESTS_DIR/<tier> の disk 走査)に perf tier を追加し、移設ファイルの `covers:` claim が UNCOVERED へ落ちないこと(registry 再生成 + `--check` green)
- FR-5b(2026-07-31 ユーザー裁定で前提訂正 — 再カット不実施): 当初要件は baseline の同一 PR 再カットだったが、実装時実測で前提が不成立と判明 — baseline 40.9395% は #762 以来固定の床(ratchet でなく floor)で、移設後実測 88.3027% に対し 47.36pp の余裕があり「ゲート赤の構造的解消」は再カットなしで既に成立。ローカル機実測での床引き上げは機種差による無関係 PR の赤化リスクを生むため**再カットしない**(builder 申告 → walking-skeleton ゲートでユーザー承認。cid:code-generation:ruling-premise-closure-verification の要件前提面)
- FR-5c: `tests/.coverage-patch-allowlist.json` の移設対象ファイルを指すエントリは、stale 化(`:295` の stale-entry hard-fail)を機械照合して remap または削除する(cid:code-generation:c1-allowlist-mechanical-remap の直読照合併用)
- 受け入れ基準 AC-5: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` / coverage 3 gate(registry --check、project-gate --check、patch-gate --check)全 green(exit code 実測)

## FR-6: ドキュメント同期

**要求**: CI 構成・テスト tier を記述する docs を同一変更で同期する。

- FR-6a: 対象面の棚卸しは対象語彙(`test:ci`、`--ci`、`distribution:benchmark`、tier 名等)の repo 全域 grep から導出する(docs/ + 正本知識ファイルの両域 — cid:requirements-analysis:enumeration-completeness-review 追補)。件数語は隣接列挙原則に従う(cid:functional-design:c3-adjacent-enum-numerals)
- 受け入れ基準 AC-6: 棚卸し表(grep 出力転記)が design 成果物に実在し、更新対象の全数が同一 Bolt 群内で更新される

## NFR

- NFR-1: PR あたりの CI 消費削減を反証可能な2層で確認する — (i) **決定的層**: `--ci` の実行ファイル集合から移設 perf ファイル全数が除外されていること(runner 出力の機械照合 — 偽装不能)。(ii) **非退行層**: 移設後の `tests` job wall-clock が移設前の対照断面を上回らないこと(同等条件の1断面以上、実測値に測定 ref 併記。上回った場合は NFR-1 不合格として原因を帰属してから完了)。改善幅の絶対目標は設けないが、非退行 bound により僅少・微退行での無条件合格は不能
- NFR-2: perf.yml の総実行時間は timeout-minutes による上限で有界とする(値は design で実測から導出)
- NFR-3: TDD 既定(cid:code-generation:tdd-default-with-narrow-exceptions): runner の tier 追加・除外ロジックは公開 seam への失敗テスト先行(Red→Green)。yml・ドキュメントは適用外分類だが drift check / 落ちる実証で検証する

## スコープ外(再掲・requirements として固定)

1. #1830 経路B(絶対 median 予算の基準変更)
2. schedule 失敗時の自動 Issue 起票
3. perf テストのサンプル設計そのものの性能改善(FR-4 に必要な範囲を除く)
4. release.yml / metrics-maintenance.yml の変更

## 前提(Assumptions)

- A-1: CI ランナーの機種・負荷の不均質(AMD EPYC 7763 / INTEL XEON 8573C の混在、#1830 実測)は今後も持続する — 根拠: GitHub-hosted runner の機種は選択不能。したがって絶対時間予算を PR blocking に置かない構造が恒久解であり、個別予算の微調整では再発する
- A-2: 新しい性能監視基盤・ダッシュボードは不要 — 根拠: Q3=B 裁定(loud 可視化のみ)。GitHub Actions の workflow 失敗表示と GITHUB_STEP_SUMMARY で足りる
- A-3: perf テストの検証価値は daily 実行で維持される — 根拠: Q1=A 裁定。退行検知の最大遅延24h は受容済みトレードオフ(intent-statement リスク節)
- A-4: 移設対象ファイルは `covers:` claim を保持したまま tier 移動できる — 根拠: gen-coverage-registry の tier 列挙は disk 走査(`:771-774`)で、perf tier の追加は機械的(RE 実測)

## 未解決事項(Open questions — 後続ステージで確定)

- OQ-1(design): perf.yml の cron 時刻(0分/30分回避の off-peak 値)
- OQ-2(design): FR-1e の移設最終目録 — 機能テスト同居ファイル(特に t257)の分割可否
- OQ-3(design): FR-4b の timeout 是正方式(予算引き上げ / サンプル数削減 / タイミングシーム)と FR-4d の t257 波及判断
- OQ-4(design): R-1 の CI-residency ガード側の扱い(perf tier の明示拒否 or 文書化)
- OQ-5(design): FR-3b の distribution-release-gate 残置形態(削除 or contract のみの gate へ縮退)
- OQ-6(design): R-2 の perf.yml 側 test-size-report artifact 配線

## リスク

- R-1: perf tier 新設が `t257-ci-residency-marker-guard.integration.test.ts`(:32 の CI_SCOPES = smoke/unit/integration)と交差 — 現在 perf 候補ファイルに `CI-resident` マーカーは 0件(RE 実測)だが、移設後の perf tier 内で将来 CI-resident 主張が書かれると恒久不発の standing proof になる。design でガード側の扱い(perf を明示拒否 or 文書化)を確定する
- R-2: 移設で drift report(`tests/run-tests.ts:984-990`)から perf ファイルの実測が消える — perf.yml 側でも test-size-report を artifact 化して観測継続する(design で配線)
- R-3: schedule トリガーは fork や push 停止 repo で自動停止しうる(GitHub 仕様: 60日無活動で suspend)— 運用注記として docs に記載

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-31T10:03:13Z
- **Iteration:** 1
- **Scope decision:** none

FR は Q1-Q4 裁定と codekb 実測に接地しテスト可能だが、stage 契約の構造要件2点(team-practices 参照、Assumptions/Open questions 節)の欠落で NOT-READY。NFR-1 の反証不能性も是正推奨。

### Findings

- [Major] amadeus/spaces/default/intents/260731-perf-ci-separation/inception/requirements-analysis/requirements.md: consumes frontmatter の team-practices が requirements.md で参照も N/A 明記もされていない。 根拠: stage file :173 は upstream-coverage の対象に team-practices を含むが、requirements.md line 3 ヘッダに欠落。
- [Major] amadeus/spaces/default/intents/260731-perf-ci-separation/inception/requirements-analysis/requirements.md: Step 10 が必須とする Assumptions / Open questions の第一級セクションが欠落。 根拠: H2 は FR-1..6 / NFR / スコープ外 / リスク のみ。cron 時刻・R-1 ガード・timeout 方式の未決が散在。
- [Minor] amadeus/spaces/default/intents/260731-perf-ci-separation/inception/requirements-analysis/requirements.md: NFR-1 が閾値なしで反証不能(数値目標は設けない)。 根拠: line 68 — 改善が僅少・微退行でも合格しうる。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-31T10:06:40Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1 の3指摘(team-practices N/A、Assumptions/Open questions 節、NFR-1 反証可能化)は全件閉包を実測確認。file:line 引用の spot-check 全解決、branch protection 主張も gh api で独立再確認。矛盾・無申告逸脱なし、全 FR に機械照合可能な AC。design へ進行可。

### Findings

- None
