# Design Decisions(ADR)— 260731-perf-ci-separation

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、stories(N/A — user-stories は本 scope(self-feature)の EXECUTE 集合で SKIP のため成果物不存在。ユーザー価値の導出は intent-statement 経由で requirements.md に固定済み)、team-practices(N/A — practices-discovery SKIP のため不存在。プラクティスは memory 層が ambient 適用 — requirements.md line 3 と同判断)

各 ADR は Context / Decision / Consequences / Alternatives Rejected を持つ(inception.md Architecture Standards)。セキュリティ・コンプライアンス影響は全 ADR 共通で「なし(CI 構成とテスト配置のみ。secrets・権限・外部送信の変更なし)」— 個別に追記がある場合のみ明記。

## ADR-1: perf 分類はディレクトリ tier(tests/perf/)で行う

- **Context**: FR-1。run-tests.ts の tier はディレクトリが唯一の軸(`Level` :71、`levelFiles` :839 の readdirSync — codekb 実測)。e2e が既に `--ci` 外の先例
- **Decision**: `tests/perf/` を新 tier として追加。`--ci` は構造的に perf を含まない
- **Consequences**: 分類が自明・機械的(ファイル所在=分類)。gen-coverage-registry の TEST_TIERS へ 1 エントリ追加が必要(C-6)。t257-ci-residency ガードの CI_SCOPES 意味論と自然に整合
- **Alternatives Rejected**: (a) basename 除外リスト(t19 の excludes 機構流用)— 分類がリストと実体の二重管理になり drift する。リストは `levelFiles` の excludes が per-call のため coverage:ci との同期漏れリスク (b) `// perf:` アノテーション方式 — 新しいメタデータ規約の発明。既存 tier 軸(ディレクトリ)と二重の分類軸を作り、size: 注釈の不一致トラップ(t258 の @test-size 実測)と同型の罠を増やす

## ADR-2: 同居ファイルは per-test 分割で移設(whole-file 移設は純 perf ファイルのみ)

- **Context**: FR-1e/OQ-2。t258/t257/t259 は機能テスト(直列化・atomic writer・ガード実在)と perf 契約が同居(describe 構造の grep 実測 — components.md C-2 の表)
- **Decision**: 同居3ファイルは perf describe/test のみを `tests/perf/` の新ファイルへ分割移設し、機能テストと純合成の落ちる実証(FR-1f)は blocking に残す。純 perf 2ファイル(t269、t-plugin-stage-discovery)は whole-file 移設。t292 は実時間2テストのみ分割
- **Consequences**: blocking CI の機能検証は無損失(FR-3d の P2 準拠)。分割で import・ヘルパの複製が発生(正味 +120 行見積り)。covers: claim は両側保持
- **Alternatives Rejected**: (a) whole-file 移設(6ファイル全部)— t258 の直列化テスト・t259 のガード実在検証・t292 の aggregator 契約が daily へ落ち、機能退行の検知が最大24h 遅延(P2 の検証無音喪失に近い)。 (b) 移設なしで in-place skip フラグ — 検証がどこで走るかが env に依存し、恒久 skip の standing proof 化リスク(t257-ci-residency ガードの教訓)

## ADR-3: t258 timeout は分布導出の予算引き上げ(250_000ms)で是正

- **Context**: FR-4/OQ-3。#1835 クロスレビュー実測: 22断面分布 pass 91.2〜119.7s / fail 120.4〜122.1s、120s 線が分布内側。機序は 330 逐次 spawn の実時間支配
- **Decision**: per-test timeout を `250_000` へ(式: `ceil(2 × max観測 122_147ms / 10^4) × 10^4`、headroom ≈ 2.05倍)。サンプル数(100×3)は不変。t257(:260)は波及なし(実測 28.6s = 予算の 24%)
- **Consequences**: 予算線が観測分布の外側へ(AC-4 充足)。perf.yml 上での実行時間は最悪 250s/テストまで許容 — daily 非 blocking なので許容。分布が将来 250s に近づけばそれは真の性能退行として perf.yml が検知
- **Alternatives Rejected**: (a) サンプル数削減(100→50)— 統計的検出力を下げ、#1511→#1830 で median 化した判定の安定性を損なう。削減しても spawn 実時間は機種依存で timeout リスクは残る (b) タイミングシーム化(bt-timeout-verification-shape)— 本テストは実 spawn の実時間性能そのものが被験体であり、シーム化すると計測対象が消える(シームの適用対象は「本番タイムアウトの待機検証」であり本件と異なる)。perf tier 移設により「PR blocking での実時間待機」問題自体は構造解消済み

## ADR-4: distribution-release-gate は job ごと削除

- **Context**: FR-3b/OQ-5。gate は CONTRACT_RESULT + PERFORMANCE_RESULT の AND(:288-291)。PERFORMANCE_RESULT を外すと contract 検査(ci-success needs 内の `distribution-contract`)の重複ラッパーのみ残る。branch protection は「CI Success」のみ要求(ruleset 18843917 実測)で gate を名指ししない
- **Decision**: `distribution-release-gate` job を削除。contract の blocking は `distribution-contract`(ci-success needs)で継続
- **Consequences**: ci.yml −13 行。検証喪失なし(PERFORMANCE は perf.yml へ、CONTRACT は既存 needs で不変 — FR-3d 対照表で機械照合)
- **Alternatives Rejected**: (a) contract のみの gate へ縮退残置 — 同一検証の二重表明(検証劇場 Forbidden の「どのコードも消費しないフィールド」類型)。 (b) gate に perf.yml の最新結果を照会させる — PR blocking へ非同期実行結果を持ち込み、Q2=A 裁定(PR blocking から外す)に逆行

## ADR-5: cron は "47 17 * * *"(UTC)

- **Context**: FR-2a/OQ-1。0分/30分は GitHub Actions の混雑ピーク(schedule 遅延・drop の既知傾向)
- **Decision**: `47 17 * * *`(UTC 17:47 = JST 02:47)。日本時間の深夜・オフピーク
- **Consequences**: 退行検知の最大遅延 ~24h(A-3 の受容済みトレードオフ)。workflow_dispatch で随時手動実行可
- **Alternatives Rejected**: (a) `0 0 * * *` — 混雑ピークで実行遅延・skip リスク最大 (b) 複数回/日 — Q1=A 裁定(毎日1回)超過、ランナー消費増

## ADR-6: CI-residency ガードは無変更(意味論を文書化)

- **Context**: R-1/OQ-4。CI_SCOPES(:32)は smoke/unit/integration。perf 候補ファイルに CI-resident マーカー 0件(RE 実測)
- **Decision**: ガード無変更。perf tier での CI-resident 主張はガードが loud fail する現挙動を仕様として受容し、perf.yml ヘッダに文書化
- **Consequences**: 追加コードゼロ。将来の誤主張は既存ガードが検出
- **Alternatives Rejected**: (a) CI_SCOPES へ perf 追加 — perf は --ci 非実行のため「CI-resident」主張を合法化すると虚偽になる (b) perf 明示拒否の分岐追加 — 現挙動("other" scope 扱いで fail)と同結果の重複実装

## FR-3d 対照表: ci.yml から消える検証項目の全数と perf.yml 上の行き先

移設前(ci.yml、測定 ref = observed `da51af375`)→ 移設後の機械照合表。実装 PR のレビューはこの表を照合面とする。

| # | ci.yml から消える検証項目 | 現行所在 | 移設後の行き先 |
|---|---|---|---|
| V-1 | mirror distribution benchmark 実行(replica 1) | `distribution-benchmark` matrix :224-253 | perf.yml `distribution-benchmark` matrix replica 1 |
| V-2 | 同(replica 2) | 同上 | perf.yml 同 job replica 2 |
| V-3 | 同(replica 3) | 同上 | perf.yml 同 job replica 3 |
| V-4 | aggregate 検証5面: runtime compatibility / completeness(3 replicas)/ dispersion / p95 予算 / RSS 予算 | `distribution-benchmark-aggregate` :255-277(`distribution:benchmark:aggregate`) | perf.yml `distribution-benchmark-aggregate`(同一スクリプト無変更 — 検証述語 5 面は移動のみ) |
| V-5 | `distribution-release-gate` の PERFORMANCE_RESULT AND 検査 | :288-291 | **消滅**(意図的 — Q2=A 裁定。性能合否の表明は perf.yml の job 成否そのものが担い、blocking 表明は行わない) |
| V-6 | 同 gate の CONTRACT_RESULT AND 検査 | :288-290 | **ci.yml 残置**(`distribution-contract` が ci-success needs :651-659 に既在 — 重複表明の除去であり検証は不変) |
| V-7 | in-suite perf テスト実行(t258/t257/t259/t269/t292/t-plugin の実時間部分 — C-2 表の移設列全数) | `tests` :189 / `coverage-head` :320 / `coverage-base` :395(×最大3回) | perf.yml `perf-tests`(×1回/日 + dispatch) |
| V-8 | perf テストの wall-clock drift 観測(test-size-report) | `tests` job artifact :191-198 | perf.yml `perf-tests` の artifact(R-2/OQ-6)+ ci.yml 側 artifact は非 perf 分で継続 |

消える項目は V-1〜V-8 の8件で全数(ci.yml の削除対象 3 job の step 実測列挙より機械導出)。うち検証が消滅するのは V-5 のみで、これは「PR blocking にしない」という裁定そのもの(無音喪失ではなく申告済みの仕様変更)。

## 規模の正当化(数値)

| 面 | 見積り(行) |
|---|---|
| C-1 run-tests perf tier | +60〜90 |
| C-2 テスト分割移設 | 正味 +120(移動を除く) |
| C-3 perf.yml | +120〜150 |
| C-4 ci.yml 縮約 | −70 |
| C-5 timeout 是正 | +10 |
| C-6 coverage 整合 | +5(+データ再生成) |
| C-7 docs | +30〜60 |
| 合計 | 正味 約 +275〜365 |

adapter・外部契約の先行着地なし(全コンポーネントが本 intent 内で実装+配線完結 — inception.md N3 準拠)。
