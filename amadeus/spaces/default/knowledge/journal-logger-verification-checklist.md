# journal-logger 運用検証チェックリスト

Issue #557 の受け入れ条件 2〜3 の合否基準。初回起動（人間 / leader が [journal-logger-runbook.md](journal-logger-runbook.md) に従い実施）後に、実施者が結果を記入する。全項目 [x] で条件 2〜3 充足、#556 のクローズ（条件 4 後半）に進める。

## 条件 2: 追記 + ack + 日次 PR

- [ ] 任意メンバーから journal-logger へ agmsg でメッセージを送り、当日ファイルへ契約形式のエントリが追記された（記入: 送信者 / 日時 / エントリ見出し =        ）
- [ ] ack が固定形式（追記先ファイル + 見出しアンカー + 種別 + 仕分け）で返った（記入: ack 受信日時 =        ）
- [ ] validator が journal 検査込みで pass した（記入: 実行日時 =        ）
- [ ] 日次 draft PR が作成され、ready 化 → 人間 merge まで一巡した（記入: PR # =        ）

## 条件 3: 仕分け提案の定着接続

- [ ] learnings 候補または steering 候補の仕分け提案が 1 件以上返った（記入: 対象エントリ =        ）
- [ ] その候補が既存の定着経路へ接続された: §13（該当 Intent の gate で surface / persist）または steering 反映 Intent のバックログ入り（記入: 接続先 =        ）
- [ ] 定着後、該当エントリの「昇格」フィールドへスタンプが追記された（記入: スタンプ =        ）

## 異常系（推奨・任意）

- [ ] 不達時 fallback（runbook §4）の手順を一度確認した（logger 停止状態で送信 → leader 直接記録）

## 記入欄

- 実施者:
- 実施日:
- 特記事項:
