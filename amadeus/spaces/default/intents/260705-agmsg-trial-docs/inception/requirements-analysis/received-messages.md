# 受信定型文の原文保全

FR-1 の「実例」の情報源となる、leader から受信した定型文 2 通の原文である。
agmsg の Monitor 通知は約 400 字超で本文を切り詰めるため、`inbox.sh` で再取得した全文をここへ保全する。
agmsg の履歴ストア（`history.sh amadeus engineer1`）にも同文が保持されているが、保持期間の保証は `未確認` のため、record 側を正とする。
原文内の `\n` は agmsg 送信時の改行エスケープであり、受信表示のまま保全する。

## ディスパッチ定型文（暫定）の実例

- 受信日時: 2026-07-05T14:18:59Z
- 送信者: leader → engineer1（team: amadeus）

```text
【Intent ディスパッチ（暫定定型文）】\n- 承認者: j5ik2o（Maintainer）\n- 承認日時: 2026-07-05 23:18 JST（leader への chat 指示。証跡: https://github.com/amadeus-dlc/amadeus/issues/497#issuecomment-4886354669）\n- 対象 Issue: amadeus-dlc/amadeus#497 / scope: refactor（docs 系）\n- 承認要旨: #497 の残作業（ディスパッチ定型文・中継承認定型文の確定、agmsg 実機確認結果の記録、適用条件「本体制はデフォルトではなくチーム構成を取れる場合だけの働き方」の明文化）を 1 Intent として起こし、試行 1 周を回す。Bolt は直列、PR merge は人間が行う。\n\n【作業指示】\n1. あなたの worktree（engineer1）で、最新 origin/main から eng1/issue-497-trial を作成する\n2. amadeus の Intake から Intent を作成し、intent-capture の decision に上記の承認 4 項目を転記する\n3. ステージ進行中、技術的な質問はピア協議（leader + engineer2, 3 宛、期限 15 分・回答 1 件で成立）、承認系は leader へエスカレーションする\n4. ピア協議を 1 回以上実施し、decision に「協議参加者・採用案・採用理由」を人間回答と区別して記録する\n5. gate 到達・PR 作成・ブロック・Intent 完了の 4 イベントを leader に報告する\n6. PR 作成前に validator と npm run test:all を実行し、結果を記録する
```

## 中継承認定型文の実例

- 受信日時: 2026-07-05T14:31:02Z
- 送信者: leader → engineer1（team: amadeus）
- 対象: reverse-engineering ステージの gate 承認

```text
【中継承認定型文】\n- 承認者: j5ik2o（Maintainer）\n- 承認日時: 2026-07-05 23:30 JST（leader への chat 指示）\n- 対象: Intent 260705-agmsg-trial-docs（Issue #497, scope: refactor）reverse-engineering ステージの gate 承認\n- 承認要旨: 既存 codekb/amadeus/（PR #496 更新済み）の本ステージ成果物としての採用、codekb/engineer1/ の非生成、ピア協議 2 件の採用判断（Q1: engineer3 案、Q2: engineer2 案）を含めて承認する。次ステージへ進んでよい。\n本定型文の受信を根拠に HUMAN_TURN を mint し、decision に承認経路（人間 → leader → engineer1）を明記してください。
```
