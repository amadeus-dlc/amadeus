# Components — 260717-state-mirror-fixes

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## 構成方針

新規モジュールを作らず、既存3ファイルへの外科的変更(surgical)で構成する。requirements.md FR-1〜FR-4 と architecture.md の state 書込アーキテクチャ(engine RMW = withAuditLock 保護、component-inventory.md の core tools 群)に従い、ガードは既存ロックドメインへの参加として実装する。team-practices.md の適用プラクティス(dist 同期・ロック様式・fixture 実様式・lcov 事前確認)を写像する。

## コンポーネント一覧(規模は概算行数 — 数値必須、inception ガードレール)

| # | コンポーネント | 対象ファイル | 責務 | 概算行数(差分) |
|---|---|---|---|---|
| C1 | retreat-guard | amadeus-utility.ts(handleSetStatus — E-SMF-AD Q1=A 裁定) | FR-1a/1c/1d: lock→read→compare→write の後退検出と no-op+stderr advisory | 30-40 |
| C2 | checkbox-state 判定 | amadeus-lib.ts(既存 `parseCheckboxes` :3750 の再利用 — 新設なし、reviewer M-1 是正) | 対象 stage の現 checkbox 値の取得: `parseCheckboxes(content).find(c => c.slug === stage)?.state`(nextInScopeStage :5292 内の既習イディオム — 旧関数名記載は FD reviewer 実測で是正) | 0(再利用) |
| C3 | skip-denominator-fix | scripts/amadeus-mirror.ts | FR-2a: `— SKIP` サフィックス行の分母除外を countStageProgress へ追加(既存 `[S]` 除外は維持) | 3-5 |
| C4 | state-repair | amadeus/spaces/default/intents/260717-mirror-issue-tool/amadeus-state.md | FR-3a: audit シャード実測値からの復元(コード変更なし — データ修復)。実施単位 = 実装 PR と別の record チェックポイントコミット(E-SMF-AD Q2=A 裁定) | 0(データ) |

- 実装合計: **約33-45行**(C1 30-40+C2 0+C3 3-5+C4 0 の機械合算、±20%)— 凝集的な最小差分で、Units Generation の概算レンジ判定に用いる
- テスト: unit(C2 純関数+C3 fixture 是正・追加)約 80-100行 / integration(C1 の set-status ∥ advance 並列 spawn — t145 既習様式、fs-tests-integration-first)約 100-130行

## Reuse Inventory(再利用棚卸し — 新規機構ゼロ)

| 既存資産 | 再利用方法 |
|---|---|
| `withAuditLock`(amadeus-lib.ts:4266、amadeus-utility.ts へ import 済み :91 実測) | そのまま参加(新ロック機構を作らない) |
| `readStateFile` / `writeStateFile`(amadeus-lib.ts) | そのまま利用(atomic rename の torn-write 防止を継承) |
| `setCheckbox`(amadeus-lib.ts:3785)/ `setStageSuffix`(:3805) | 不変 |
| `parseCheckboxes`(amadeus-lib.ts:3750、export 済み読み側純関数)+ `.find(c => c.slug === …)` イディオム(nextInScopeStage :5292 内) | **import 再利用**(C2 — 新設関数ゼロ、既計測モジュールのため lcov 新規面もゼロ) |
| `tests/integration/t145-state-lock-concurrency.test.ts` の並列 spawn 様式 | 様式踏襲(C1 の integration テスト) |
| `tests/unit/t232-amadeus-mirror.test.ts` | fixture 是正+ケース追加(新テストファイルを作らない) |
| CI(typecheck/lint/dist:check/promote:self:check/tests) | 既存ジョブに自動収容 — 新規ジョブ・センサー・adapter の導入ゼロ(先行着地禁止に整合) |

## 依存と配布面(NFR-2 / NFR-3)

NFR-3(Bun-only): 新規 runtime dependency の追加なし — 全変更は既存 Bun 標準+リポ内シンボルの範囲(reviewer m-1 の明示化)。

### 配布面(NFR-2)

C1(handleSetStatus は export+argv パラメータ化 — NFR-4/seam-export-handler-amend、reviewer M-2 是正)は `packages/framework/core/` 正本 → `bun scripts/package.ts` で dist 6ツリー再生成+`bun run promote:self`。C3 は repo ローカル scripts のみ(配布面なし)。C4 は record データのみ。
