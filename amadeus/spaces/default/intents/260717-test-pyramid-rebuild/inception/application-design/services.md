上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md, team-practices.md

# サービス設計 — test-pyramid-rebuild(#684)

## ランタイムサービスは存在しない(反証可能な N/A 根拠)

本 intent が対象とする Amadeus フレームワークは **利用者向けのランタイムサービス(常駐プロセス・API エンドポイント・SLO を持つ稼働サービス)を持たない CLI/ツール系** である(codekb architecture.md:13「配布の正本は packages/framework/core/ と harness/」、project.md「Deployment: デプロイ基盤は持たず、リリースは npm パッケージ配布と GitHub 上のタグ/PR 履歴で管理」)。

したがって「サービス通信契約(sync/async・REST/gRPC/events)」「スケーリング特性」「オーケストレーション vs コレオグラフィ」といったランタイムサービスの設計項目は本 intent に **該当しない(N/A)**。この N/A は「未検証」でも「PASS」でもなく、**反証可能な不存在**である(project.md observability c3 / environment-provisioning c3 の N/A 分離規律に倣う):

- 反証可能根拠1: 本 intent の全成果物(C1〜C5)は **CI 実行時・メトリクス収集時に決定的に走る純関数・スイープ**であり、常駐サービスではない
- 反証可能根拠2: 既存の同種機構(`test_pyramid` コレクタ `scripts/metrics-snapshot.ts:97-104`、size ドリフトゲート `t-test-size-drift`)はいずれも CI ジョブ内の決定的チェックであってサービスではない
- 反証可能根拠3: requirements.md に service/SLI/エンドポイントの記述は一切なく、FR-1〜7 はすべて台帳・規約・ゲート設計・計画に閉じる

以下では、ランタイムサービスの代わりに本 intent が扱う **決定的な処理単位(スイープ・検査・整合)** をサービス相当の「処理サービス」として、そのオーケストレーション・契約・ライフサイクルを記述する。

## S1: 台帳生成サービス(SizeLedger 生成、設計)

### 責務とオーケストレーション

`tests/` 全域再帰の `*.test.ts` 全数(442ファイル、既存 `test_pyramid` コレクタ `scripts/metrics-snapshot.ts:34-40` walk / `:99` と同型の無制限再帰列挙)を対象に、`classifyTestSize`(`tests/lib/test-size.ts:49`)を **決定的スイープ**(全数直呼び)で適用し `SizeLedger` を組み立てる。LLM fan-out ではなく決定的関数の直接全数適用(team.md deterministic-function-direct-sweep、RE scan-notes:7)。

- **オーケストレーション形態**: 単一パスの決定的スイープ(オーケストレーション/コレオグラフィの区別は N/A — 単一処理)
- **入力の所有**: ファイル列挙とソース読取はスイープ駆動側が所有(既存 `test_pyramid` コレクタの `env.listFiles` / `env.readFile` 注入パターン `scripts/metrics-snapshot.ts:98-102` と同型の seam)
- **決定性**: 出力は file 昇順で決定的(既存 `buildTestSizeReport :175-183` と同型)

### 契約

- 出力形式は既存 `test_pyramid` コレクタの `${tier}_${size}` キー(`scripts/metrics-snapshot.ts:102`)と整合。台帳の全数値は計測出力の転記(検証劇場 Forbidden)
- observed ref(HEAD SHA)を出力に含める(measurement-ref-in-artifacts)

### ライフサイクル

生成は **オンデマンド**(CI メトリクス収集時 or 手動スイープ時)。常駐しない。台帳の永続化方式(scratch JSON か成果物ファイルか)は units-generation で検討し、生成スクリプト実装は別 intent(FR-1、将来条件 requirements.md:47)。

## S2: ドリフト検査サービス(tier-aware、設計のみ — 実装 Out)

### 責務とオーケストレーション

`SizeLedger` を入力に、各行の `{ tier, measured }` を tier 上限(C2 `allowedMaxSize`)と突き合わせ、上限超過を `TierSizeViolation` として集計する(C3)。**判定 IF の設計のみ**。CI ジョブ配線・exit code 契約・落ちる実証は移設 intent(FR-3 AC-3b、FR-7)。

- **既存ゲートとの共存契約**: 既存 size ドリフトゲート(`declared < measured`、`t-test-size-drift`)を **非破壊温存**。tier-aware ゲートは別観点の追加であって置換ではない(ADR-05、要求にない互換レイヤー/二重実装ではなく直交観点の追加)
- **fail-closed 契約**: 判定不能・入力欠落は fail(`coverage-project-gate.ts` の 5値 FailReason 正準テンプレート architecture.md:82 に倣う設計)。ただし実際の CI 赤化・exit code は移設 intent

### ライフサイクル

移設 intent で CI ジョブへ配線される想定(既存 `check` ジョブ、typecheck/lint 系列 architecture.md:92)。本 intent では **配線しない**(設計のみ)。

## S3: カバレッジ整合サービス(#683、計画)

### 責務

C1 台帳の tier 分類と #683(Codecov)層別カバレッジ測定経路の **tier キー整合計画** を提供する(FR-6)。既存 coverage 経路(`ci.yml` の `coverage` ジョブ・`tests/run-tests.ts` の lcov 生成 component-inventory.md:150,153)と C1 台帳の tier キーを突き合わせる計画まで。**CI 配線・強制ゲート化は #683 スコープ**(Out)。

### 契約

tier 導出は既存前提(ディレクトリ第1階層、A-2)で両経路を揃える。強制ゲートは作らない(ガイドライン整合、FR-2/5 と同格)。

## サービス相当処理のサマリ

| 処理サービス | 形態 | 本 intent の成果 | ランタイム常駐 | 実装スコープ |
| --- | --- | --- | --- | --- |
| S1 台帳生成 | 決定的スイープ | 生成方式・契約設計 | なし(オンデマンド) | 生成スクリプト=別 intent |
| S2 ドリフト検査 | 決定的検査 | 判定 IF・共存契約 | なし | CI 配線=移設 intent |
| S3 カバレッジ整合 | 整合計画 | tier キー整合計画 | なし | CI 配線=#683 |

いずれも常駐サービス・外部通信・SLO を持たない。service SLO を timeout や単発 run 成功へ昇格させない(project.md observability c3)。強制ゲート(比率 FR-2 / 時間予算 FR-5 / tier-aware FR-3)はすべて **本 intent Out** であり、設計はガイドライン目標と判定 IF に留まる。
