# Decision Log — answer-preemption-guard(ideation)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`。

## 決定一覧

| # | 決定 | 根拠 | 出典(検証可能) |
|---|------|------|----------------|
| D1 | intent scope = amadeus | ユーザー裁定(scope 統一周知) | 全員周知 21:03:24Z/精密化 21:06:04Z(agmsg 出典)。state の Scope: amadeus は git 検証可 |
| D2 | (a)sensor/(b)lint 併用可否は application-design で判断 | leader ディスパッチ(ユーザー指示)の pre-approved 分岐 | ディスパッチ 20:59:49Z(agmsg 出典)、intent-statement に転記済み(git) |
| D3 | 述語意味論は不変(発火点追加のみ) | #1101 確定済み実装の再利用 | amadeus-lib.ts:1173(git)、Issue #1101 クローズコメント |
| D4 | 旧様式 corpus の遡及是正は OUT | #1106 cutoff 設計の継承 | PR #1106(MERGED)、corpus sweep 実測(fails 0) |
| D5 | E-OC1 判定は各ステージ 0問で leader 承認 | 3段順序の執行 | IC 21:06:38Z / FS 21:16:23Z / SD 21:21:18Z(agmsg 出典)、questions ヘッダ記入は git 検証可 |

## 未決事項(design へ引き継ぎ)

(a)/(b) 併用可否と cutoff canonical 化の2点のみ(D2 の pre-approved 分岐)。他に未決なし。
