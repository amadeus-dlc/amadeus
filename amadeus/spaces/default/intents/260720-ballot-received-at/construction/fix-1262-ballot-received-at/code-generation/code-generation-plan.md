# Code Generation Plan — fix-1262-ballot-received-at

上流入力(consumes 全数): requirements.md(per-unit 設計6点は bugfix degrade スコープの consumes_absent 宣言どおり不在 — FD 委譲分は本 plan が E-BRARA 裁定の範囲内で確定)

> 測定 ref: base = **e2 PR #1273 着地後の origin/main**(直列合意 — 着地前に実装着手しない)。修正面は scripts/+tests/ のみ(配布外)。

## Bolt 構成

単一 Bolt(`bolt/fix-1262-ballot-received-at`)。**着手条件 = PR #1273 の state=MERGED 実測**(base-advance-regrounding: --no-ff 不使用、fetch 後の最新 origin/main から切り出し。e2 の 6分類化・resolveBallots・SUBMITTED_AT_RE と統合する前提で実 diff を読み直してから実装)。

## 設計確定(FD SKIP につき本 plan が確定 — 全て E-BRARA1〜3 裁定+留保の範囲内)

1. **TimelineEvent 拡張**(E-BRARA1=A+e3 留保): canonical 1定義(model.ts TimelineEvent)へ `receivedAt?: string` を**1点追加**(optional — 旧 record の読み判別を型で表現)。描画側(record.ts timelineSegment)は**単調性検査と遅延可視化に必要な面のみ**更新 — ballot 行に受理時刻の併記1点、他 renderer への一律展開はしない(波及最小化)。
2. **mint 点**(FR-2 — 既習様式準拠): handleVote(election.ts)で `normalizeAt(new Date().toISOString())` により受理時刻を mint し appendBallot へ引数で渡す(tallied の election.ts:354 mint→store 渡しと同型)。store は ballot/late timeline イベントに `receivedAt` を stamp(`at` は従来どおり submittedAt = 申告値の表示用保存、FR-6)。
3. **単調性検査軸**(E-BRARA1=A+E-BRARA3=A の読み分岐1点): verifySelf の隣接比較キーを `event.receivedAt ?? event.at` の**単一 fallback 式**へ — receivedAt を持つ新規選挙は受理軸、旧 record・distributed/tallied イベント(receivedAt なし・既に機械時刻)は従来 at 軸。この1式が Q3 裁定の「判別1点の読み分岐」であり、NFR-4 の根拠(旧 record 再検証運用の不在)をコード近傍コメント(英語)で明文化。**それ以上の fallback 分岐は書かない**。
4. **classifyLate 受理軸化**(E-BRARA2=A): 判定を `receivedAt <= tallyTime` へ。呼出側(appendBallot)は mint 済み受理時刻を渡す。**e4 留保の机上トレースを実装前に実施**: store.ts:146-150 の null-fallback が受理軸移行後に死コード化するか(受理時刻は常に mint されるため classifyLate が null を返す経路が残るか)を確定し、死コード化するなら**削除**(コメント化不可)+削除根拠を code-summary に記載。トレース結果が「生存」なら現状維持+根拠記載。
5. **移行窓 fixture**(E-BRARA3 e4 留保): 修正着地前に open し着地後 verify へ到達する in-flight 選挙の fixture(receivedAt なし timeline)を transient-state-fixtures 準拠で置き、読み分岐1点の両側(新規=受理軸 / 旧=at 軸)をテスト固定。

## テスト要件(FR-5)

- E-BFARA1 verbatim 回帰 fixture(受理順 [e1@22:10:03, e4@22:10:42, e3@22:10:29] — 新規 fixture として構成、実在 record は触らない): 修正前 = timeline-order fail / 修正後 = pass の両側実証(落ちる実証は E-GMECG 追補準拠 — fix コミット後・SHA 明示復元)
- 既存 t238 timeline-order(tallied-before-ballot 型)グリーン維持
- classifyLate 受理軸テスト(受理が tally 後の中継票 = late、申告が過去でも受理が tally 前 = 通常)
- 移行窓 fixture(上記5)
- 閉包: verify exit 1 の完走不能経路が新規 fixture で解消することを in-process 実測

## 検証コマンド

typecheck / lint / tests --ci / dist:check・promote:self:check(無変更確認)/ push 前 lcov(diff 追加行未カバー0 — verify/classifyLate は t236/t234 in-process 消費)。

## 実装体制

builder subagent(amadeus-developer-agent、worktree 隔離)1名 — **#1273 着地確認後にディスパッチ**。resume が必要になった場合は c2 追補適用(新規 Agent 優先 / worktree 明示パス+git 限定の再掲+cwd/branch 即実測)。conductor は plan/summary・裏取り・PR 発行・レビュー依頼(実装者以外)。
