# Business Rules — guide-intro

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 執筆の規則

- BR-1: 本文は Amadeus の実体（skill、`.agents/amadeus/` エンジン、installer、実在するコマンドと path）から書き起こす。上流 docs/guide は構成の参考に留め、翻訳・転載をしない（NFR-2。合否 = 逐語一致 0 件）。構成を参考にした旨は index の About に明記する。
- BR-2: コマンド例・出力例は隔離 workspace の実実行結果だけを貼る（NFR-1。コピペで動くこと）。長い出力は無関係部を「…」で省略し、省略した旨を明記する（questions Q2）。
- BR-3: 契約・仕様の詳細はガイドに複製せず、docs/amadeus（契約の正）へリンクで委ねる（engineer1 の留意。#521 で観測した陳腐化の轍を踏まない）。数値（32 stages 等）を書く場合は実体（stage-graph.json）で照合する。
- BR-4: 英語 `*.md` = 正、`*.ja.md` = 併置。リンクは Cross-linking rules（en → .md、ja → 対訳実在分は .ja.md）。日本語版は japanese-tech-writing 規範（NFR-3）。

## 変更範囲の規則

- BR-5: 変更対象は新設 8 ファイルと、既存文書への最小行追記 3 対（language-policy 対 = 適用範囲 1 行、README 対 = User guide リンク 1 行、extension-guide 対 = ガイドへの相互リンク 1 行）に限る（C-1）。#524 依存の内容は書かず、必要箇所は pending-note で委ねる（C-2）。
- BR-6: 残章（#567〜#571）は index の予定一覧としてのみ言及し、本文を書かない。
- BR-7: コミットは章対単位（index 対 / 00 対 / 01 対 / 02 対 / 参照元接続）に分ける。
- BR-8: 対象外文書で見つけた乖離・欠陥は修正せず leader へ Issue 候補として報告する（実例: doctor の dist/ 誤誘導は起案済み）。
