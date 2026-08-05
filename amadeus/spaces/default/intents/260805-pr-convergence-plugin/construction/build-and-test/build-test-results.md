# Build and Test Results: pr-convergence plugin

上流入力(consumes 全数): build-instructions、unit-test-instructions、integration-test-instructions、performance-test-instructions、security-test-instructions

測定 ref: conductor ブランチ worktree-issue-1971-pr-convergence(base = origin/main e6179d7c3、統合3コミット+record)。各 unit の実装実績・TDD 記録は construction/<unit>/code-generation/ の code-generation-plan(計画・Red→Green 実測列)と code-summary(変更ファイル・検証結果)を一次入力とする。

## 実測結果(conductor 統合断面 — 2026-08-05)

| 検証 | コマンド | 結果 | exit |
|---|---|---|---|
| フル CI | `bash tests/run-tests.sh --ci` | **Test files: 847 / Failed files: 0 / Total assertions: 11247 / Failed assertions: 0 / RESULT: PASS** | 0 |
| 型検査 | `bun run typecheck` | pass | 0 |
| リント | `bun run lint` | pass(既存 warning のみ) | 0 |
| ビルド | `bun run build` | 全ハーネス再生成+import closure 通過(NFR-4)+tracked 不変 | 0 |
| 新設+plugin 系11スイート | `bun test t444…t450, t301, t252, t254, t299, t340, t377` | 174 pass / 0 fail / 712 expect(batch1 断面)+45 pass / 0 fail(t449/t450/t93 — batch2 断面 build 後) | 0 |

builder 側の独立実測(isolation worktree): U2 = test:ci 843 files PASS / U3 = test:ci 847 files 0 fail **×2回連続**。

## 受け入れ基準(Issue #1971 受け入れの目安)の閉包

1. **目安1(NFR-1)**: t449 で両側実証 — install 済み+レポート1件不在 → `next` が同一 batch を再発出(落ちる実証、実測)/ 未 install の同一 fixture → 前進(対照)。パス厳密性(per-unit ディレクトリ外は不可)も固定
2. **目安2(NFR-2)**: t446 で `replied-unresolved` fixture が収束不成立(赤)。述語は4区分+UNKNOWN-retry+mergeStateStatus CLEAN 接地の単一定義(検査はセンサーに置かず advisory — t450 が様式11 赤ケースを固定)
3. **目安3(NFR-3)**: t447 で GraphQL 実測 fixture(実4件+合成2件)からの機械導出を固定 — 全数ページング・`__typename` bot 判定・severity 転記・終端処理抽出

## Verdict: READY(申し送り付き — c2-unconditional-ready-boundary の実文照合)

未検証面(いずれも FR/NFR の受け入れ基準実文の外 — requirements.md との照合済み):

- 実 GitHub API への status/report/override のライブ実行(テストはシーム注入+実測 fixture。A-1 の語彙実測は完了済みで、AC が要求する「fixture で赤くなる実証」「機械導出のテスト固定」は充足。ライブ疎通は運用初回に確認される面)
- 実 amadeus-log.ts decision の実プロセス spawn 疎通(同上 — override の emit 契約はシームで assertion 固定済み)
- no-silent-drop の BASELINE_INVALID は base 由来(census 寄与 0 件を census-evidence で確認済み)— rebind は PR 作成時に conductor が単独コミット(c3-nsd-rebind。CI の当該ゲートは PR で判定される)

既存の無関係な警告: t05/t17 の size classification 注記(declared=medium measured=large)は負荷起因の実測揺れで、ベースラインでも出る既知の注記(FAIL ではない)。
