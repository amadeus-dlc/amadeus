# Requirements Analysis Questions：260706-docs-lang-guide

回答方法: 各質問の `[Answer]:` に選択肢の記号を記入する。

本 Intent は Issue #509 / #532 の本文（#532 の骨子は Maintainer 確認済み）とディスパッチ指示で要求の大半が確定しており、残る判断は成果物の置き場と命名だけである。team.md の質問プロトコル（「分割単位や questions ファイルの省略可否のような小さな構造判断は、ピア協議にかけず担当 engineer の自己判断で進め、gate の人間承認で確定する」）に従い、次の 2 問は自己判断で確定し、gate の人間承認で最終確定とする。

## Q1: #509 言語方針文書の置き場と形式

A. `docs/amadeus/language-policy.md`（英語、正）+ `docs/amadeus/language-policy.ja.md`（日本語）を新設する。
B. `docs/amadeus/skill-language-policy.md` へ追記する。

[Answer]: A（自己判断）。理由: skill-language-policy.md の責務は「Amadeus skill（SKILL.md、TS スクリプト）の言語」であり、docs/amadeus 配下の文書の言語方針は対象が異なる。追記すると 1 文書に 2 つの対象範囲が混在する。新設なら方針文書自体が「英語 *.md（正）+ *.ja.md 併置」の方針を自ら実践する最初の実例になり、後続の英語化 Issue（#515〜#523）の参照先としても明確。skill-language-policy.md とは相互参照で整合を取る（FR-1.3）。

## Q2: #532 拡張ガイドのファイル名

A. `docs/amadeus/extension-guide.md` + `extension-guide.ja.md`。
B. `docs/amadeus/scaling-principle.md` など原理名を冠する名前。

[Answer]: A（自己判断）。理由: Issue #532 のタイトルが「拡張ガイド」であり、読者の入口は「拡張したいとき何を編集すればよいか」という利用目的。原理（スケール原理）はガイドの第 1 節として含める（Issue 骨子 1）。
