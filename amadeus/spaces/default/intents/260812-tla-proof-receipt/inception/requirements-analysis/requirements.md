# Requirements — Issue #2913: tla-authoring proof↔登録の循環依存解消

上流入力(consumes 全数): business-overview.md, architecture.md, code-structure.md

- 出典: [Issue #2913](https://github.com/amadeus-dlc/amadeus/issues/2913)(クロスレビュー2名成立 — ESTABLISHED_WITH_REFINEMENTS、run `xrev-2913-20260812`)、ミラー Issue #2917
- 測定 ref: origin/main `854692fd7a11b124236b0427fe3d59e2fe6bf785`(本 worktree HEAD)
- Depth: Minimal(FR 7件)/ 質問裁定: requirements-analysis-questions.md(Q1=A, Q2=A、semi 梯子)

## Intent 分析

`tla-authoring` の `author-new` route は新規 TLA+ モデルを proof referee で実TLC検証してから model-map へ登録する契約だが、production TLC adapter が proof 準備時に receipt を登録済み model-map から再検証するため、未登録モデルは構造的に `PreparationError/MODEL_RECEIPT` で拒否される(D1)。さらに identity 符号化が producer 間で分裂しており(D2)、D1 を直しても登録済みモデルの referee 経路は `SOURCE_IDENTITY` / `receipt differs` で拒否される。目標は、referee 経路を model-map から独立させつつ、production model-check の登録済み pin を一切緩めないこと。

欠陥の所在は RE で確定済み(codekb `architecture.md`「receipt 信頼境界の二重欠陥」節、`re-scans/260812-tla-proof-receipt.md`)。業務影響の出典は Issue #2913 影響・価値節(逐語「formal-model対象の新規subjectを持つworkflowがConstructionで停止する」— intent 260811 の park が実例、経緯は #2912 根拠節)。`business-overview.md` はこの欠陥自体を未記載だが、`:227`(形式モデル検査を早期実行するかリスク承知で後送するかの人間選択を守る利用者価値)と `:13-19`(formal-model-check advisory の品質ゲート価値)が、referee 経路の閉塞によって実行面を失う価値の正本である。パッケージ境界は `code-structure.md` のとおり plugin `plugins/formal-model-check/tools/` 配下に閉じる。

## 機能要件

### FR-1: referee 専用 receipt による未登録モデルの実TLC検証

referee 経路(`tla-referee-toolchain.ts`)は、明示された on-disk bytes・cfg・auxiliary modules・vocabulary へ束縛された referee 専用 receipt で、model-map 未登録のモデルとその mutant(falling/vacuity)を実TLCで検証できる。
受け入れ確認: 未登録の有限モデルで baseline・falling mutation・vacuity witness の全 run が `MODEL_RECEIPT` にならず TLC 実行へ到達する(実TLC統合テスト、Q1=A の実行面)。

### FR-2: identity 符号化の統一(D2)

`tla-referee-toolchain.ts:47` の identity 計算を loader/toolchain の decoded string 形(`tla-model-loader-internal.ts:279` / `fs-tlc-toolchain.ts:731` と同形)へ揃える(Q2=A)。object 形の受理を残す互換分岐は追加しない。
受け入れ確認: 同一バイト列に対し referee 形と loader 形の digest が一致する unit テスト。

### FR-3: 登録済みモデルの referee 経路通過(陽性対照)

model-map 登録済みモデル(例: `MirrorLifecycle`)とその mutant も referee 経路で拒否されない — クロスレビューが実測した第2ブロッカー(`receipt differs from the selected verified model`)の閉包。
受け入れ確認: 登録済みモデルの referee 経路が preparation を通過するテスト(D1 のみの修正では不合格になる対照)。

### FR-4: production model-map pin の非緩和

`VerifiedTlaModelReceipt` 経路(`validateVerifiedTlaModelReceipt`)の登録済み model-map 照合と未登録名拒否(`verified model is unavailable`)は無変更。referee 専用 receipt の構築手段は referee toolchain 側にのみ置き、production model-check の呼び出し面へ公開しない。
受け入れ確認: 未登録名の `VerifiedTlaModelReceipt` が引き続き拒否される既存挙動のピンテスト維持+referee receipt 構築子の非公開の機械検査。

### FR-5: fail-closed 境界の維持

referee 専用 receipt でも、module/cfg/auxiliary のバイト改変・path substitution・model name 不一致は proof 準備前に fail-closed で拒否される(`readVerifiedSourceBytes` の byte 照合は維持)。
受け入れ確認: 改変・差替・名前不一致の3系の落ちる実証(赤の実測→復元)。

### FR-6: validator 全消費者の受理

`validateModelCheckReceipt` の消費者は準備段 `fs-tlc-toolchain.ts:1641` と出力解析段 `tlc-toolchain.ts:647` の2箇所(RE 実測)。referee 専用 receipt は両方で受理され、片側修正による失敗の段移動を起こさない。
受け入れ確認: 両消費者を通過する統合テスト(実TLC完走を含む — Q1=A の実行面)。

### FR-7: production toolchain を通す author-new 統合テスト

author-new の proof 境界を production `FsTlcToolchain` で検証する統合テストを追加し、fake toolchain(`tla-authoring-e2e-driver.ts`)のみでこの境界を完了扱いにしない。実TLC を要するテストは formal-model-check 専用実行面に置き、日常 CI には TLC 非依存の受理・fail-closed テストのみ追加する(Q1=A)。
受け入れ確認: 修正前の production 経路で赤(`MODEL_RECEIPT` 再現)・修正後に green の対角実測を記録する。

## 非機能要件

- **NFR-1(決定性)**: referee 検証は同一入力バイトに対し決定的。TLC 実行環境はローカルでは `mise x java@temurin-26.0.1+8 -- bun ...` で固定(project.md `java-home-mise-shim-override`)。
- **NFR-2(回帰なし)**: 既存の登録済みモデル check・receipt drift 検査・toolchain output binding に回帰がない(既存テストスイート green 維持)。

## 制約

- production model-check の登録済み model-map pin は緩和しない(Issue 完了条件・FR-4)。
- referee 専用能力を production 経路へ漏出させない(受理面の分離)。
- TDD 既定(team.md `tdd-default-with-narrow-exceptions`): 各 FR は失敗テスト先行の vertical slice で実装する。
- 変更は plugin `plugins/formal-model-check/` とテスト面に閉じる(P5 surgical)。

## 前提

- TLC 実行は JAVA_HOME(temurin)と初回 jar 取得のネットワークを要する — 日常 CI に持ち込まない前提は Q1=A で裁定済み。
- `loadVerifiedTlaSourcesInternal` の root 選択能力は実在するが方針で封印されている(`:461-462`)— 本修正はこの seam を開けない(RE 確定の policy 制約)。

## スコープ外

- #2912(full autonomy の REPAIR_STALLED 未接続 — engine 面)
- #2915(STABLE_ID_RE 文法不整合 — PR #2911 で着地予定)
- `run-tests.ts` のスコープ機構拡張・formal-verif の日常 CI 組込み(Q1=A で不採用)
- `loadVerifiedTlaSourcesInternal` seam の公開・model-map root 選択の開放

## 未解決の問い

- なし(Q1/Q2 は semi 梯子で裁定済み — requirements-analysis-questions.md「裁定の記録」参照)。実装時の逸脱・新規判断は cid:requirements-analysis:implementation-deviation-election に従い停止→裁定。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-12T00:39:19Z
- **Iteration:** 1
- **Scope decision:** none

FR構成・裁定整合・引用currencyは全件良好だが、business-overview.mdへの実体なき引用1件(Q1裁定根拠として使用)の是正が必要

### Findings

- BLOCKER | requirements.md:13 / requirements-analysis-questions.md:5 の business-overview.md 引用が実体なし — 全域grep 0 hit。業務影響の出典を一次資料(Issue #2913 影響・価値節 / re-scan)へ引き直すこと

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-12T00:42:20Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の唯一の BLOCKER(business-overview.md への実体なき引用)は一次資料への帰属引き直しで解消。3点閉包確認(bo:227/:13-19 一致、Issue逐語 coordinator-snapshot 経由一致、是正diffに新規未検証主張なし)。他節は無変更

### Findings

- None
