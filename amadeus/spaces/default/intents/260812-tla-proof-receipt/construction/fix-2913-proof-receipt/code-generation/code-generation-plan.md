# Code Generation Plan — fix-2913-proof-receipt

上流入力(consumes 全数): requirements.md(FR-1〜FR-7・NFR-1〜2・制約・前提)。unit 系設計成果物(functional-design/nfr-design/infrastructure-design)は self-fix スコープの SKIP 解決により不在(consumes_absent)— 設計判断は requirements.md と codekb(architecture.md「receipt 信頼境界の二重欠陥」節)から導出する。

- unit: `fix-2913-proof-receipt` / branch: `fix/2913-tla-authoring-proof-receipt`(本 worktree、base = origin/main `854692fd7`)
- 方式: TDD(team.md `tdd-default-with-narrow-exceptions` — 各 slice で Red 実測 → 最小実装 → Green)
- 受け入れ基準の述語は requirements.md から逐語で写す(縮小しない — cid:code-generation:c3-260803-state-integrity)

## Step 1: D2 — identity 符号化の統一(FR-2)

- Red: 「同一バイト列に対し referee 形と loader 形の digest が一致する unit テスト」を追加し、現行 `tla-referee-toolchain.ts:47`(object `{bytes: base64}` 形)で赤を実測。
- Green: `tla-referee-toolchain.ts:47` の identity 計算を loader/toolchain の decoded string 形(`tla-model-loader-internal.ts:279` / `fs-tlc-toolchain.ts:731` と同形)へ揃える(Q2=A)。object 形の受理を残す互換分岐は追加しない。

## Step 2: D1 — referee 専用 receipt の導入(FR-1 の受理面)

- Red: referee 専用 receipt(on-disk byte binding)を `validateModelCheckReceipt` が受理することを期待するテストで赤(現行は判別 union 外)。
- Green: 第3の receipt 種別(referee/workshop receipt — 明示 on-disk bytes・cfg・auxiliary・vocabulary へ束縛)を判別 union へ追加し、self-contained 検証枝(exact shape + byte identities + vocabulary、model-map 非参照)を実装。構築関数は referee toolchain 側にのみ置く(FR-4 の非漏出制約)。

## Step 3: validator 全消費者の受理(FR-6 受理面)

- `validateModelCheckReceipt` の消費者2箇所 — 準備段 `fs-tlc-toolchain.ts:1641` と出力解析段 `tlc-toolchain.ts:647` — の両方で新種別が受理されることを unit テストで固定(「片側修正による失敗の段移動を起こさない」)。

## Step 4: fail-closed 境界(FR-5)

- 逐語 AC: 「referee 専用 receipt でも、module/cfg/auxiliary のバイト改変・path substitution・model name 不一致は proof 準備前に fail-closed で拒否される(`readVerifiedSourceBytes` の byte 照合は維持)」。
- 「改変・差替・名前不一致の3系の落ちる実証(赤の実測→復元)」を実施し記録する。

## Step 5: production pin の非緩和(FR-4)

- 逐語 AC: 「未登録名の `VerifiedTlaModelReceipt` が引き続き拒否される既存挙動のピンテスト維持+referee receipt 構築子の非公開の機械検査」。
- 既存ピンテストの green 維持を確認し、構築子非公開の機械検査(export 面 grep or 型検査)を追加。

## Step 6: 実TLC 統合検証(FR-1 / FR-3 / FR-6 / FR-7)

- 専用実行面(Q1=A): 実TLC を要するテストは formal-model-check 専用実行面に置き、日常 CI には TLC 非依存の受理・fail-closed テストのみ追加する。
- FR-1 逐語 AC: 「未登録の有限モデルで baseline・falling mutation・vacuity witness の全 run が `MODEL_RECEIPT` にならず TLC 実行へ到達する(実TLC統合テスト)」。
- FR-3 逐語 AC(陽性対照): 「登録済みモデルの referee 経路が preparation を通過するテスト(D1 のみの修正では不合格になる対照)」。
- FR-7 逐語 AC(対角実測): 「修正前の production 経路で赤(`MODEL_RECEIPT` 再現)・修正後に green の対角実測を記録する」。実行は `mise x java@temurin-26.0.1+8 -- bun ...`+`--provider docker`(NFR-1)。

## Step 7: 回帰検証(NFR-2)

- `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` 相当の対象スイート+既存の登録済みモデル check・receipt drift 検査・toolchain output binding の green 維持。フルスイートは conductor が1回通す(cid:code-generation:c3-conductor-runs-full-suite)。

## Step 8: 配送(外部 CLI 生成物を含む — cid:code-generation:c1-tsr-external-cli-produces)

1. builder 完了 → code-summary.md 起草
2. Bolt PR 発行(独立 PR — #2838 の PR #2911 とは分離)
3. pr-convergence plugin CLI で収束ループ → `pr-convergence-report.md` 生成(本ステージ produces の機械生成物 — ゲート提示前の明示ステップ)
4. §12a レビュー(architecture-reviewer、max 2)→ approve

## 逸脱規律

- 承認済み要件・設計から逸脱する必要に気づいたら実装前に停止して裁定(cid:requirements-analysis:implementation-deviation-election)。既存様式への準拠と判断する場合も停止対象(deviation-applicability-not-solo)。
- 検証は同期(フォアグラウンド)で完遂し、モニタ/バックグラウンド待ちでターンを終えない(builder-prompt-sync-completion)。
