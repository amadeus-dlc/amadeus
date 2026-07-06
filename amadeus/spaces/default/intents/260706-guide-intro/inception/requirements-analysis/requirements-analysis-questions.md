# Requirements Analysis Questions：260706-guide-intro

回答方法: 各質問の `[Answer]:` に選択肢の記号を記入する。

本 Intent は Issue #533 とディスパッチ指示で要求の大半が確定している。置き場所と章構成の確定はディスパッチが functional-design（ピア協議可）へ明示的に割り当てているため、questions では扱わない。team.md の質問プロトコルに従い、次の 2 問は自己判断で確定し、gate の人間承認で最終確定とする。

なお、消費した上流成果物（codekb の business-overview / architecture / code-structure）は requirements.md の「上流の位置づけ」を参照。

## Q1: first-workflow の実測シナリオ

A. 隔離 workspace へ installer で導入後、最小の docs 系シナリオ（refactor scope、小さな文書修正）で 1 Intent をエンジンの実コマンドで回し、決定論的なエンジン出力（intent-birth、next の directive、report、status）を実物として貼る。conductor（LLM）の会話部分は説明文とする。
B. sandbox e2e（dev-scripts/evals/engine-e2e）の出力を流用する。
X. Other (please specify)

[Answer]: A（自己判断）。理由: ディスパッチ指示 3 が「隔離 workspace（installer で導入 → /amadeus で 1 Intent 回す）」を明示している。B の e2e は開発用 eval であり、利用者が再現できる導線（installer 導入から）にならない。A は「コピペで動く」受け入れ条件をそのまま満たす。

【functional-design での改訂（gate 承認で確定）】シナリオの具体は「refactor scope の文書修正」から「poc scope の小さな機能（Add a hello command to my CLI）」へ改訂する。理由: (1) 新規利用者の初回体験として docs 系 refactor は自己開発文脈に寄りすぎ、小さな機能追加のほうが自然、(2) poc は EXECUTE 最小級（7 stages）で「最小シナリオ」の趣旨を同等に満たす、(3) 隔離 workspace での実測（intent-birth 実出力）を poc シナリオで採取済み。installer 導入からの実コマンド実測という A の本体は不変。

## Q2: 実行例の表記形式

A. コマンドと出力を分けたコードブロック（実行コマンドは `sh`、出力は無装飾ブロック）で貼り、長い出力は無関係部を「…」で省略した上で省略した旨を明記する。
B. 出力を全文貼る。
X. Other (please specify)

[Answer]: A（自己判断）。理由: 全文貼付は導入章の読みやすさを壊す（audit shard 等は数百行になる）。省略の明示があれば「実物を貼る」（実測駆動）の趣旨と両立し、上流ドリフト検査（実行結果と文書の突き合わせ）も省略マーカー付きで可能。
