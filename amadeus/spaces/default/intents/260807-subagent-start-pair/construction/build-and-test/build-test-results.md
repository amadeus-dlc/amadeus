# Build and Test Results — 260807-subagent-start-pair

上流入力(consumes 全数): code-generation-plan（実行対象の正本）、code-summary（builder 実測の一次転記元）

測定 ref: worktree ブランチ `worktree-2297-2303-subagent-start`（両 unit の変更を包含）+ PR head（#2427 = c1f838b8b、#2428 = 6b25c0641）。実測日 2026-08-07〜08。

## ビルド

| 項目 | 結果 |
|---|---|
| `bun run build` | 成功（両 builder とも初回成功 — 8ハーネス再生成） |
| build 後 `git status`（tracked） | 差分は Unit A 5ファイル + Unit B 11ファイルのみ — 新規 drift ゼロ |
| `bun run source-only:check` | exit 0（source-only boundary: clean — 両 unit で実測） |

## ローカルテスト（builder 実測 + conductor 再実行の2重確認）

| コマンド | 結果 | exit |
|---|---|---|
| t483 + hook-dispatcher + t-subagent-purpose + t454 の4ファイル合同（conductor 再実行） | 48 pass / 0 fail / 154 expect | 0 |
| `bun test tests/integration/t-log-subagent-start.integration.test.ts`（build 後、conductor 再実行） | 10 pass / 0 fail | 0 |
| `bun run typecheck`（conductor 再実行） | — | 0 |
| `bun run lint`（conductor 再実行） | — | 0 |
| `bun tests/gen-coverage-registry.ts --check`（builder 実測） | OK (fresh, guards green, ratchet held) | 0 |

TDD Red 実測（実装前、いずれも exit 1）: Unit A t483 = 包含検査が `PreToolUse|^Task$|amadeus-log-subagent-start.ts` の欠落を名指し検出（3 pass / 2 fail）。Unit B = `PreToolUse{Agent}` pin が `Received: null`（13 pass / 1 fail）。

落ちる実証3件（すべて注入→赤→復元→残渣ゼロの1セット、code-summary 記録）: AC-A3 配線除去 / ghost waiver（CodeRabbit 是正）/ dist 面 pre-fix 語彙注入。

## PR CI（統合証跡 — 正規判定。`gh pr checks` 転記）

- **PR #2427**: Tests / Typecheck / Lint and complexity / Reproducible build / Source-only and graph invariants / Plugin conformance E2E / Intent Mirror distribution contract / Coverage Report (head/base/両) / Detect CI changes / CodeRabbit / **CI Success** — 全 pass。skipping = Formal model check（発動条件外）・Metrics Snapshot（非ブロッキング）。初回 run の t224 赤は #2397 記録済みの回転フレーク（`--apply` exit 1 — 本 PR の差分は t483 テストファイルのみで無関係、同 PR の前 run では pass）→ rerun green で閉包
- **PR #2428**: 同 check 集合全 pass（初回 run で green）
- レビュースレッド: #2427 の CodeRabbit Minor 1件（unanchored waiver）を c1f838b8b で是正・返信・resolve。#2428 は 0 件
- pr-convergence-report: 両 unit とも converged true / CLEAN / violating 0

## マージ後の main CI

merge commit 5548708ff（#2428 — #2427 マージ後の head を包含）の main push CI = **success**（`gh run list --branch main` 転記）。

## 失敗・修復記録

- t224 フレーク（#2397 既知）1回 — rerun で解消、フレーク証跡は上記のとおり
- 本ステージでの新規失敗なし。既存テストの赤なし（対象集合すべて green、両 PR CI 全 green、main CI green）

## 検証した面と未検証の面（cid:build-and-test:c4-conditional-ready / c2-unconditional-ready-boundary）

- 検証済み: 配線の実在（t483 + end-to-end exit 0）・語彙受理（unit + フック spawn 経路の emit 1行）・両者の統合面（main CI green）
- 未検証（AC 外 — 申し送り）: **実際の live Claude Code セッションでの SUBAGENT_STARTED 自然発生の観測**。フックは settings 読み込み時点から有効になるため、次回以降の実セッションの監査シャードに SUBAGENT_STARTED が現れることが実運用面の最終確認になる（FR/AC はフック spawn 経路の決定的実証までを要求 — 充足済み）
