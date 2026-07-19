# Scalability Design — election-record(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## ステートレス設計

- render/verify は全て純関数(モジュールレベル可変状態なし — business-logic-model.md)。並行実行制御は不要(scalability-requirements.md 同時実行節の設計反映)
- 選挙1件単位の動作(入力は単一選挙の票集合+記録文書)で、選挙件数増の影響を受けない構造(scalability-requirements.md 負荷前提の構造化)

## 拡張面

- GoA 行様式の拡張は NFR-4 により禁止(reliability-requirements.md 互換性保証節の設計反映)— 拡張点を意図的に設けない(スキーマ変更は実装前停止→裁定の対象)
- 規模前提(performance-requirements.md の投票者 14 名実測)と入力検証(security-requirements.md の GoaLineCode fail-closed)は選挙1件単位の設計に閉じ、スケール機構を要求しない。ランタイムは tech-stack-decisions.md の Bun 単一プロセスのまま
