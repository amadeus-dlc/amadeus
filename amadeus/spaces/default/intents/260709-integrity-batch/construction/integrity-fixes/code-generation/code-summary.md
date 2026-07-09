# Code Summary — integrity-batch(code-generation 3.5)

## 実装結果(4 Bolt、全て origin/main 0ba5aaaf2 起点・worktree 隔離並列)

### B1: #708 P1 — PR #716(bolt/708-mint-presence)

- 変更: `packages/framework/core/hooks/amadeus-mint-presence.ts` のみ(+生成6コピー)。stdin を読み、`prompt` が `<task-notification>` で始まる機械注入を positively 特定できたときだけ HUMAN_TURN の mint をスキップ。それ以外(TTY/空/非JSON/prompt 欠落/通常テキスト)は全て mint(fail-open、FR-1.5)
- 設計根拠: ライブセッションで実機キャプチャした UserPromptSubmit ペイロード(FR-1.2)。source 系フラグは不存在、判別子は prompt 接頭のみ。Stop-hook フィードバック/ターン途中注入は UserPromptSubmit を発火しない(実測)
- テスト: `tests/unit/t203-mint-presence-classify.test.ts`(7ケース)。赤の実証: 修正前 dist で Expected 0 / Received 1(exit 1)→ 修正後 7 pass(exit 0)。プライバシー: prompt はメモリ内 prefix 照合のみ、SENSITIVE マーカーで audit 非混入を実証
- 制約遵守: amadeus-state.ts / amadeus-lib.ts / amadeus-audit.ts 無接触(claude-3 と合意の編集順どおり。変更点直送済み)

### B2: #707 P2 — PR #715(bolt/707-codekb-refresh)

- 変更: per-intent スキャン記録 `codekb/<repo>/re-scans/<intent-record>.md` を新設(amadeus-lib.ts に純粋パスヘルパー4関数、amadeus-utility.ts に `codekb-path --re-scan`)。stage 定義に本文 last-writer-wins と pre-refresh 手順を明文化。既存 timestamp は鮮度ポインタに降格・残置(互換 read フォールバック分岐なし)
- テスト: `tests/unit/t203-codekb-rescan.test.ts`(5ケース、異なる intent が別パスに解決する FR-2.4 受け入れ基準を実挙動で検証)
- レビュー往復1回: stage 定義の base 点フォールバック自己矛盾(codex-3 指摘)→ df1c05fef で是正(absent 分岐を re-scans/ 内 newest observed commit or none に統一)→ READY

### B3: #705 P2 — PR #714(bolt/705-sdk-drive-calibration)

- 変更: `tests/harness/sdk-drive.calibration.test.ts` → `tests/integration/` へ編入(新機構ゼロでランナー発見+substrate skip ゲートを獲得)、doctor 期待値を現行出力に同期
- 赤の実証: 旧期待値で assertion throw(Issue 報告と同一)→ 新期待値 PASS。ランナー発見は base 比較で実証(origin/main: Test files 0 → PR: START/SKIP/DONE)
- ベースライン赤(worktree 環境依存 5+3件)は labeled-stash 比較で変更無関係を実証

### B4: #706 P3 — PR #713(bolt/706-knowledge-reference)

- 変更: `workflow-planning-guide.md:3` の参照を `{{HARNESS_DIR}}/knowledge/amadeus-product-agent/product-guide.md` へ(1行×7コピー)。package.ts の substituteToken が .md prose を置換することを実測確認
- レビュー READY(codex-1、独立実測込み)

## 検証(全 Bolt、conductor が独立再実行済み)

typecheck / lint / dist:check / promote:self:check / 該当テストプロファイル / coverage-registry --check — 全て exit 0(各 PR 本文に実測値記載)。

## レビュー分散

#713→codex-1 / #714→codex-2 / #715→codex-3 / #716→codex-1。全 PR スカッシュマージ・人間承認(leader 執行)待ち。

## 未消化・後続への引き継ぎ

- project.md Corrections「差分リフレッシュは前回スキャンコミットから」の文言は per-intent base 点定義への更新余地あり — memory 層は §13/practices ゲート経由(leader へ報告済み)
- #708 の判別子は実測に基づく prompt 接頭照合。harness が将来 source フィールドを提供すれば置換可能(enhancement 扱い)
