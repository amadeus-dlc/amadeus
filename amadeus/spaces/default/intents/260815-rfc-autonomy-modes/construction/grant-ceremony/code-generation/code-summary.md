# Code Summary — unit grant-ceremony

> 実装: swarm batch 1(bolt-grant-ceremony、base main@2eb94f1e3)。5 commits。

## Commits
- `1557f6e52` feat(grant-ceremony): print paste-ready set-autonomy command after preview-autonomy
- `0dad641d4` test(grant-ceremony): pin omitted confirmedDisplayDigest as CONFIRMATION_REQUIRED
- `63412dc4d` test(grant-ceremony): add falling-proof for the paste-ready preview command
- `683052a69` test: adapt preview-autonomy stdout parsing to its new second line
- `455b089be` chore: regenerate coverage registry for new grant-ceremony test file

## 実装
- `amadeus-bolt.ts` preview-autonomy: JSON 1 行目は不変のまま、2 行目に貼り付け可能な `bun <harnessDir>/tools/amadeus-bolt.ts set-autonomy --mode full --confirmed-display-digest <digest>` を印字(mode は full 固定 — `prepareFullGrantCommand`:617 が digest 比較を持つ唯一の経路で、`prepareNonFullCommand`:641-659 は caller 供給値を無視するという実測に基づく。テンプレは `takeoverCommand()`(amadeus-caller-authorization.ts:167-169)の既存様式)
- 波及是正: 新 2 行目により stdout 全体を JSON.parse していた既存テスト 4 ファイル(t404/t414/t483/t435 ほか)を 1 行目 parse へ修正(自変更由来の失敗の是正 — production 挙動変更なし)

## 検証(実測 — builder notes 転記)
| 検査 | 結果 |
|---|---|
| Red(t3120 実装前) | Expected: 2 / Received: 1、exit 1(逐語 notes 保存) |
| Green(実装 + build 後) | t3120 1 pass / 10 expect、exit 0 |
| R-4 pin(t435 追補) | 実装変更なしで初回 green(1 pass / 16 expect)= 挙動不変 |
| 波及 8 ファイル | 78 pass / 0 fail(415 expect) |
| typecheck / lint / registry --check | exit 0 / exit 0(468 warn = 既存 baseline)/ exit 0 |

## 申し送り
- 逸脱: なし(JSON パース互換は「1 行目の parse 不変」で FD の要求を充足)
