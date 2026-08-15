# Requirements Analysis — 明確化質問(第2バッチ)

> Intent: 260815-priority-bug-batch-2(self-fix、depth Minimal、autonomy full)
> 回答は full 梯子(`amadeus-bolt decide-question`)で確定。E-code `E-AD-<hex8>` は AUTO_DECIDED 裁定(intent audit、grant `intent-grant-9c7a19ca0238da9e196162b0ad661ac1`)への参照(裁定 ID 先頭 8 hex の大文字化)。

## Q1. #3077(hold→再 tally の commit 不能)の是正方式

- A. 生産側を揃える: `tallyElection`(amadeus-election.ts:451)が「再 tally の target が全 question を覆う」場合にも `preservedResultDigest: null` を書く(`isCommittedRun` の期待述語も同一条件へ)。store 契約は不変
- B. store 側 `verifyPreservation` の条件を「target が全問」から「prior tally 不在」へ変更
- C. `establishedResultsDigest` を established 0 件で null を返すよう codec 変更
- X. Other (please specify)

[Answer]: A — 裁定 E-AD-01F8F090(= auto-decision-01f8f09017855cb6e6ced0a49e59c401)。全問再 tally には保存すべき established 結果が存在せず null が意味論的に正。store 不変・surgical。B は部分 hold の不変量を弱め、C は codec 契約の blast radius が大きい。

## Q2. #3074(recompose ガード)の是正方式

- A. 純関数へ phase 軸を追加: `assertRecomposeAllowed(autonomy, phase)` — `autonomous && phase === CONSTRUCTION` のときのみ denied。phase は呼び出し側で既存イディオム `getField(content, "Lifecycle Phase")` から取得
- B. A に加えて監査シャードから swarm/batch in-flight を導出し第3入力に
- X. Other (please specify)

[Answer]: A — 裁定 E-AD-088EDDEC(= auto-decision-088eddece9c56118606e3d43431e30e1)。Issue AC1 は OR 条件で phase 軸のみで充足。B は amadeus-lib.ts の純射影層に監査読取面を持ち込み層境界を壊す(dev-scan 所見。swarm 軸が必須になった場合は設計エスカレーション)。

## Q3. #3075 AC3(新規流入ガードの要否)

- A. ガードは新設しない判定を記録(ノルム+本 Issue 参照+レビュー規律で足りる。再発時に覆す)
- B. tests/perf/ 除外のスキャンテストを新設
- X. Other (please specify)

[Answer]: A — 裁定 E-AD-B8C116DC(= auto-decision-b8c116dc2034e99c755a48664a64739b)。新設ゲートは落ちる実証と観測レンジ内閾値の較正を要し Minimal 深度のバッチには過大。誤発火リスク(perf 予算の巻き添え)が現状の流入率に見合わない。

## Q4. #3079(t224 timeout)の是正方式

- A. 既存 env シーム `AMADEUS_AUDIT_LOCK_RETRIES`(例: 5)をテストの migrate env へ注入して意図的ロック失敗経路を ~0.5s 化し、あわせて `scaleTestTime` 経由の余裕あるハング検知 timeout を宣言
- B. 長い明示 timeout の宣言のみ(実 20 秒待ちが残る)
- X. Other (please specify)

[Answer]: A — 裁定 E-AD-5ADD4AB4(= auto-decision-5add4ab4869002b048588cfcc8fc74e0)。シームは当該用途のために実装済み(amadeus-audit.ts:1007-1017 コメント逐語)。`bt-timeout-verification-shape` に整合。B は実待ちを温存しユーザー裁定の趣旨に反する。

## Ladder Rulings(記録)

- Q1: `auto-decision-01f8f09017855cb6e6ced0a49e59c401`(a-producer-null)
- Q2: `auto-decision-088eddece9c56118606e3d43431e30e1`(a-phase-axis)
- Q3: `auto-decision-b8c116dc2034e99c755a48664a64739b`(a-no-guard)
- Q4: `auto-decision-5add4ab4869002b048588cfcc8fc74e0`(a-seam-plus-timeout)
- いずれも basis: agent-recommendation、loud degradation(native solo-election 不在)記録付き
