# Code Summary — fix-1080-diary-ensure-exists

## 上流入力(consumes 全数)

requirements.md(FR-1〜5)、code-generation-plan.md(変更目録・落ちる実証計画)、RE scan-notes。

## 成果

- bolt: `bolt/260716-diary-ensure-exists` @ **54484a089**(a3f1b7a02 実装+54484a089 是正)(origin/main c12593303 起点)、**PR #1088** https://github.com/amadeus-dlc/amadeus/pull/1088(レビュアー e2 — leader 指名)
- 本線ミラー: 72c98c348(E-PM2 M1 経路(a)。dist/cursor 3ファイルは自ブランチ base に cursor ツリー不在のため omit — 顕名記載、PR head は完全)

## 要件閉包(実測)

| AC | 結果 | エビデンス |
|----|------|-----------|
| AC-1a(冪等・絶対非上書き) | PASS | never-overwrite テスト+idempotent テスト green。落ちる実証: `false &&` 注入で両テスト FAIL → 復元で 4 pass |
| AC-1b(harness dir 解決・memoryTemplatesDir 不使用) | PASS | `harnessDir()` 使用(AMADEUS_HARNESS_DIR env seam)。memoryTemplatesDir への参照ゼロ(grep 0件)。テンプレート欠落は stderr 警告+"template-missing" 返却で続行(無音 fail-open なし) |
| AC-1c(全 directive 発行経路) | PASS | `buildRunStageDirective` 内の単一呼び出し(:1175)— 全5呼び出し元が通る。`recordPrefix !== null && codekbCtx` ガードで pre-birth shell 除外 |
| AC-1d(テンプレート byte 一致) | PASS | created テストで byte equals 検証+dogfooding で cmp 一致 |
| AC-2a/2b/2c(落ちる実証・in-process) | PASS | tests/integration/t-ensure-stage-diary.test.ts(4テスト)。注入 FAIL 2件→復元 green。lib は既計測モジュール(lcov 常駐、新規行 zero-hit ゼロ) |
| AC-3a/3b/3c(docs 4記述棚卸し) | PASS | conductor.md 更新(engine 生成+fallback copy)、CLAUDE.md ×2 無変更で真、stage-protocol :941 維持(fallback として真 — 変更せず) |
| AC-4a/4b(typecheck/lint/dist 同期) | PASS | 全 exit 0(dist×6+self-install×2 再生成) |
| AC-4c(smoke+registry+lcov) | PASS | smoke RESULT: PASS、gen-coverage-registry 再生成後 green、lcov: lib 新規行 zero-hit 0・orchestrate 配線行 :1175 DA=315 |
| AC-4d(dogfooding) | **PASS** | 本 intent の next 再実行で construction/code-generation/memory.md が**自動生成**され、テンプレートと cmp byte 一致(2026-07-16T10:15Z 実測)— 本修正が自分の record で実演 |

## iteration 2(是正2件、reviewer READY GoA 1 で閉包)

- **covers トークン**(stage reviewer iteration 1 REVISE): `lib:` は registry の join key でなく function:ensureStageDiary が coveredBy:[] UNCOVERED と誤記録 → `function:` へ是正、registry/ratchet 再生成(function baseline 108→109 の正当増加)
- **t135 CI 赤**(自変更由来と実文帰属): 新 stderr 警告がテンプレート不在 fixture で出て、t135 runNext の stdout+stderr 連結 JSON.parse を崩した → directive パースを stdout 限定へ是正(エンジン emit は stdout=directive / stderr=advisory の実契約 — orchestrate :179 実測)。ローカル full --ci スイート RESULT: PASS / exit 0

## 逸脱・是正(顕名)

- 新テストの初期配置 tests/unit/ が size purity(unit max small)+宣言過小 drift の既存2ゲートで赤 → e1 前例(state-set-failclosed の integration 移設)の適用で tests/integration/+`// size: medium` へ是正。要件逸脱ではなくテスト配置の是正(leader 了承済み 10:14:56Z)

## フォロー

PR #1088 CI green → e2 レビュー → ユーザーマージ承認 → 着地 grep → Issue #1080 クローズ+ラベル除去(FR-5)。
