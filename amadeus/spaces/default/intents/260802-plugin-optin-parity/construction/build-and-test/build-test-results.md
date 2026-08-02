# Build and Test Results — plugin-optin-parity

`code-generation-plan.md` と `code-summary.md` に対するComprehensive検証の実行記録である。

## 実行状態

全検証Green。`bun run coverage:ci` は通常の全CI runnerをcoverage付きで実行するため、Build and Testにおけるfull CIとcoverageの両方の証跡として採用した。

## Build・静的検証

- `bun install --frozen-lockfile`: exit 0。lockfile差分なし。
- `bun run typecheck`: exit 0、型エラー0。
- `bun run lint`: exit 0、error 0、既存warning 371、info 22。
- `bun scripts/package.ts --check`: 7 harnessすべてOK。
- `bun run promote:self:check`: OK。
- `bun run distribution:check`: 412 payloads、44 topics、416 files、drift 0。

## 対象テスト

- unit: 6 files、65 pass、0 fail、156 assertions。
- integration: 11 files、113 pass、0 fail、378 assertions。
- E2E: 2 files、11 pass、0 fail、362 assertions。7 faceのcurrent-host限定、非current host byte不変、未選択zero-impactを確認した。
- performance: 1 file、1 pass、0 fail、495 assertions。

## Performance実測

| シナリオ | baseline p95 | auto p95 | 判定 |
|---|---:|---:|---|
| 未選択 | 0.022041 ms | 0.224083 ms | PASS |
| current | 0.741625 ms | 3.685958 ms | PASS |
| 初回導入 | 19.37825 ms | 12.307792 ms | PASS |

未選択・currentは各100 sample、初回導入は各30 sampleであり、すべてNFR-4の `max(20%, 25ms)` / `max(20%, 50ms)` 予算内だった。

## Security・依存関係

- plugin名validation、path containment、利用者管理staging保持、4 surface transaction rollbackを対象integrationで再検証し、失敗0。
- `bun audit --production`: exit 0、脆弱性0。
- `git diff --exit-code -- package.json bun.lock`: exit 0。新規dependency差分なし。
- DAST、認証・認可、AWS/IaC scanは、HTTP service・identity・infrastructure変更がないため非適用。

## Coverage・全CI

- `bun run coverage:ci`: exit 0、RESULT PASS。
- Test files: 739、Failed files: 0。
- Total assertions: 10,000、Failed assertions: 0。
- line coverage: 55,990 / 62,385（89.75%）。
- function coverage: 4,595 / 5,775（79.57%）。
- coverage registry freshness / ratchet: PASS。
- coverage report: `coverage/lcov.info`。
- AWS資格情報が無効または期限切れのためlive SDK test、Claude substrateが利用できないためderived live mechanism testは、正規runnerの契約どおりSKIP。機能失敗・timeoutは発生していない。
- wall-clock driftは5 filesで観測されたが、全ファイルがPASSし、既知の実行時間分類上の情報である。

## 合格条件

- build/typecheck/lint/package/promotion/distribution: exit 0。
- test: failed file 0、failed assertion 0。
- performance: NFR-4のp95予算内。
- security: 対象regression 0、新規dependency差分0。既存advisoryは別欄で開示する。

## Failure details

なし。failed file 0、failed assertion 0、timeout 0。
