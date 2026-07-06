# Requirements Analysis Questions：260706-guide-ops

回答方法: 各質問の `[Answer]:` に選択肢の記号を記入する。

本 Intent は Issue #568 とディスパッチ指示、前 Intent（260706-guide-intro）の確定様式で要求の大半が確定している。team.md の質問プロトコルに従い、次の 2 問は自己判断で確定し、gate の人間承認で最終確定とする。消費した上流成果物（codekb の business-overview / architecture / code-structure）は requirements.md の「上流の位置づけ」を参照。

## Q1: 12-cli-commands の help 出力の掲載範囲

A. `amadeus-utility.ts help` の実出力を主要節（Scopes / Utilities）ごとに分割して掲載し、それぞれに読み方の説明を添える（全文一括貼付はしない）。
B. help 全文を一括で貼る。
X. Other (please specify)

[Answer]: A（自己判断）。理由: help は長く、一括貼付は導入章の読みやすさを壊す（questions Q2 の前例判断と同型）。節分割 + 説明添付なら「実物を貼る」と可読性が両立し、省略は「…」で明示できる。

## Q2: 06-agents の分類軸

A. 実体の役割分類（domain agents 11 / reviewer 2 / composer 1 = 計 14。`.agents/amadeus/agents/` の実在で照合）で書き、stage との対応は lifecycle 契約へ委ねる。
B. stage graph の lead/support 対応表を章内に再掲する。
X. Other (please specify)

[Answer]: A（自己判断）。理由: B は stage-catalog / lifecycle 契約の複製になり、陳腐化の再生産（#521 の steering の轍）。役割分類は実在ファイルで機械照合でき、詳細は正準へのリンクで辿れる。
