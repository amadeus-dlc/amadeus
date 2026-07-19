# Scalability Design — election-cli(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md、frontend-components.md、domain-entities.md

## 選挙単位の設計

- 全 verb は --election <id> の単一選挙スコープ(business-logic-model.md — scalability-requirements.md の並行選挙独立性の実現形)。選挙横断の verb なし
- 状態追加は E-ETF-FD2 Q2=A の7状態確定によりスキーマ変更 = 実装前停止→裁定の対象(scalability-requirements.md 拡張面)。verb 追加は指令表への行追加で閉じる(frontend-components.md の出力契約表と business-rules.md の verb 契約へ同時に行追加)

## 同時実行

- 書込は conductor 単一プロセス(D-09 導出 — U2 の単一書込主体へ従属)。並行起動制御なし(scalability-requirements.md)。読取専用 verb(next/status)は並行安全(performance-requirements.md の読取設計・security-requirements.md の読取専用契約と一体)。ランタイムは tech-stack-decisions.md の Bun 単発 CLI。信頼性面の hold 復帰(reliability-requirements.md)も状態機械内で閉じ、外部調停を要しない
