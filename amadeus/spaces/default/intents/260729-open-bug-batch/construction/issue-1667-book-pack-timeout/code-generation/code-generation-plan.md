# #1667 Code Generation計画

## 対象と追跡

- 対象Issue: [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667)
- 対応要件: FR-1667-1〜3、FR-CROSS-1〜4、NFR-1〜2、NFR-6
- 配送単位: 1 Issue = 1 Bolt = 1 [GitHub Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)
- 変更方針: 120秒の外側test timeoutと180秒のchild timeoutの矛盾、並列resource contention、cleanup競合をEvidence-firstで区別する。timeout延長やserial化だけでは完了としない。

## Blast Radiusとbaseline

| 区分 | 対象 | 影響 |
|---|---|---|
| test driver | `tests/integration/book-pack-verify.test.ts` | 外側／内側budgetと失敗診断。Issueの直接症状 |
| verifier | `book-pack/scripts/verify-dummy.sh` | 根因がcleanup所有権または共有temp資産の場合だけ最小変更 |
| runner | `tests/run-tests.ts`とtest size registry | 並列分類を変える場合の根拠確認。先に変更しない |
| integration | 新規または既存book-pack fixture | 遅延・cleanup競合を制御注入するRed／Green |

実装前baselineは、対象test単独、coverage相当の並列帯、既存`bun run test:ci`の結果を分けて記録する。既知のcold compile timeoutは対象ファイルを`bun test --timeout 120000`で再確認し、本Issueの再現と混同しない。

## 実装手順

- [x] **Step 1 — timeout budgetを計測可能にする**: FR-1667-1へ追跡し、外側test上限、`spawnSync`上限、cleanup開始／完了を同じms単位で記録する制御lifecycleを用意する。成功時ログは増やさない。
- [x] **Step 2 — 修正前Redを確立する**: 同じ純粋budget判定へ旧値と新値を入力し、旧`180000 + 30000 <= 120000`をfalse、新`180000 + 30000 <= 210000`をtrueと固定する。
- [x] **Step 3 — temp資産の所有権を照合する**: verifierの`mktemp -d ...XXXXXX`とprocess-local `EXIT` trapを確認し、実verifier終了後に出力workspaceが消えていることを回帰testで固定する。共有cleanupの証拠がないためscriptは変更しない。
- [x] **Step 4 — budget契約を最小修正する**: child最大時間＋cleanup bufferが外側上限内へ収まる定数関係をコードまたはtest説明で固定する。実測が120秒内の安定完了を否定する場合だけ、根拠付きで分類または外側上限を変更し、内外矛盾を残さない。
- [x] **Step 5 — 失敗診断を保つ**: child非0、signal／timeout、stdout、stderrを失敗時だけ提示し、実際のpack検証失敗とcleanup noiseを区別する。
- [x] **Step 6 — Greenを検証する**: 制御遅延Red、対象test単独、runnerのserial／parallel境界を実行する。wall-clock反復だけを合格根拠にせず、決定的fixtureを必須とする。
- [x] **Step 7 — 横断品質を確認する**: `bun run typecheck`、`bun run lint`、対象test、`bun run test:ci`、必要なcoverage実行、`git diff --check`を実行する。core／harnessを変更した場合だけpackage／promote drift guardを追加する。
- [x] **Step 8 — 変更提案証拠をまとめる**: 直接原因、測定値、内外budget、Red／Green、関連suiteをcode-summaryへ記録し、[#1667](https://github.com/amadeus-dlc/amadeus/issues/1667)だけをclose対象とする。

## 完了条件

- 確定したtimeout budget矛盾と、直接原因を断定しないresource contention／cleanup noiseを区別して記録している。
- child timeoutと外側test timeoutに論理矛盾がなく、cleanup bufferを含む。
- resource-intensive verifierをrunnerの並列帯から分離し、cleanup noiseが偽赤を作らない。
- timeout延長、serial化、診断追加の単独対策ではなく、budget契約・実行分類・失敗診断を一体で固定している。
