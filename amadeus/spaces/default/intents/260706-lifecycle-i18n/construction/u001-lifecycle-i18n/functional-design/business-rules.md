# Business Rules — u001-lifecycle-i18n（260706-lifecycle-i18n）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 執筆・検証の規則

| ID | 規則 | 由来 |
|---|---|---|
| BR-1 | 英語 `<name>.md` を正、日本語 `<name>.ja.md` を訳として併置する。日本語本文は無改変（リンク調整と H1 対訳併記のみ許す）。 | language-policy.md、FR-1.1 |
| BR-2 | 訳語は domain-entities.md の対応表を唯一の正とする。表にない語の訳は選定後に対訳記録へ追記し、6 文書で一貫させる。 | FR-1.2 |
| BR-3 | 機械可読ラベル（イベント名、stage slug、checkbox 語彙、path、コマンド）は両言語で同一に保つ。 | FR-1.3 |
| BR-4 | 見出しの対訳併記は日本語版 H1 のみ。H2 以下は各言語で素の見出し。英語版見出しは sentence case。 | FR-1.4、#536 実測 |
| BR-5 | リンクは en→en、ja→ja（対訳あり）/ ja→en（対訳なし）。lifecycle 6 文書間と直下 10 文書への ja 版リンクは ja→ja。 | FR-2.1〜2.4 |
| BR-6 | 節構成・表構造・コードフェンスは英日で 1:1 に保ち、決定論検査（見出し数・表行数・フェンス数・リンク実在）を文書ごとに通す。 | FR-4.1(a)、執筆手順 3 |
| BR-7 | 陳腐化の発見時は言及行に限定した外科修正を英日同時適用し、実測裏取り付きで修正一覧へ記録する。節構成は変えない。迷えば忠実対訳 + Issue 起案。 | FR-3 |
| BR-8 | B001（core 3 文書）が確立した訳語を B002（phase 3 文書）が変更しない。変更が必要なら B001 成果物へ遡って同時修正する。 | Bolt 直列の一貫性 |
| BR-9 | subagent へ委譲した翻訳は、#541 の純正性検証（conductor による決定論検査 + 節単位突き合わせ）を通してから採用する。 | Maintainer 指示（#541） |
| BR-10 | 変更対象は lifecycle 6 文書 + 新規 ja.md 6 ファイル、および直下 4 ファイルの逆方向リンク 5 箇所の ja→ja 化（1 行ずつの最小更新）に限る。エンジン・skill・validator・その他は変更しない。 | requirements 制約 + §12a 反復 1 MEDIUM 指摘（policy 違反状態を残さないための最小追加） |
