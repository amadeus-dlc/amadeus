# Code Summary — unit stale-epoch-landed(Issue #3110)

> 実装: bolt worktree `.amadeus/worktrees/bolt-stale-epoch-landed`(branch `bolt-stale-epoch-landed`、base `83e1dbeef`)。TDD 実装は builder subagent、検証欄の実測値は conductor 再実測(exit code 併記)と builder 転記の両方で構成。blocking はリモート CI(push-first、PR #3113)。

## Commits(6 + record checkpoint)

- `a93f9cd0c` fix(pr-convergence): finalise a stale created epoch as landed on the merged head
- `cc0ec59fe` test(pr-convergence): pin the deleted-branch arm and the ancestry refusals
- `16a276509` fix(pr-convergence): refuse create when this delivery's pull request already merged
- `3a13aa6a3` test(pr-convergence): pin the landed record's merge binding both ways
- `551bfc8c7` docs(pr-convergence): state how a merged self delivery finalises
- `9f6e047aa` test(pr-convergence): drop a cast from the forgery helper
- `938aabbd1` chore(record): checkpoint(record 同梱 — PR head)

## 実装(選挙 C 裁定準拠)

- **主経路**: merged self PR の stale created epoch を、`landedSelfContext`(新設アーム)が「attested prHead が merged headRefOid の祖先」の**実測**で受理し、merge commit SHA + mergedAt に束縛した `kind: landed` record を書く(既存 `transitionAllowed` の created→landed 遷移を到達可能化)。live-head 経路(`activeSelfContext`)の head 束縛は不変
- **遮断点の merged-arm 置換**: git-runner の remote-branch/head 一致前提と sensor `checkAttestationEnvironment` を landed 系では merge 事実束縛の fail-closed 検査へ差し替え(緩和ではなく束縛対象の付け替え — 改竄は fail-closed のまま)
- **FR-2**: MERGED 既往のある head での `create` は loud 拒否(新規 PR を開かない — #3109 クラスの再発防止)。`recoverCreateFailure` の OPEN-only read-back 意味論は不変
- **文書**: `pr-convergence.md` の「identity, epoch, and attestation prerequisites are unchanged」矛盾を裁定反映で是正(:311-318 / :341-346 系)
- 変更面: cli.ts +232 / git-runner +89 / gh-runner +54 / sensor +60 / attestation +27 / stage doc / allowlist / 新規 t3110 suite(561 行・13 tests)— 計 8 files +1015/−63

## 検証(実測)

| 検査 | 結果 | 実測者 |
|---|---|---|
| 新規 t3110 suite | 13 pass / 0 fail(100 expect)exit 0 | conductor 再実測 |
| t3062 + t541 + t482 + t448 | 113 pass / 0 fail exit 0 | conductor 再実測(path 実在の事前確認済み — 4 指定中 1 の命名誤りを検出し訂正のうえ全数実行) |
| t447 + t450(report-format-sensor)+ t534 | 96 pass / 0 fail exit 0 | conductor 再実測 |
| t482 + t3110 + t533 unit/integration | 74 pass / 0 fail exit 0 | conductor 再実測 |
| typecheck / lint / build(追跡不変)/ coverage-registry `--check` | すべて exit 0 | conductor 再実測 |

## 証拠源の選定(裁定条件 3 の記録)

祖先実測の一次証拠は **`git fetch origin refs/pull/<n>/head` を採用**(gh compare API は不採用)。理由(builder 実測・選定):
1. マージ後もブランチ削除の有無に依らず GitHub がこの ref を保持するため、`origin/<branch>` が答えられない削除ケースでちょうど答える
2. fetch が merged head とその全祖先を取り込むため、判定が `git merge-base --is-ancestor` という**ローカル決定的述語**になり、リモートの判断に依存しない
3. 既存の `GitSpawn` シームで駆動でき、gh 側の新しい呼び出し形状を増やさない

merge commit は意図的に対象外(squash 運用のため attested head は merge commit の祖先にならない — #3092 実測)。fetch 失敗は loud failure でフォールバック連鎖なし。テストは bare `origin.git` へ実際の `refs/pull/3110/head` を publish し、実 fetch + 実 merge-base で実測。

## 台帳(FR-6)

- allowlist `selfReportLifecycle`: **理由の書換 + 再アンカーで対応**(削除ではない)— 合流 lcov 実測 `DA:907,0`(周辺 :906=17 / :908=2 で当該行のみ 0)。新しい呼出しグラフでの再導出(active=head 束縛が先拒否 / landed=祖先 proof が手前の write arm / created=隣の write arm)を新 reason に記載。署名変更で失効した旧 fingerprint は gate 自身の `--create-selector` で再生成し :907 解決を確認(c-measure-not-prose / c5-ratchet 準拠)
- coverage-registry: 無変更が正(新規 export なし — `--check` exit 0)。model-map: 非対象(pin 0)

## 申告済みの絞り込み(裁定済み)

- FR-2 の merged-既往クエリは「本 delivery が created report を持つ場合」に限定して発行し、拒否は返却行の `state === "MERGED"` の事実読取から導出(builder 申告 → 梯子裁定 AUTO_DECIDED auto-decision-c2b3dc09044c0023b3d8c13c22f468f6 で「裁定の範囲内」と確定)。根拠: 無条件版は state 非対応の既存 stub 12 テストを破壊し「既存テスト無改変」拘束と衝突(実測)。#3109 の実測クラスは完全被覆

## Red 逐語(builder 実測の転記)

- 主経路: `report attestation is stale: the PR head advanced to c6d2b791… since this report was attested at 07d63cef…` exit 1
- 削除ブランチ arm: 患部のみ base へ戻す ablation で `delivery prerequisite failed: checked-out branch main is not the PR head branch bolt/3110` exit 1(revert 後 plugin 配下 0 変更を機械確認)。精密化: base 断面の遮断は同一関数内の 3 点(branch 名一致 :175-177 / remote 存在 :184-188 / 三者一致)で、merged arm は**関数ごと置換**により 3 点すべてを閉じる。祖先証拠はブランチ存在で分岐しない単一系(`ls-remote` 非呼出をテストで固定)
- FR-2: `Expected: 1 / Received: 0`(修正前は create 成功 = 2 本目 PR 経路へ到達)
- 祖先ゲート注入: 2 test 赤 → revert 残渣ゼロ(grep 0・exit 1)
- sensor 偽造: digest・attestation id・audit 受領まで再導出した偽造に対し findings がちょうど `["merge commit"]`(merge 束縛のみが最後の砦であることの実測)

## フルスイート帰属メモ

builder のローカルフルスイート走行中に出た唯一の FAIL(t2851-doctor-self-install-freshness)は、落ちる実証の注入とバックグラウンド実行の衝突による**自己汚染**(tracked-clean assert が注入中のセンサーファイル改変を検出 — 逐語転記あり)。revert 後の単独再実行で exit 0 / 5 pass を実測済み。変更由来の退行ではない(帰属切り分け: 同一条件ベース比較 — c1-ablation 準拠)。blocking はリモート CI を正とする。

## 検証済み面 / 未検証面

- 検証済み: FR-1 主経路 + 削除ブランチ arm(t3110 で pin)・FR-2(loud 拒否)・FR-3(sensor の merge 束縛 pass / 改竄 fail-closed)・FR-4 の文書反映・FR-6 台帳・既存経路無退行(t3062/t541/t482/t448/t447/t450/t534/t533)
- 未検証(受け入れ基準内・残工程): FR-5 = obb6 実適用(本 PR 着地後に conductor が実施し実測を record へ)・リモート CI のフルスイート/coverage gate(実行中)(Red 逐語は上節へ転記済み — 落ちる実証は t3110 の refusal ケース群が回帰として恒久 pin)
