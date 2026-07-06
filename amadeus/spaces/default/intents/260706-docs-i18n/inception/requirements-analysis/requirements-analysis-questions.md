# Requirements Analysis Questions：260706-docs-i18n

回答方法: 各質問の `[Answer]:` に選択肢の記号を記入する。

本 Intent は Issue #521 / #522 / #523 とディスパッチ指示で要求の大半が確定しており、残る判断は様式の適用細部だけである。team.md の質問プロトコル（小さな構造判断は担当 engineer の自己判断で進め、gate の人間承認で確定する）に従い、次の 3 問は自己判断で確定する。

## Q1: 日本語版（*.ja.md）の作り方

A. 現行の日本語本文をそのまま `*.ja.md` へ移し、英語版は意味論一致で書き直す（既存日本語の書き換えは、英語化で判明した誤り・旧名の修正に限る）。
B. 英語版を書いてから日本語版も新規に書き直す。

[Answer]: A（自己判断）。理由: Issue の作業内容が「日本語本文を `*.ja.md` へ移し、`*.md` を英語で書き直す」と明記している。既存日本語は確定済みの内容であり、書き直しは意味論乖離のリスクだけを増やす。「英語で下書きしてから日本語へ翻訳しない」（.agents/rules）とも整合する。

## Q2: 参照元リンクの差し替え範囲

A. `*.ja.md` ファイル（README.ja.md、extension-guide.ja.md、language-policy.ja.md）だけ `.ja.md` 参照へ差し替え、日本語だが `.ja.md` でないファイル（AMADEUS.md、AGENTS.md、.agents/rules/**）は正本 `.md` 参照のまま維持する。
B. 日本語で書かれた参照元はすべて `.ja.md` 参照へ差し替える。

[Answer]: A（自己判断）。理由: Cross-linking rules の適用対象は `*.ja.md` からの参照であり（language-policy.md の実文言）、AMADEUS.md は #536 merge 後も language-policy.md を `.md` で参照している（実測済みの前例）。B は規約の対象外へ規則を拡大解釈することになる。

## Q3: 英語版の見出しアンカー

A. 英語見出しを新設する（前例 = language-policy.md / extension-guide.md の様式）。
B. 日本語見出しを英語版にも残す。

[Answer]: A（自己判断）。理由: 英語正本に日本語見出しを残すと language-policy の様式から乖離する。破壊リスクは実測で否定済み: 対象 8 文書への Markdown アンカー参照は 0 件、行番号参照も 0 件（`grep` で全 repo を走査）。
