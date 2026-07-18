# Requirements Analysis — Questions(260717-state-mirror-fixes)

上流入力(consumes 全数): intent-statement.md, scope-document.md, business-overview.md, architecture.md, code-structure.md, team-practices.md

モード: チームモード — エージェント間選挙(election-protocol)

## E-OC1 証跡

質問 2 問(真に未決の観測可能契約のみ)。既決事項は質問化しない(no-election-for-decided-norms): 修正3点のスコープ(scope Q1=A)、ガード設置位置の設計委任(scope 留保)、state 修復単位の設計委任(R4)、#1172 の両様式 fixture(intent-capture 持ち越し所見)、テスト層選定(fs-tests-integration-first 既決)、横断制約 T1-T6。選挙裁定の受領後に [Answer] を記入する(election-answer-after-ruling)。E-OC1 3段: 判定申告 = E-SMF-RA 配信依頼に同梱(23:18Z 頃)→ **leader 承認 2026-07-17T23:37:18Z(agmsg、事後補完 — reviewer Major 指摘による)** → 記入。

## Q1. set-status が後退書き込みを検出したときの挙動

#1170 のガードが「後退方向の書き込み」(approved 済み checkbox の巻き戻し・Current Stage の完了済み地点への後退)を検出した場合の、set-status CLI の観測可能な挙動を確定する。呼び出し元は sync-statusline hook(TaskUpdate ごとに発火、高頻度)であり、エンジンの RMW 経路(withAuditLock 保護)には本ガードを適用しない。

A. **書き込み全体を no-op** — 後退を検出したら state を一切書かず stderr に advisory 1行(stdout-directive-stderr-advisory 準拠)、exit 0(hook 経路のためワークフロー非阻害)。シンプルで half-write を作らない
B. **後退成分のみ抑止し前進成分は書く** — 例: checkbox 巻き戻しは拒否するが Last Updated 等の無害フィールドは更新。部分書き込みの整合検証が複雑化
C. **loud エラー** — exit 1 で失敗させる。hook 発火頻度が高く、正常運用(並行セッションの遅延スナップショット)でも高頻度に発生しうるためノイズ過大
X. Other (please specify)

[Answer]: A(E-SMF-RA 開票 2026-07-17T23:27:53Z、3/3 全て GoA 1。共通根拠: 書込全成分が単一 --stage 引数から導出されるため部分書込 B に有効な部分集合が存在せず、hook 高頻度経路で C の exit 1 はノイズ過大)

## Q2. 後退判定の判定元

ガードが「後退かどうか」を判定する情報源を確定する。

A. **state 現在値との比較** — handleSetStatus が read したスナップショット内の checkbox/Current Stage と書込予定値を比較して判定。軽量・自己完結。read〜write 間の他者書込(TOCTOU 残余)は防がないが、巻き戻し方向の上書きは構造的に消える
B. **audit 再構成との比較** — audit シャードから真の進行を再構成して比較。真実源だが hook 発火のたびに audit parse が走る(コスト増)。out-of-scope の「機構全体の再設計」に接近するリスク
C. **設計ステージへ委任** — 要件は不変条件(approved 済みを巻き戻さない・前進系を抑止しない)のみテスト可能に固定し、判定元は application-design で確定
X. Other (please specify)

[Answer]: A(E-SMF-RA 開票 2026-07-17T23:27:53Z、3/3 — e2 GoA1 / e3 GoA1 / e4 GoA2。**留保転記(必須)**: 比較は lock 取得後に再 read した現在値に対して行う順序 lock→read→compare→write とする — e4 留保、e3 も withAuditLock 内の再 read スナップショット比較で TOCTOU がロック保持者間で閉じることを根拠に挙げ同旨。FR-1d へ反映済み)
