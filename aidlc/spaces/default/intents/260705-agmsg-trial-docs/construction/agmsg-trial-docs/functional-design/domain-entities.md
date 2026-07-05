# Domain Entities — agmsg-trial-docs

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## エンティティ

| エンティティ | 説明 | 主な属性 |
|---|---|---|
| ロール | 4 体連携の参加者区分。人間（Maintainer）、leader、engineer（1〜3） | 名前、担当（承認 / 中継・統括 / Intent 実行） |
| ディスパッチ定型文 | 人間の Intent 承認を leader が engineer へ中継するメッセージ | 承認者、承認日時、対象 Issue と scope、承認要旨、作業指示 |
| 中継承認定型文 | 人間の gate 承認を leader が engineer へ中継するメッセージ | 承認者、承認日時、対象（Intent と対象ステージまたは Bolt）、承認要旨、HUMAN_TURN mint 指示 |
| ピア協議 | engineer が発する技術的な内容確認の質問と回答の往復 | 質問、宛先 3 名、期限（15 分）、成立条件（回答 1 件）、回答者、採用案、採用理由 |
| HUMAN_TURN | 人間の実在を audit に刻むイベント。中継承認定型文の受信直後だけ mint する | mint 時刻、根拠（受信した定型文） |
| 実機確認記録 | agmsg の動作事実と観察された制約の記録 | 確認項目、観測時刻または証跡、制約 |
| 運用記録文書 | 本 Intent の成果物。上記を 3 節で束ねる record 成果物 | 適用条件、定型文（定義・テンプレート・実例）、実機確認結果 |

## 関係

- 人間（Maintainer）の承認は、leader を経由してだけ engineer へ届く（承認経路: 人間 → leader → engineer）。
- ディスパッチ定型文は Intent 承認を、中継承認定型文は gate 承認を運ぶ。どちらも承認者・承認日時・対象・要旨の 4 項目を必須で持つ（#497 確定判断 5）。
- HUMAN_TURN は中継承認定型文の受信にだけ従属する。ピア協議の回答からは生まれない（#497 確定判断 8）。
- ピア協議の採用判断は質問した engineer 本人が持つ（#497 確定判断 7）。
- 運用記録文書は、received-messages.md（原文保全）を実例の情報源として参照する（C-6）。

## ライフサイクル

- ディスパッチ定型文: 人間承認 → leader 作成・送信 → engineer 受信 → 承認 4 項目を decision へ転記 → Intent birth。
- 中継承認定型文: gate 到達報告 → 人間判断 → leader 中継 → engineer 受信 → HUMAN_TURN mint → 承認 decision 記録 → gate 通過。
- ピア協議: 質問送信（3 宛） → 期限 15 分 → 回答 1 件以上で成立（0 件なら自己判断と記録） → 採用判断 → decision 記録。
