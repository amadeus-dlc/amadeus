# Integration Test Instructions — 260725-solo-standing-grants

上流入力（consumes 全数）: `construction/grant-authorization-domain/code-generation/code-generation-plan.md`、`construction/grant-authorization-domain/code-generation/code-summary.md`、`construction/solo-gate-transaction/code-generation/code-generation-plan.md`、`construction/solo-gate-transaction/code-generation/code-summary.md`、`construction/harness-contract-and-regression/code-generation/code-generation-plan.md`、`construction/harness-contract-and-regression/code-generation/code-summary.md`

- U1 の `code-summary.md` — `findSoloStandingGrant` が `intents.json` の検証済み・非 archived row だけを列挙元として audit shard を走査する契約を引き、実 FS を伴う corpus 構築を integration の責務と確定した。
- U2 の `code-summary.md` — route 時の protected receipt append、lock 内 commit 再検証、typed fallback、presence reservation state machine を引き、transaction 境界の検証対象とした。
- U3 の `code-summary.md` — 全6 harness 投影と drift 収束の所有を引き、harness contract の同義性検証を integration へ配置した。
- 各 unit の `code-generation-plan.md` — 変更面ファイル一覧を引き、下記の cross-unit 対象を確定した。

## 対象

| ファイル | 所有する契約 | trace |
|---|---|---|
| `tests/integration/t-solo-standing-grant-domain.test.ts` | active intent 限定の候補化、TTL 端数と expiry 等値の扱い、完全順序（失効降順 → 発行監査時刻降順 → Grant Id 昇順）、失効/取消/cross-intent/malformed/ambiguous の除外、exact lookup の判別、未登録・archived directory の混入防止、receipt lookup の exactly-one 判定 | FR-01, FR-02, FR-04, FR-05, FR-07 |
| `tests/integration/t-solo-gate-transaction.test.ts` | cursor 切替後の receipt owner への commit pin、reservation 経由の targeted human fallback、route 後の revoke / owner 変化 / carrier 不一致での fallback、Grant Id 差替え拒否、team mode carrier の mutation 前拒否、receipt 欠落の fatal、fallback 継続で body/reviewer/sensor/learnings を増やさないこと、duplicate receipt owner の fatal | FR-12〜FR-18, FR-23, NFR-01 |
| `tests/integration/t-solo-gate-transaction-seam.test.ts` | route transaction の protected receipt を carrier 返却前に append、Route Id 衝突時の append 前失敗、carrier route 下でも body/reviewer/sensor が各1回、per-unit iteration directive を route しないこと、presence reservation の armed→minted→consumed 一回性と他 session からの mint/consume 拒否 | FR-09, FR-22, NFR-01, NFR-02 |
| `tests/integration/t-solo-standing-grant-harness.test.ts` | 6 harness contract 投影、kiro-ide の session capability unavailable 宣言、opencode に degrade しうる prompt-hook mint site が無いこと | FR-24, FR-25 |
| `tests/integration/t-standing-grant.test.ts` | solo issue/revoke の CLI 契約、team output shape の非退行、fresh-human 要求、unknown mode、protected mint guard | FR-01, FR-03, FR-19, NFR-05 |

## 実行方法

```
bun test tests/integration/t-solo-standing-grant-domain.test.ts \
         tests/integration/t-solo-gate-transaction.test.ts \
         tests/integration/t-solo-gate-transaction-seam.test.ts \
         tests/integration/t-solo-standing-grant-harness.test.ts \
         tests/integration/t-standing-grant.test.ts
```

全体回帰は `bash tests/run-tests.sh --ci`。unit と同じく、path 列挙時は事前の実在確認と実行後の `Ran ... across M files` 照合を行う。

## 環境とデータ管理

各テストは一時ディレクトリに space / intent / audit shard を構成し、`intents.json` の row 登録状態（登録済み・未登録・archived）を明示的に作り分ける。clock と revocation は seam 注入で決定的に制御し、実時間の sleep に依存しない（NFR-02）。cursor（active-intent）を切り替える検証は自テスト内の一時ワークスペースに限定し、実 record を汚染しない。

## 実測結果

| ファイル | pass | fail | expect() | 所要 |
|---|---:|---:|---:|---:|
| `tests/integration/t-solo-standing-grant-domain.test.ts` | 18 | 0 | 52 | 168ms |
| `tests/integration/t-solo-gate-transaction.test.ts` | 10 | 0 | 80 | 751ms |
| `tests/integration/t-solo-gate-transaction-seam.test.ts` | 9 | 0 | 31 | 78ms |
| `tests/integration/t-solo-standing-grant-harness.test.ts` | 25 | 0 | 236 | 56ms |
| `tests/integration/t-standing-grant.test.ts` | 48 | 0 | 99 | 262ms |
