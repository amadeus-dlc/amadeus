# Decision Log — 260720-hold-choice-resolution(ideation)

上流入力(consumes 全数): intent-statement.md、scope-document.md、intent-backlog.md、feasibility-assessment.md、constraint-register.md

## 決定一覧

| # | 決定 | 出典 | 種別 |
| --- | --- | --- | --- |
| D-01 | #1267 を scope=amadeus・4 intent 並列の1として起動 | leader ディスパッチ 2026-07-20T02:47:29Z+02:47:57Z(agmsg) | ユーザー承認済み編成 |
| D-02 | e4 バッチと関数単位完全非交差・worktree 並行・後着側再接地・変動時相互通知 | e4 相互確認 02:50:58Z(agmsg)、leader 報告済み | 並行合意 |
| D-03 | E-TCRCG=A(二値維持)を変更せず追加語彙で拡張。契約変更該当性は RA 判定+該当時エスカレーション | E-TCRCG record+ディスパッチ要件(3) | 既決裁定の引き継ぎ |
| D-04 | IC 3問・FS 1問・SD 1問は E-OC1(承認 02:49:41Z / 02:54:58Z / 03:05:00Z) | 各 questions ヘッダ | E-OC1 |
| D-05 | feasibility 初回の stale tree 誤実測は leader 照会で捕捉→再接地(289d162ae)→全 seam 再実測で是正。ギャップ実装点 = rulingOverride 文字列合成(election.ts:390-392) | E-HCRFS 裁定(独立照合 e4/e1)+diary Deviation | 是正記録 |
| D-06 | §13 は IC(E-HCRIC)/FS(E-HCRFS)/SD(E-HCRSD)いずれも 0件で可 2-0 | leader 開票通知 | 選挙裁定 |

## 未決事項(Inception 以降へ)

- 契約変更該当性の判定(RA — B-1)。
- choice 指定の CLI 構文・二値共存形(design 選挙 — B-1)。
