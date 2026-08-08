# Build and Test Results — 260807-intent-2328-tests-e2e-au

上流入力(consumes 全数): code-generation-plan（実行対象の正本）、code-summary（builder/conductor 実測の一次転記元）

測定 ref: worktree ブランチ `worktree-2328-audit-schema-drift`（再接地 merge 済み — parents a42070dcd + 6bef8206d）+ PR head（#2461 = bolt-2328-audit-reader）。実測日 2026-08-07〜08。

## ビルド

| 項目 | 結果 |
|---|---|
| `bun run build`（再接地後の再生成含む） | exit 0 |
| build 後 tracked 差分 | tests/e2e/ の19ファイルのみ（`git diff --stat -- packages/ scripts/ .github/ tests/harness/ tests/integration/ tests/unit/ tests/smoke/` = 空） |

## テスト（builder 実測 + conductor 再実行・base 帰属の3重確認）

| コマンド | 結果 | exit |
|---|---|---|
| 患部19ファイル各単独（Red→Green 全表 = code-summary） | t113 除く18件 green | 各 0 |
| t483 相当の3ファイル sanity（t10+t02+t06、bolt ブランチ上） | 16 pass / 0 fail | 0 |
| 交差ファイル t-formal-verif-model-completeness-sensor（merge 後再実測） | 7 pass / 0 fail | 0 |
| `bun run typecheck`（再接地+build 後） | — | 0 |
| `bun run lint` | info 13 = 既存水準 | 0 |
| e2e tier 全層（99ファイル、builder 実測） | fail 4（帰属確定済み — 下記） | 4 |
| `bun run test:ci`（builder 実測） | fail 2（t17/t66 — 環境要因確定） | 2 |

vacuity 落ちる実証3件（t09:206 / t07:361 / t07:520）: 注入→赤（Expected: 0 / Received: 1）→復元 md5 一致→残渣 grep 0。詳細は code-summary。

## PR CI（統合証跡 — 正規判定。PR #2461、`gh pr checks` 転記）

Tests / Typecheck / Lint and complexity / Reproducible build / Source-only and graph invariants / Plugin conformance E2E / Intent Mirror distribution contract / Coverage Report (head/base/両) / Detect CI changes / CodeRabbit / **CI Success** — **全 pass**（fail 0・スレッド 0 — pr-convergence-report: converged true / CLEAN）。

## 残余赤の帰属（bt-20260730-2 — 未改変 base `6bef8206d` の detached worktree + build で正式確認）

| ファイル | base 単独 | 自ツリー | 帰属 |
|---|---|---|---|
| t113 | 1p/3f 同一署名 | 1p/3f | 既存事象（emit 順序）— **#2456**（a5621236c でも再現済み） |
| t267 | 1 fail | 1 fail | 既存事象（election CLI tally） |
| setup-install / setup-upgrade | 1f / 6f | 同 | 既存事象（`bun build failed for @amadeus-dlc/setup ... ENOENT` ビルド環境要因） |
| t17 / t66 | **0 fail** | 単独でも fail（t17:360 lookup が build-and-test を返す） | **環境要因** — active intent を持つ worktree での ambient workspace 読取。**#2464 起票済み**。PR CI green が正規判定 |

いずれも自変更（e2e 19ファイル）との import 交差ゼロを grep で機械確認。

## 派生 Issue（本 intent の FR-4/FR-5 + B&T 発見）

- **#2456**: t113 の emit 順序欠陥（base 再現付き）
- **#2457**: 非 e2e latent v1 pin（述語記録付き・広義26候補）
- **#1981** コメント: e2e CI 死角の不可視期間証跡
- **#2464**: t17/t66 の ambient workspace 読取（B&T 帰属切り分けで発見）

## 検証した面と未検証の面（cid:build-and-test:c2-unconditional-ready-boundary）

- 検証済み: 患部19の読み手置換（単独 green + vacuity 実証 + writer/ハーネス/除外の無改変機械確認）・PR CI 全 green・残余赤の全数帰属
- 未検証（AC 外 — 申し送り）: e2e 層は本修正着地後も PR CI で回らない（#1981 未解決の既知リスク — Out of scope 2 で宣言済み）。#2456/#2457/#2464 は独立 Issue として追跡
