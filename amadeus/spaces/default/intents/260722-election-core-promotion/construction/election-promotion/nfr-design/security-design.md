# Security Design — election-promotion

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- security-requirements の「import 1行のみ・fail-closed 契約不変」を保つ構造: diff 検分契約(BR-2 — 出典は U2 FD business-rules.md、本ステージ consumes 外のため正本直読 2026-07-23。reliability-requirements が同 BR-2 を引用済み)が変更面を機械的に閉じる。business-logic-model の移動ロジック(import 1行のみの変更宣言)と同一契約の両面。選挙 store のコードパスは無変更(移動のみ)
- SKILL.md の参照置換は tech-stack-decisions の既習配線様式内で完結(実行意味論への非干渉)

## 検証設計

- security-requirements の N/A(追加検査なし)を維持 — 変更面の最小性自体が対策。reliability-requirements の diff 検分+テスト green が同時にセキュリティ回帰も検出

## 他 NFR との整合

- performance-requirements の影響ゼロ宣言と同一根拠(実行パス不変)。scalability-requirements の規模不変とも一体
