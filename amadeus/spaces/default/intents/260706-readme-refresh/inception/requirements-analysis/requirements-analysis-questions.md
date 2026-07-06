# Requirements Analysis Questions：260706-readme-refresh

回答方法: 各質問の `[Answer]:` に選択肢の記号を記入する。

本 Intent は Issue #535 本文（乖離 6 系統は Maintainer 実測済み）とディスパッチ指示で要求の大半が確定しており、残る判断は記載の直し方の粒度だけである。team.md の質問プロトコル（「分割単位や questions ファイルの省略可否のような小さな構造判断は、ピア協議にかけず担当 engineer の自己判断で進め、gate の人間承認で確定する」）に従い、次の 3 問は自己判断で確定し、gate の人間承認で最終確定とする。

## Q1: skill-forge 段落（L118〜L120）の扱い

A. 段落を削除する。
B. 引用先を直して段落を残す。

[Answer]: A（自己判断）。理由: 引用先の team.md に skill-forge の定義が存在せず、他の normative docs（CONTRIBUTING.md、AGENTS.md、AMADEUS.md、docs/、.agents/rules/）にも定義がない（grep で実測確認）。定義元のない規範的な要求を README に残すと「記載を正とする」乖離を再生産する。skill 変更 PR の粒度規定（team.md の判断基準）は実在するため、skill 変更に関する参照は Contributing 経由の実在文書に委ねる。

## Q2: Internal Skills 表の再構成の粒度

A. 実在 41 skill を役割分類（ステージ実行 29、scope shortcut 4 + init、読み取り専用ユーティリティ 3、補助入口 3、公開入口 1）で表へ再構成する。個別名の全列挙はステージ実行 skill について `skills/amadeus/references/stage-catalog.md` への参照に委ねる。
B. 旧表の形式のまま 29 個のステージ実行 skill 名をすべて列挙し直す。

[Answer]: A（自己判断）。理由: README は入口であり、詳細は正準の一覧（stage-catalog.md）へ委ねるほうが将来の乖離再発を防げる（#533 の「README は入口、詳細はガイドへ委ねる」方向とも整合）。全列挙は skill の増減のたびに README が乖離する構造を温存する。

## Q3: ステージ数・phase 数の表記

A. 「32 stages」「5 phases（Initialization / Ideation / Inception / Construction / Operation）」と実測値で書く。
B. 数値の記載自体を README から落とす。

[Answer]: A（自己判断）。理由: stage-graph（`.agents/amadeus/tools/data/stage-graph.json` = 32 ステージ）と scope grid（EXECUTE / Total = n / 32）が機械的に検証できる正であり、数値は scope 縮退（例: refactor は 8 / 32）の説明に必要。落とすと Highlights の縮退の説明が弱くなる。
