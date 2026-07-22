# Intent Capture 質問(260722-space-record-catalog)

> 事前整理済みの前提(質問しない事項): (1) 本 intent は Issue #1309 の「整理」が目的で、ideation(scope-definition まで)で park する — ユーザー決定 2026-07-22。(2) #1309 は record を正本とするミラー Issue 化の対象 — intent-first ノルム(cid:intent-first-mirror-issue)の機械的適用。(3) 実装・既存ディレクトリの rename は本 intent のスコープ外 — Issue 本文の非目標を継承。
>
> 運用モード: チームモード(AMADEUS_OPERATING_MODE=team 実測、2026-07-22)。明確化質問はエージェント選挙(cid:election-protocol、amadeus-election CLI 正本)で回答を作る。[Answer] 記入は裁定受領後のみ(cid:election-answer-after-ruling / E-OC1 3段順序)。仕様・価値判断に該当する問はエスカレーション正準リスト(4)によりユーザー裁定へ。
>
> E-OC1 証跡: 全4問はユーザー対話モード(leader セッション実 HUMAN_TURN)での直接裁定により確定。leader 承認: 2026-07-22T15:27:37Z(裁定受領と同時に記入)。

## Q1. 人間向け時系列ビューの一次顧客は誰ですか?

#1309 は「人間が開催順・時系列を追えない」ことを問題としています。誰の閲覧体験を最優先に設計すべきかで、投影の形(CLI か Markdown か)と受け入れ基準の重みが変わります。

- A. GitHub / ファイルツリーの閲覧者(リポジトリを直接見る人間)を最優先
- B. CLI 利用者(セッション内で一覧したいエージェント運用者)を最優先
- C. 両方を同格で扱う(Issue の受け入れ基準どおり CLI と Markdown 投影の両方)
- D. 将来の UI(Web ビュー等)を見据えた API 面を最優先
- E. まだ決めない(scope-definition で裁定)
- X. その他(自由記述)

[Answer]: C(ユーザー裁定 2026-07-23、leader セッション実 HUMAN_TURN)【一部失効 2026-07-23: feasibility 段のスコープ縮小裁定により CLI/Markdown 投影という手段は非目標化。「リポジトリ閲覧者と CLI 利用者を同格の顧客とする」判断自体は有効で、手段は日付接頭辞 dirName+レジストリに置換 — intent-statement Amendment 参照】

## Q2. この整理 intent の成功(完了)の定義はどれですか?

「わかりやすく整理したい」の測定可能な完了条件を固定します。

- A. 分解 ADR 1本(Space 配下の役割分類+関心事の分解+依存順序)が承認されること
- B. A に加えて、未決事項(用語衝突・createdAt 導出・タイムゾーン・投影配置)の裁定が全件記録されること
- C. B に加えて、#1309 のミラー Issue 化(本文書き換え)まで完了すること
- D. 分解された子 Issue 群が起票され、#1309 が親 Issue になること
- E. X. その他(自由記述)

[Answer]: C(ユーザー裁定 2026-07-23、leader セッション実 HUMAN_TURN)

## Q3. 「レコード」の用語衝突の裁定を本 intent に含めますか?

既存正本 docs/guide/glossary.md の **Record dir**(intent 専用ディレクトリ)と、#1309 の「共通レコード契約」(Intent と Election を包含する上位概念)が衝突しています。用語集の運用ルール上、表記裁定は選挙/ユーザー裁定が必要です。

- A. 本 intent の成果物(ADR)内で裁定し、確定後に用語集へ登録する
- B. 本 intent とは切り離し、いまこの場でユーザーが裁定する(例: 上位概念は常に「ライフサイクルレコード」と完全形で呼ぶ)
- C. 裁定は先送りし、成果物では暫定表記(ライフサイクルレコード(仮))を使う
- D. E. X. その他(自由記述)

[Answer]: B(ユーザー裁定 2026-07-23、leader セッション実 HUMAN_TURN)— 上位概念の正式名称は「ライフサイクルレコード」(lifecycleRecord)。単独の「レコード」への省略は禁止(既存 Record dir と衝突)。用語集登録条件 (b) 充足。

## Q4. #1309 の分解単位はどうしますか?

Issue には少なくとも4つの関心事(①共通レコード契約 ②Catalog seam ③人間向け投影 ④移行)が束なっています。

- A. 単一 intent のまま、ADR 内で4関心事を層別に設計する(実装時に Bolt で分割)
- B. 関心事ごとに子 Issue へ分割し、#1309 を親(トラッキング)Issue 化する
- C. 契約+Catalog(基盤)と投影+移行(応用)の2 intent に分ける
- D. E. X. その他(自由記述)

[Answer]: A(ユーザー裁定 2026-07-23、leader セッション実 HUMAN_TURN)— 単一 intent のまま ADR で4関心事を層別設計し、実装段階の units-generation で Unit 分割。#1309 はミラー Issue 1本を維持。
