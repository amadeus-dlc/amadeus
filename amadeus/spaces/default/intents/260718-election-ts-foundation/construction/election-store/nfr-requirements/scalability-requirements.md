# Scalability Requirements — election-store(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 負荷前提と成長予測

- 選挙1件のデータは投票者数(現登録 14 名 — stage diary の team.sh 実測記録)に比例し、成長前提を持たない(W-04 配布外)。容量計画は N/A(反証可能な根拠: business-logic-model.md レイアウトの全ファイルが選挙 ID 配下に閉じ、選挙間で共有される可変ファイルがない)
- 選挙件数の増加は `elections/<ID>/` ディレクトリの線形増のみ。一覧走査を要する操作は現要件に存在しない(requirements.md FR-3c status も単一選挙内の照会)

## 同時実行

- 書込主体は conductor ただ1つ(business-logic-model.md 並行性節 — D-09 導出、E-ETF-FD2 (1) 承認)。複数プロセスの並行書込は構造的に発生せず、ロック機構を導入しない。torn-write は tmp+rename が防ぐ(reliability-requirements.md に詳細)
- 実行形態は既存スタック(technology-stack.md 実測の Bun 単一プロセス直接実行)のまま

## 消費側棚卸し(requirements-analysis:c4 の第4項)

- U2 の JSON レイアウト(election.json/ledger.json ほか — business-logic-model.md)は U5 election-cli と U6 election-skill が消費する契約面(unit-of-work-dependency.md の依存: election-cli/election-skill → election-store)。現時点で契約変更の予定なし。スキーマ変更が必要になった場合は実装前停止→裁定(deviation-stop-before-implement 準拠)とし、消費側2ユニットの fixture 伝播(fixture-propagation-grep)を同一変更で行う
