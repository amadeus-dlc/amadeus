# Decision Log — standing-delegation-grant

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`

## 確定事項(裁定・承認済み)

| # | 決定 | 出典(git で検証可能な事実 / agmsg 出典の事実を分離) |
|---|---|---|
| D-1 | 着手: leader ディスパッチ+ユーザー事後承認で継続 | agmsg 出典: leader 中継 2026-07-17T01:45:44Z |
| D-2 | チームモード限定(env 唯一判定・両側 fail-closed) | git: Issue #1125 コメント(ユーザー指示固定)。intent-statement 成功基準7へ焼き込み済み |
| D-3 | IC Q1-Q4 / FS FQ3 / SD SQ1-SQ3 の E-OC1 既決導出 | git: 各 questions ファイルの証跡ヘッダ(承認 TS 01:19:06Z / 01:50:14Z / 02:04:13Z — agmsg 一次記録の転記) |
| D-4 | 既存 delegate 併存 = 単一検証器の分岐(Forbidden 非該当) | git: scope-document.md「互換性の位置づけ」節 |

## 未決事項(inception/construction へ)

| # | 未決 | 受け皿 |
|---|---|---|
| U-1 | FQ1 グラント保存・配送形態 | application-design 選挙 |
| U-2 | FQ2 撤回伝播モデル | application-design 選挙 |
| U-3 | FQ4 session 終了失効の採否 | requirements/design 選挙 |
| U-4 | TTL 具体値 | design(constants-from-code) |

## delegate 証跡の所在(本 intent の取込列)

IC: d9889ae91+issuerHumanTs 同伴 e3dd7772f(01:41:00Z)/ FS: 01a3f0ee5(02:01:16Z)/ SD: 72e479ae3(02:22:33Z)— いずれも cherry-pick 済み・シャード prefix 機械実測で解消(cross-worktree-delegate-delivery 準拠)。
