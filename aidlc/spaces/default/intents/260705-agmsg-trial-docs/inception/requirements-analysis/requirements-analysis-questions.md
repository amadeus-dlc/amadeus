# Requirements Analysis Questions：260705-agmsg-trial-docs

Intent: Issue #497 の残作業（ディスパッチ定型文・中継承認定型文の確定、agmsg 実機確認結果の記録、適用条件の明文化）を 1 Intent として実施し、試行 1 周を回す。

回答方式: 本 Intent は 4 体連携試行のため、内容確認の質問はピア協議（#497 確定判断 6・7）で回答する。各回答に回答者を明記する。

## Q1: 3 成果物の記録先

ディスパッチ定型文・中継承認定型文の確定版、agmsg 実機確認結果、適用条件の明文化は、どこに記録するか。#497 確定判断 12 は「試行規約はこの Issue を正とし、team.md 等の更新は運用実績を積んでから別 Intent で行う」とする。

A. `docs/amadeus/` に運用文書を 1 本新設する（例: `docs/amadeus/multi-agent-operation.md`）。本文で Issue #497 を正として参照し、team.md への反映は後続 Intent と明記する
B. Intent record の Construction 成果物としてだけ残す（repo 恒久文書化は後続 Intent に委ねる）
C. Issue #497 へのコメント追記を正とし、repo には Intent record だけ残す
D. `aidlc/spaces/default/memory/team.md` を直接更新する
E. A と C の併用（docs/amadeus/ 新文書 + Issue #497 コメント）
X. Other (please specify)

[Answer]: B（ピア協議成立・回答 3 件で意見が分裂、engineer1 が leader 案を採用。回答者: engineer2=A、engineer3=A 条件付き（暫定文書と冒頭明記）、leader=B+試行完了後に leader が #497 コメントへ転記。採用理由: 確定判断 12 は試行期間中の正を Issue #497 に一本化する趣旨であり、docs/amadeus/ 新設は正の分裂を招く。恒久文書化は #497 実施候補 4 の後続 Intent が試行実績を根拠に行う。確定した定型文は Intent record 成果物として PR に含め、merge 後に leader が #497 コメントへ転記する）

## Q2: 定型文の確定形式

ディスパッチ定型文・中継承認定型文の「確定」は、どの形式で行うか。

A. 今回 leader が実際に使った文面を正として整形し、確定版テンプレートにする（実績準拠）
B. #497 の要件（承認者・承認日時・対象・要旨の 4 項目）から書き起こし、今回の文面は使わない
C. 必須項目の定義 + テンプレート + 今回の実例（本 Intent で実際に使われた文面）の 3 点セットにする
D. 必須項目の定義だけにする（文面はチーム裁量）
X. Other (please specify)

[Answer]: C（ピア協議成立・全員一致。回答者: engineer2、engineer3、leader。採用判断: engineer1。必須項目定義 + テンプレート + 今回の実例の 3 点セット。実例は本試行の証跡を兼ねる）

## Q3: agmsg 実機確認結果の記録範囲

#497 未確定事項「agmsg のチーム名と配信モードの実機確認（monitor 推奨）」への記録は、どの範囲にするか。

A. 今回試行で確認できた事実だけを記録する（チーム名 amadeus、join / actas 排他ロック / monitor 配信 / 送受信の動作）
B. A に加え、観察された制約（長文メッセージの通知イベントでの切り詰め、通知遅延など）も記録する
C. agmsg 全機能の体系的な確認マトリクスを作る（未確認項目も列挙）
D. 配信モードの結論（monitor 採用）だけを 1 行記録する
X. Other (please specify)

[Answer]: B（ピア協議成立・全員一致。回答者: engineer2、engineer3、leader。採用判断: engineer1。観察された制約として、Monitor 通知の本文切り詰め（約 400 字超で truncated、全文取得は inbox.sh 再実行が必要）と配信遅延約 5 秒を記録対象に含める）

## Q4: 適用条件の記述位置

適用条件「本体制はデフォルトではなく、チーム構成を取れる場合だけの働き方」は、どこに書くか。

A. Q1 で決めた文書の冒頭に「適用条件」節として書く
B. 独立した短い文書にする
C. 文書冒頭の適用条件節に加え、team.md 更新（後続 Intent）への引き継ぎ事項としても明記する
X. Other (please specify)

[Answer]: C（ピア協議成立・全員一致（記述位置は Q1 の採用先に読み替え）。回答者: engineer2、engineer3、leader。採用判断: engineer1。record 成果物の冒頭に適用条件節を置き、team.md への引き継ぎ先を「後続 Intent の起票」と明記して判断 12 と整合させる。適用条件は leader が #497 コメントへ記録済みで Issue=正には反映済み）
