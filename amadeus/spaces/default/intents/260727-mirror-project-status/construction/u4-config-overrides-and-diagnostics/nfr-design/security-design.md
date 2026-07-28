# Security Design — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

security-requirements の fail-closed 入力検証・read-only 保証・秘匿・権限不変を、closed schema と手順配置で実現する。新しい認証面・スキーマ機構を導入しない(tech-stack-decisions の決定)。

## 入力検証(fail-closed)

- **closed schema の3層**: unknown key(config ルート)・unknown phase キー(status-names 内)・形式不正をすべて issue 化(business-logic-model の4面一般化 — security-requirements)。既存 unknown-key 拒否様式の拡張であり、新 parser を書かない(tech-stack-decisions)。
- **無効層の遮断**: parse 失敗した層の値は同期・診断のどちらの入力にもしない(business-logic-model の層解決)— 壊れた設定の部分適用を構造的に排除(reliability-requirements の設定障害時挙動と同一機構)。

## read-only 保証の設計

- 診断は gateway の照会メソッドのみを呼ぶ手順構成(business-logic-model の repair status 手順)— mutation メソッドへの到達経路を診断コードパスに置かない。negative assert(mutation 0 回 — security-requirements の受入条件12)で機械固定。
- 台帳 write 0(security-requirements)— 診断は台帳の読取消費のみで、reducer transition を呼ばない構造。

## 秘匿の設計

- 診断出力は Project 識別子・選択肢名・状態ラベルのみ(security-requirements の FR-6c/NFR-4 面)— 生の GraphQL 応答・token を出力へ流す経路を持たない(U2 redact 流儀)。出力量は Project 数に線形(scalability-requirements)。
- 検証: 固有トークン注入で診断出力 0 hit を assert(security-requirements)。

## 権限の設計

- permission-denied は診断分類の1値として扱い(business-logic-model 手順3の resolution 4値)、必要権限の名前のみを示す — 認証 scope の自動変更・再認証を実装しない(security-requirements の FR-10b 面)。診断の反復実行も状態を変えないため権限昇格の足場にならない(performance-requirements の mutation 0 と同一保証)。
