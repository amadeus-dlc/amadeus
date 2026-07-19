# Scalability Requirements — election-cli(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 負荷前提と成長予測

- 指令ループは選挙1件単位(business-logic-model.md — next --election <id>)。並行選挙 N 件は独立の CLI 呼び出しで、選挙間の共有可変状態は U2 の選挙 ID 配下分離により存在しない。容量計画は N/A(反証可能な根拠: W-04 配布外+投票者は現登録 14 名 — stage diary の team.sh 実測記録 — で成長前提なし)
- verb 追加(将来の拡張)は指令表への行追加で閉じる(business-logic-model.md の状態→指令の一意対応 — 7状態機械は E-ETF-FD2 Q2=A で確定済みであり、状態追加はスキーマ変更として実装前停止→裁定の対象)

## 同時実行

- 書込は conductor 単一プロセス(U2 の単一書込主体構造に従属 — D-09 導出、U2 business-logic-model.md 並行性節)。CLI の並行起動制御は導入しない(team/solo 両モードとも書込主体は1つ — 同節の既承認導出。reviewer 指摘により FR-7a の誤引用を除去)。実行形態は既存スタック(technology-stack.md 実測の Bun 単一プロセス直接実行)のまま
