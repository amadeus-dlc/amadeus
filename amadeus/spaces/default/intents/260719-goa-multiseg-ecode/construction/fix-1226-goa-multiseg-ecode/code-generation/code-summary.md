# Code Summary — fix-1226-goa-multiseg-ecode

上流入力(consumes 全数): requirements.md(per-unit 設計6点は bugfix degrade スコープの consumes_absent 宣言どおり不在)

> 測定 ref: bolt コミット `bd3f6cf74`(`bolt/fix-1226-goa-multiseg-ecode`、base = origin/main `a326f47bc`、前進なし)。PR: [#1256](https://github.com/amadeus-dlc/amadeus/pull/1256)(Fixes #1226)。

## 実装(builder subagent、worktree 隔離)

- `GOA_HEAD_RE`: capture を `E-[A-Z0-9]+(?:-[A-Z0-9]+)*` へ拡張(修正後 :162)。ecode は無変換返却 — FR-1
- `PM_CID_RE`: `round=` を同形の対称是正(修正後 :166)— FR-3(E-GMERA2=A)
- スキーマコメント(:155-161)1編集で更新: 複節許容+スパースサブ問表記は対象外(#1254 追跡)— FR-2(a)+FR-6 統合
- `tests/unit/t-norm-metrics.test.ts`: +56行の新 describe(複節正/単節後方互換/複節 round/スパース fail ピン留め)。既存 :582-597 不変 — FR-4(b)/NFR-1
- `tests/unit/t238-election-record.test.ts`: :104-105 を複節受理の正 assertion へ反転(:102 圧縮形・GoaLineCode 単節は不変、拡張は #1255 追跡)— FR-4(a)/FR-5(E-GMERA3=C)
- 配布同期: 11コピー(正本+dist 6+self-install 4)、変更ファイル計13 — NFR-2
- scripts/ 実装面は未編集(修正面制約の遵守)

## 検証エビデンス

| 検証 | 実測 |
|---|---|
| typecheck / lint / dist:check / promote:self:check | exit 0(lint 警告は既存 :787 複雑度のみで本変更と無関係) |
| tests/run-tests.sh --ci | exit 0、RESULT: PASS(387ファイル / Failed 0 / 5493 assertions / Failed 0) |
| 落ちる実証(falling-proof-no-stash) | 正本のみ `checkout origin/main --` 切替 → 新テスト 4 fail(exit 1、赤の実文確認済み)→ 復元 → 54 pass(exit 0) |
| 閉包(fix-review-replays-origin-repro) | 起票時再現 verbatim `parseGoaLine("GoA[E-TPR-RE]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0")` → `{ok:true, ecode:"E-TPR-RE", votes:[3,0,…,0]}` |
| lcov(local-lcov-pre-push) | 変更実行行 :162 hits=68 / :166 hits=114、diff 追加行の未カバー 0 |
| deslop | main diff 精査、除去対象なし(コメントは load-bearing) |
| conductor 裏取り(evidence-discipline) | scratch worktree(origin/bolt head)で対象2テストファイル再実行 = 54 pass / 0 fail(exit 0)、正本 diff の裁定適合を実読確認 |

## 逸脱・ヒヤリハット(申告)

- builder が落ちる実証の復元時、fix 未コミット状態で `git checkout HEAD -- <正本>` を実行し working-tree の修正を一時消失(HEAD=origin/main のため)。即時検知し再適用・green 再実測で回復。最終コミット diff は conductor が独立検分済み — 実害なし。落ちる実証は「fix コミット後に実施」の手順指示だったが、builder はコミット前に実施した(軽微な手順逸脱、成果物への影響なし)。

## 関連

- 裁定義務の別 Issue: #1254(スパース未達、E-GMERA1 留保転記済み)/ #1255(GoaLineCode 拡張、E-GMERA3 留保転記済み)
- レビュー: PR #1256 を e4 へ依頼(2026-07-19 20:3x JST 台)
