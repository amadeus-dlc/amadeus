# #1664 Code Generation計画

## 対象と追跡

- 対象Issue: [#1664](https://github.com/amadeus-dlc/amadeus/issues/1664)
- 対応要件: FR-1664-1〜3、FR-CROSS-1〜4、NFR-1、NFR-4〜6
- 配送単位: 1 Issue = 1 Bolt = 1 [GitHub Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)
- 変更方針: まず非0時のstdout／stderr／終了経路を必ず残し、symlink解決、clone-id導出、process起動、fixture cleanupのどこがstatus 1を発生させるか決定的に再現する。診断追加だけではcloseせず、fixtureごとのaudit-lock namespace隔離まで行う。

## 実装手順

- [x] **Step 1 — 非0時診断をRedで固定する**: 2026-07-28のCI失敗ログで、`result.status=1`以外のsubprocess証拠が失われる既存Redを確認した。
- [x] **Step 2 — 失敗時だけ診断を保持する**: command、status、signal、spawn error、stdout、stderr、clone-idの論理path／target pathを含む失敗messageを追加し、成功時出力は変更しない。
- [x] **Step 3 — 根因候補を分離する**: exit-status、signal、spawn-errorの3終了経路を制御結果で固定し、既存fixtureのsymlink拒否、doctor置換、rollback、cleanup順序と照合した。
- [x] **Step 4 — productとfixtureを判定する**: 生存中processが共有audit-lockを占有するfixtureを注入し、修正前にdoctorのlock取得失敗から同じstatus 1へ決定的に到達した。migration subprocessへfixture固有の`.git`配下lock baseを渡すと同条件でGreenになり、productのclone-id処理ではなくtest process間の共有lock namespaceが根因であると判定した。
- [x] **Step 5 — symlink不変条件を検証する**: 同じtargetを指すclone-id symlinkからstable clone-idを導出し、target内容、symlink種別、Git workspaceを変更しない既存caseをGreenで確認した。
- [x] **Step 6 — rollback／audit互換を検証する**: t224全体61 PASSでdoctor失敗rollback、audit event、symlink拒否の隣接casesを確認した。
- [x] **Step 7 — 品質と配布を確認する**: 対象5 PASS、t224全体62 PASS／571 expects、coverage runner並列4で62 PASS、typecheck、lintを通過した。test-only変更のためpackage／promote生成は不要。
- [x] **Step 8 — 変更提案証拠をまとめる**: 診断、決定的Red→Green、coverage、互換証拠を完了summaryへ記録した。

## 完了条件

- 非0時にcommand、status、signal、spawn error、stdout、stderr、symlink pathを取得できる。
- status 1の直接原因を制御fixtureで確定し、その根因を最小修正している。
- symlink target、clone-id安定性、workspace／index rollback、audit event契約を維持する。
- 診断追加だけ、反復Greenだけ、timeout延長だけで完了扱いにしない。
