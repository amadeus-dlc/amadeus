# agmsg による多体連携試行の運用記録（Issue #497）

上流入力: [Issue #497](https://github.com/amadeus-dlc/amadeus/issues/497)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)

本文書は、Issue #497（agmsg による 4 体 Claude Code 連携の試行運用規約）の残作業を 1 Intent（260705-agmsg-trial-docs）として実施した結果の記録である。試行規約の正は Issue #497 に一本化し（確定判断 12）、本文書は Intent record の Construction 成果物としてだけ置く（BR-1）。

## 1. 適用条件

本体制（leader + engineer×3 の 4 体連携）はデフォルトの働き方ではなく、チーム構成を取れる場合だけに適用する働き方である（FR-3.1）。単独セッションでの作業を置き換えるものではなく、複数 worktree・複数エージェントを並行させられる体制が組める場合に限って選択する。

### 引き継ぎ（本 Intent のスコープ外の後続動作）

本 Intent の成果物は Issue #497 の正を複製せず、次の 2 件を後続動作として引き継ぐ（BR-10）。

1. **team.md（steering）への統合**: 並行運用ポリシーへの反映は後続 Intent の起票で行う（FR-3.2）。これは確定判断 12（試行規約の正は Issue #497 に一本化する）と整合させるための切り分けであり、本 Intent では team.md を直接更新しない（BR-1）。
2. **Issue #497 コメントへの転記**: 本 Intent の PR が merge された後、leader が本文書の内容を Issue #497 のコメントへ転記する（FR-4.2）。転記の実行そのものは本 Intent のスコープ外である。

## 2. 定型文

定型文は、人間（Maintainer）の承認を leader が engineer へ中継するために使う。承認経路は一貫して「人間 → leader → engineer」である（domain-entities.md「関係」節）。

### 2.1 ディスパッチ定型文

Intent 承認（Intent 化の可否判断）を leader が対象 engineer へ中継するメッセージである。

**必須項目**（#497 確定判断 5）:

- 承認者
- 承認日時
- 対象 Issue と scope
- 承認要旨
- （作業指示は運用上の付帯部であり、必須項目そのものではない）

**テンプレート**:

```text
【Intent ディスパッチ（暫定定型文）】
- 承認者: <氏名（役割）>
- 承認日時: <日時>（証跡: <URL または chat 指示の説明>）
- 対象 Issue: <owner/repo#番号> / scope: <scope 名>
- 承認要旨: <承認した作業内容の要約>

【作業指示】
<engineer が行うべき手順（任意項目）>
```

**実例**（受信日時: 2026-07-05T14:18:59Z、送信者: leader → engineer1、team: amadeus。出典: [received-messages.md](../../../inception/requirements-analysis/received-messages.md)、BR-2 に従い逐語転記）:

```text
【Intent ディスパッチ（暫定定型文）】\n- 承認者: j5ik2o（Maintainer）\n- 承認日時: 2026-07-05 23:18 JST（leader への chat 指示。証跡: https://github.com/amadeus-dlc/amadeus/issues/497#issuecomment-4886354669）\n- 対象 Issue: amadeus-dlc/amadeus#497 / scope: refactor（docs 系）\n- 承認要旨: #497 の残作業（ディスパッチ定型文・中継承認定型文の確定、agmsg 実機確認結果の記録、適用条件「本体制はデフォルトではなくチーム構成を取れる場合だけの働き方」の明文化）を 1 Intent として起こし、試行 1 周を回す。Bolt は直列、PR merge は人間が行う。\n\n【作業指示】\n1. あなたの worktree（engineer1）で、最新 origin/main から eng1/issue-497-trial を作成する\n2. amadeus の Intake から Intent を作成し、intent-capture の decision に上記の承認 4 項目を転記する\n3. ステージ進行中、技術的な質問はピア協議（leader + engineer2, 3 宛、期限 15 分・回答 1 件で成立）、承認系は leader へエスカレーションする\n4. ピア協議を 1 回以上実施し、decision に「協議参加者・採用案・採用理由」を人間回答と区別して記録する\n5. gate 到達・PR 作成・ブロック・Intent 完了の 4 イベントを leader に報告する\n6. PR 作成前に validator と npm run test:all を実行し、結果を記録する
```

### 2.2 中継承認定型文

gate 承認を leader が対象 engineer へ中継するメッセージである。

**必須項目**（#497 確定判断 5 + BR-9）:

- 承認者
- 承認日時
- 対象（Intent と対象ステージまたは Bolt）
- 承認要旨
- HUMAN_TURN mint 指示

HUMAN_TURN mint 指示を必須項目に含める根拠は、#497 確定判断 8（中継承認定型文の受信直後に限り HUMAN_TURN を mint する）と、下記実例の末尾に mint 指示が実際に含まれていることの 2 点である。requirements.md の前提 A-3 のとおり、gate の人間承認をもってこの項目追加を確定とする。

**テンプレート**:

```text
【中継承認定型文】
- 承認者: <氏名（役割）>
- 承認日時: <日時>（証跡または chat 指示の説明）
- 対象: Intent <dirName>（<Issue 参照>, scope: <scope 名>）<対象ステージまたは Bolt 名> の gate 承認
- 承認要旨: <承認した内容の要約>
本定型文の受信を根拠に HUMAN_TURN を mint し、decision に承認経路（人間 → leader → <engineer 名>）を明記してください。
```

**実例**（受信日時: 2026-07-05T14:31:02Z、送信者: leader → engineer1、team: amadeus、対象: reverse-engineering ステージの gate 承認。出典: [received-messages.md](../../../inception/requirements-analysis/received-messages.md)、BR-2 に従い逐語転記）:

```text
【中継承認定型文】\n- 承認者: j5ik2o（Maintainer）\n- 承認日時: 2026-07-05 23:30 JST（leader への chat 指示）\n- 対象: Intent 260705-agmsg-trial-docs（Issue #497, scope: refactor）reverse-engineering ステージの gate 承認\n- 承認要旨: 既存 codekb/amadeus/（PR #496 更新済み）の本ステージ成果物としての採用、codekb/engineer1/ の非生成、ピア協議 2 件の採用判断（Q1: engineer3 案、Q2: engineer2 案）を含めて承認する。次ステージへ進んでよい。\n本定型文の受信を根拠に HUMAN_TURN を mint し、decision に承認経路（人間 → leader → engineer1）を明記してください。
```

## 3. agmsg 実機確認結果

出典: engineer1 セッション（2026-07-05、時刻は UTC）での実行観察。FR-2 の要求どおり、確認できた事実と観察された制約を分けて記録する。

### 3.1 確認できた事実

| 確認項目 | 内容 | 証跡（観測時刻） |
|---|---|---|
| チーム構成 | チーム名 `amadeus` で leader、engineer1〜3 の 4 体 + 人間（Maintainer）の構成が実働した | 本 Intent の全経過（2026-07-05） |
| join | `join.sh` により engineer1 が team amadeus へ参加できた | 2026-07-05T14:07 頃 |
| actas 排他ロック | `actas-claim.sh` による role 排他ロックが `status=ok` で取得できた（他セッション占有時は `held` を返す仕様） | 2026-07-05（本 Intent 実行中） |
| 配信モード | 配信モード `monitor` を採用し（`delivery.sh set monitor`）、Monitor tool + `watch.sh` でリアルタイム受信できた。配信遅延は約 5 秒 | 2026-07-05（本 Intent 実行中） |
| 送受信 | `send.sh` / `inbox.sh` の送受信が双方向で動作した（ping → pong） | ping 2026-07-05T14:08:55Z → pong 2026-07-05T14:09:07Z |
| 承認経路の一貫動作 | ディスパッチ定型文の受信から Intent birth、gate 承認中継まで、承認経路（人間 → leader → engineer1）が agmsg 上で一貫して機能した | ディスパッチ受信 2026-07-05T14:18:59Z、gate 承認中継 2026-07-05T14:31:02Z / 14:48:40Z / 15:03:56Z |
| ピア協議（1 回目） | 3 宛（leader、engineer2、engineer3）全員が期限 15 分内に回答した | leader 2026-07-05T14:24:56Z、engineer2 2026-07-05T14:25:54Z、engineer3 2026-07-05T14:27:01Z |
| ピア協議（2 回目） | 3 宛全員が期限 15 分内に回答した | engineer2 2026-07-05T14:34:24Z、engineer3 2026-07-05T14:34:37Z、leader 2026-07-05T14:34:56Z |

### 3.2 観察された制約

| 確認項目 | 内容 | 証跡（観測時刻） |
|---|---|---|
| Monitor 通知の切り詰め | Monitor 通知イベントはメッセージ本文を途中で切り詰める（約 400 字超で truncated）。全文取得には `inbox.sh` の再実行が毎回必要 | engineer1 で複数回観測。engineer2 / engineer3 のセッションでも同様に観測された（requirements.md 前提 A-2） |
| 配信遅延 | 配信遅延は約 5 秒（monitor モードの仕様どおり） | 2026-07-05（本 Intent 実行中の send/inbox 往復観測） |
| 履歴保持期間 | `history.sh` は全文を保持するが、保持期間は未確認 | 未確認 |

### 配信モードの結論

配信モード `monitor` を推奨どおり採用し、実用に足ることを確認した。これにより #497 の未確定事項「agmsg のチーム名と配信モードの実機確認」を解消する。
