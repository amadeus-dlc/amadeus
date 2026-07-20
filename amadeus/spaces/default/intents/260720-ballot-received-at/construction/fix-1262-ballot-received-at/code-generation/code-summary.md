# Code Summary — fix-1262-ballot-received-at

上流入力(consumes 全数): requirements.md(per-unit 設計6点は bugfix degrade スコープの consumes_absent 宣言どおり不在 — FD 委譲分は code-generation-plan.md が確定)

> 測定 ref: bolt コミット `433391d2c`(`bolt/fix-1262-ballot-received-at`、base = origin/main `7cb8afd0c` — #1273/#1274 着地後の再接地)。PR: [#1277](https://github.com/amadeus-dlc/amadeus/pull/1277)(Fixes #1262)。

## 実装(builder subagent、worktree 隔離 — 隔離維持を transcript cwd で確認)

- model.ts: TimelineEvent へ `receivedAt?` 1点追加(canonical 1定義、optional = 移行窓シグナル)/ classifyLate を受理軸3引数へ(per-voter resolveBallots の submittedAt 軸は独立維持)
- election.ts: handleVote で `normalizeAt(new Date().toISOString())` mint → appendBallot へ(tallied 同型)
- store.ts: appendBallot に receivedAt 引数、ballot/late timeline イベントへ stamp。null-fallback は**机上トレースで生存判定**(同一秒境界 receivedAt===talliedAt で classifyLate が null → fallback が late レーンへ振る — E-BRARA2 e4 留保の「死コードなら削除」は該当せず、根拠コメントを受理軸へ更新して保存)
- record.ts: verifySelf 比較キー = `receivedAt ?? at`(Q3 読み分岐1点、NFR 根拠を近傍コメントで明文化)/ timelineSegment は ballot 行のみ受理≠申告時に併記(e3 留保の波及最小化)
- テスト: 新規4(E-BFARA1 verbatim 回帰・移行窓・受理軸 classifyLate・遅延可視化)+宣言更新(t234×2、t235 引数13箇所)
- #1273 統合: resolveBallots/6分類/unknown-ref に無変更 — 受理時刻レイヤーを重畳(統合逸脱なし)

## 検証エビデンス

| 検証 | 実測 |
|---|---|
| typecheck / lint / --ci / dist:check / promote:self:check | 全 exit 0(--ci PASS — COVERAGE GATE FAILED 等の文字列は planted-failure fixture 出力、assertion 実文で帰属確定) |
| 落ちる実証(E-GMECG 追補準拠) | record.ts のみ base 切替 → E-BFARA1 fixture 赤/移行窓 緑維持 → fix SHA 明示復元 → 緑・tree clean |
| 閉包 | 申告非単調・受理単調の選挙を CLI ハンドラ完走 → handleVerify exit 0(scratch=repo 外) |
| lcov | diff 追加実行行(model:392、store:173/184/195、cli:340/341、record:97-100/212-213)全 DA>0、未カバー 0 |
| conductor 裏取り | scratch worktree(origin/bolt head)で 4ファイル 57 pass / 0 fail。three-dot diff = 7 files +168/-36(surgical) |
| deslop | 除去対象なし |

## 特記(申告)

- 落ちる実証は amend 前コミット `65bc3dc16` の SHA を復元 ref に使用(record.ts 内容は fix コミットと同一 — builder 申告、conductor が diff 同一性を確認)。
- e4 留保(null-fallback)は「削除」でなく「生存+根拠更新」で決着 — 留保の指示は「死コード化するなら削除」の条件付きであり、トレースで生存が確定したため条件不成立(裁定準拠)。

## 関連

裁定: E-BRARA1〜3(留保3件転記済み)。直列: #1273 着地後の再接地で実装(合意どおり)。レビュー: PR #1277 を e4 へ依頼(E-BRARA2 留保の当事者検分を含む)。
