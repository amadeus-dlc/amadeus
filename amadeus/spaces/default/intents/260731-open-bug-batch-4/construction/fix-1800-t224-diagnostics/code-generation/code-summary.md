# Code Summary — fix-1800-t224-diagnostics

上流入力(consumes 全数): requirements.md — FR-2a〜2c の充足状況を本書で対応付ける。

## 実装(PR #1820、branch bolt/fix-1800-t224-diagnostics、commits 1e32f0553 + 4ddbb824b)

変更は `tests/integration/t224-upstream-v2-migration-cli.test.ts` の1ファイルのみ(+191/−28)。本番コード追加行 0。

- **FR-2a(診断対称化)**: `expectSuccessfulMigration` を期待 exit code 引数化した `expectMigrationExit` へ一般化し、:1411 の素の `expect(collided.status).toBe(1)` を置換。赤のとき exit path(exit-status/signal/spawn-error)・status・signal・error・command・stdout・stderr を全出力。既存6呼び出しは 0 期待ラッパ経由で無変更。実地確認: 修正前「Expected: 1 / Received: -1」のみ → 修正後「exit path: signal / signal: SIGTERM」等の全診断。
- **FR-2b(限定リトライ)**: `runMigrationProcess` の spawnSync を `runWithSpawnRetry` 経由へ — `result.error` が EAGAIN/EMFILE/ENOMEM のときのみ 50ms×試行回数のバックオフで最大2回再試行(SPAWN_RETRY_LIMIT=2)。signal・exit-status・ENOENT は非リトライ。発火は console.warn に記録。
- **FR-2c(検証形の受理条件)**: 3分類 fixture を `EXIT_CHANNEL_CASES` へ抽出し既存テストと新規診断テストで共有。リトライ発火条件を全分岐テスト固定。

## テスト(FR-2 受け入れ基準との対応)

- 基準1(Red→Green): Red = ReferenceError(Ran 0 tests)→ Green = 73 pass / 0 fail。**落ちる実証** = SPAWN_RETRY_LIMIT 2→0 注入で EAGAIN/EMFILE/ENOMEM の3件赤 → fix コミットから復元 → green 再実測(head 非残留)。
- 基準2: 診断の失敗描画(status/signal/error 併記)をテスト固定+bun 既定 5000ms タイムアウト下での実地確認(base でも同一再現 = 実行方法起因と確定、正規ランナーは --timeout=30000)。
- 基準3: t224 全体 73 pass / 0 fail。

## 検証(個別直書き・exit code 実測)

typecheck 0 / lint 0(対象ファイル指摘 0)/ biome check 単体 0 / `bun test --timeout=30000 t224` 0(73 pass)/ dist:check 0 / promote:self:check 0(いずれも非接触確認)。PR CI 全 green・MERGEABLE・thread 0(CodeRabbit Minor 1件 = バックオフ値の固定検証を反映済み)。

## 同根確認・申し送り

t224 内の素の nonzero-status 照合は grep 0 件(完了)。期待 0 の `toBe(0)` 約30箇所は同じセンチネル構造で診断が薄いが FR-2 スコープ外 — 別 Issue 化の判断事項として報告。
