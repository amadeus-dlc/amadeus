# Build and Test実測結果

## 実行対象

`code-generation-plan.md`と`code-summary.md`に記録されたregistry drift guard、関連回帰、生成面を対象とする。

## 実行環境

- 実行日時: 2026-08-02T23:47:57Z
- Bun: 1.3.13
- live AWS／Claude substrate: 資格情報またはsubstrate不在のため既存の該当テスト24ファイルをskip。repository-native runnerの規定動作であり、今回のguard境界には依存しない。

## ビルド・静的検証

| 検証 | 結果 | 実測 |
|---|---|---|
| `bun run typecheck` | PASS | exit 0 |
| `bun run lint` | PASS | exit 0。既存baselineの383 warnings／23 infos、error 0 |
| `bun tests/gen-coverage-registry.ts --check` | PASS | registry fresh |
| `bun scripts/package.ts --check` | PASS | 7 harnessすべて一致 |
| `git diff --check` | PASS | whitespace error 0 |
| `bun run promote:self:check` | KNOWN FAIL | exit 1。開始前から保護対象の`.codex/skills/amadeus-*`が31件ORPHAN。core面のDIFFERS／MISSINGは隔離確認で0 |

依存追加はなく、`package.json`と`bun.lock`に差分はない。

## テスト結果

| テスト | 結果 | 実測 |
|---|---|---|
| Focused regression 8 files | PASS | 206 pass／0 fail／383 expect |
| size drift + t416 integration再確認 | PASS | 20 pass／0 fail／56 expect |
| 初回`bun run test:ci` | FAIL→修正 | 753 files／10,171 assertions中1 failure。追加integration testの`size: small`が実測`medium`と不一致 |
| 修正後`bun run test:ci` | PASS | 753 files／10,171 assertions／failed files 0／failed assertions 0 |

初回失敗は`tests/integration/t416-registry-drift-guard.integration.test.ts`の宣言を`size: medium`へ修正した。再発防止guard自身と対象integrationを単独実行してgreenを確認してから、全体を再実行した。

## 非適用・既知の制約

- 専用performance test: N/A。定量性能NFRと新規runtime workloadがない。
- 専用security test: N/A。認証、network、secret、dependency、deploymentの攻撃面追加がない。空抽出・重複・差分はfail-closedのunit testで確認した。
- 専用E2E追加: N/A。新規利用者journeyがなく、live filesystem＋実shell processが変更境界の最外層である。repository全体の既存E2Eは`test:ci`に含めて実行した。
- 通常promotion checkの31件ORPHANは本変更外のplugin overlayであり、保護対象を削除せず未達として残す。Acceptance 7はこの制約により厳密には未充足だが、他のbuild／test gateはgreenである。

## 判定

通常promotion checkの既知制約を除き、実装と検証はbuild-ready／test-ready。deployment対象はないためdeployment-readyはN/Aとする。
