# Requirements — 260810-tla-applicability-wiring（Issue #2766 案A: 接続完成）

上流入力（consumes 全数）: `business-overview.md`、`architecture.md`、`code-structure.md`

## 1. インテント分析

### 承認系譜

本 intent は次の裁定系譜に基づく（`cid:requirements-analysis:approval-lineage-citation`）: (1) [Issue #2766](https://github.com/amadeus-dlc/amadeus/issues/2766) — クロスレビュー2名成立（run `xrev-2766-20260809T235547Z`、両者 `CONFIRMED_WITH_REFINEMENTS`、収束 `ESTABLISHED_WITH_REFINEMENTS`、検証 SHA `91f37ec85` = 本 RE の observed）。(2) ユーザー裁定 **案A**（2026-08-10、[裁定コメント](https://github.com/amadeus-dlc/amadeus/issues/2766#issuecomment-5234641519) — 5項目: 供給経路 / 実行接続 + BR-U2-05 衝突は設計段裁定 / FR-005 閉包 / 回帰テスト / stage 層 opt-in 維持）。(3) 本ステージ明確化質問 Q1=A / Q2=A / Q3=A（ユーザー承認: 2026-08-10T01:00:12Z、`requirements-analysis-questions.md` 正本）。

### 目的

TLA+ 適用判定（authoring-hold advisory）を実効化する。現状は対象供給源 `authoring-subjects.json` の書き手が存在せず（git 全履歴 0 件 — RE `re-scans/260810-tla-applicability-wiring.md`）、全 intent の 3 checkpoint（requirements-analysis / functional-design / build-and-test）で判定が常に `no-hold` / 痕跡なしで空転している。260804-tla-authoring の FR-001（明示判定 + evidence 永続化）・FR-005（非対象 receipt）を実効化し、hold から `tla-authoring` ステージへの実行接続を完成させる。`business-overview.md` の記す自己開発リポジトリ（Amadeus 自身）の統治面であり、`architecture.md` の plugin advisory checkpoint 機構、`code-structure.md` の `plugins/formal-model-check/` + `packages/framework/core/tools/` 境界の内側で完結する。

## 2. 機能要件

### FR-1: governed subjects の供給経路（書き手）

システムは `authoring-subjects.json`（`defaultSubjectsPath` = `specs/tla/authoring-subjects.json`、`tla-authoring.ts:453-455`）を生成・更新する供給経路を持たなければならない。供給は active intent の要件・裁定文書から適用対象（stable id 集合）を評価して行い、書き手の実装方式（宣言ファイル生成 CLI / RA checkpoint からの自動評価のいずれか、または併用）は設計段で確定する。受け入れ基準: 書き手の実行後、`advisory hold` が宣言された subjects の identity を実際に評価する（`no governed subjects are declared` 以外の経路へ入る）ことをテストで実証する。

### FR-2: stable-id 抽出文法の実文法拡張（Q1=A）

`REQUIREMENTS_HEADING_RE`（`tla-evidence.ts:45` = `/^###\s+((?:FR|NFR|AC)-\d{3})\b/`）を実コーパスの見出し形（`FR-1` / `FR-CROSS-1` / `NFR-1` / `AC-1` 等の非3桁形、実測 503 件）へ拡張する。既存3桁形は引き続き受理し、decisions 側（`ADR-\d+`）は不変。受け入れ基準: 実在 intent の requirements.md 見出し形を写した fixture で抽出が成功し、拡張前に `unresolvable-id` だった形が解消すること。登録済み evidence（model-map 2 モデル）への影響ゼロを機械確認する。

### FR-3: authoring-hold → tla-authoring の実行接続

`authoring-hold` が hold を返したとき、checkpoint の run-now 選択が `tla-authoring` ステージへの実行経路を構成できなければならない。現行の一般化点は argv のみで遷移先 stage が `"formal-model-check"` にハードコードされている（`amadeus-advisory-choice.ts:948` — RE 実測）ため、遷移先の宣言駆動化を含む。**BR-U2-05（hold の解除権は評価器の `no-hold` のみ — `t445-advisory-declaration-supply:180-182` / 260804 record `business-rules.md:15`）の意味論は維持する**: run-now は authoring 作業への起動接続であって解除経路ではない。宣言（`formalCheck`）を埋める形か ADR-6 を改訂する形かは設計段で明示裁定する（案A 項目2）。受け入れ基準: hold 状態からの run-now 選択で `tla-authoring` 到達経路（実行コマンドまたは同等の引き渡し）が構成されることをテストで実証し、その経路が hold を解除しない（解除は評価器の no-hold のみ）ことを同時に固定する。

### FR-4: FR-005 receipt（非対象判定）の閉包

`non-target` / `impl-only` の終端経路判定に対し `terminal-route-receipt`（`tla-evidence.ts:229-231`）を発行する owner を定め、自動発行点を実装する。現状は `applicability receipt` verb が stdout 返却のみで永続化せず、stage は終端経路を拒否する（`stages/tla-authoring.md:40-44`）ため、発行 owner がどこにも存在しない（RE 実測）。受け入れ基準: 非対象判定の receipt が evidence store に永続化され、`advisory hold` の解除根拠として実際に消費されること。owner の所在（既存ピン `t450:163` との整合）は設計段で確定する。

### FR-5: 空集合からの段階導入（Q3=A）

供給経路の完成後も、subjects 未宣言のワークスペースは従来どおり `no-hold`（`tla-authoring.ts:507-508`、ピン `t445-tla-applicability-cli:354` 不変）とし、実宣言の投入は形式検証対象と判定された最初の対象から段階的に行う。着地直後に既存 intent の checkpoint を停止させてはならない。受け入れ基準: 着地コミット時点で `authoring-subjects.json` は依然として存在せず、全既存 intent のワークフローが従前どおり進行すること。

### FR-6: hold の実発火を通す回帰テスト

self-feature 相当の「新しい統治対象を宣言した intent が hold を受け、authoring 完了（または terminal receipt）で解除される」端到端経路（供給 → checkpoint 評価 → hold → 実行接続 → 解除）を fixture で通す回帰テストを追加する。落ちる実証（`falling-proof`）として、供給を欠いた状態では従来どおり素通りすること・宣言を与えると hold が立つことの両側を固定する。新規テスト番号は **t524** から予約する（RE 実測: 使用済み最大 t523、t521 二重採番あり — 事前予約必須）。

### FR-7: 判定痕跡の可観測性

適用判定が評価されたことを事後に確認できる痕跡を残す（現状は `no-hold` が `advisoryFromEvaluatorRun` :171 で null 化され痕跡ゼロ — RE 実測）。本 FR は案A の直接項目ではなく、260804 FR-001 の「監査可能な evidence として永続化」を実効化する FR-1/FR-3/FR-6 の検証可能性を支える導出要件である（トレーサビリティ: Issue #2766 根拠 5「FR-001 との乖離」）。受け入れ基準: hold / 解除の遷移が既存の advisory 記録面（`.amadeus-advisory-choice.json` / audit）に載ることをテストで実証する。no-hold の痕跡化の要否と粒度は設計段で判断する（毎 `next` × 3 checkpoint の記録肥大とのトレードオフ）。

## 3. 非機能要件

- **NFR-1（性能・停止耐性）**: 供給・評価の実装は evaluator の同期 spawn 制約（60 秒 timeout / 8MiB バッファ — `amadeus-advisory-declaration.ts:292-306`）の内側で完走すること。timeout は fail-closed（hold 化）でワークフロー停止に直結するため、intent 成果物の全走査等の重い実装を checkpoint 経路に置かない。
- **NFR-2（fail-closed の維持）**: 壊れた宣言・未解決 id・読取不能 store の fail-closed 挙動（`governed-subjects-unreadable` / `unresolvable-id` / `evidence-unreadable`）は全て維持し、緩和しない。
- **NFR-3（テスト規律）**: TDD 既定（team.md）。新設の検査・接続は落ちる実証を経て完成扱いとする。coverage / patch / complexity / drift の blocking gate 全数を満たす。

## 4. 制約

- BR-U2-05 の解除意味論（評価器の no-hold のみが解除）は不可侵。変更が必要になった場合は実装前に停止し明示裁定へ（`cid:requirements-analysis:implementation-deviation-election`）。
- `tla-authoring` stage の opt-in 宣言（`scopes: []`、`t445-stage-frontmatter-compose:135` ピン）は維持する（案A 項目5 — checkpoint 側の実効化であり stage の自動選択化はしない）。
- `authoring-subjects.json` の置き場が `ACTIVATION_WATCH_GLOBS`（`amadeus-plugin-activation.ts:51` = `["tla/**"]`）の内側にあり、宣言更新のたびに兄弟 advisory（spec-hash `changed`）が発火する非対称（RE 🔴 R2 — evidence store は glob 外という設計意図が :49-50 に明言）。置き場（glob 内許容 / 移設 / glob 除外）は設計段で裁定する。
- `resolveSpecRoots` は active space cursor 依存・`LegacySpecError` fail-closed（RE 実測）。テストは cursor を ambient 入力として扱う（`cid:build-and-test:c1-tsr-ambient-repro-on-base`）。
- 編集正本は `plugins/formal-model-check/` と `packages/framework/core/tools/`。`bun run build` による self-install 再生成・dist 非追跡境界は既存規範どおり。

## 5. 前提

- クロスレビュー済みの機序（書き手 0 件 / ENOENT→no-hold / formalCheck: null / 痕跡なし）は observed `91f37ec85` で検証済みであり、本 intent 中の base 前進時は患部交差を再判定する。
- 既存 2 モデル（FormalElection / MirrorLifecycle）と evidence store の現況（store 未作成）は RE 実測どおり。
- 実 manifest（`plugins/formal-model-check/plugin.json`）の `advisories` を assert する既存テストは 0 件（RE 実測）— `formalCheck` を埋めても既存テストは壊れない。

## 6. スコープ外

- 配布面（ユーザーワークスペース）での宣言駆動 advisory 供給 — #2267（OPEN）依存。Q2=A により本 intent の受け入れ基準は自己開発リポジトリで機能することとする。
- `tla-authoring` stage の stock scope 参加（案C 相当の再定義）。
- 既存 2 モデルの TLC 検査実行（本ワークフロー冒頭の never-run advisory は defer-with-risk 記録済み）。
- #2361（macOS TLC provider）の修正。

## 7. 未解決事項（設計段へ委譲）

- 供給経路の実装方式: 宣言ファイル書き手 CLI か、checkpoint からの直接評価か、併用か（FR-1）。
- 実行接続の実現形: `formalCheck` 宣言を埋める + 遷移先 stage の宣言駆動化か、別経路か。ADR-6 との整合（改訂 or 宣言充足）を含む（FR-3）。
- FR-005 receipt の発行 owner の所在と `t450:163` ピンの扱い（FR-4）。
- `authoring-subjects.json` の置き場と watch-glob 干渉の解消形（制約 3 項目目）。
- no-hold 痕跡化の要否と粒度（FR-7）。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T01:07:20Z
- **Iteration:** 1
- **Scope decision:** none

READY (BLOCKER 0). 必須7節・Minimal バンド(FR-1〜7)・Q&A 裁定証跡・案A 5項目/Q1-Q3 の無逸脱対応・BR-U2-05 留保保存を確認。MINOR 3件: FR-3/FR-7 の受け入れ基準ラベル欠如(→conductor が是正済み・センサー再発火 FAILED 0)、FR-7 の案A 対応明記(→是正済み)、upstream-coverage の実測確認推奨(→conductor 実測: 6/6 PASSED、絶対 optional consume 3件は engine が正しく除外)。

### Findings

- NIT | requirements.md FR-3 — 受け入れ基準ラベル欠如。是正済み(run-now 到達経路の実証+非解除の同時固定を AC 化)
- NIT | requirements.md FR-7 — 受け入れ基準ラベル欠如と案A 対応の明記不足。是正済み(導出要件のトレーサビリティ1文+AC 化)
- FOLLOW-UP | 上流入力ヘッダと frontmatter consumes の差 — conductor 実測で解消: intent-statement/scope-document/team-practices は optional 不在で engine が除外、upstream-coverage センサー PASSED(FAILED 0)
