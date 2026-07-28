# Tech Stack Decisions — u3-lifecycle-integration

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 決定一覧

| 決定 | 根拠 |
|---|---|
| 新規依存ゼロ — 既存 lifecycle チェーン(boundary/manual)への配線のみで、新しいライブラリ・機構を導入しない | technology-stack 実測: 本 intent 区間で依存宣言の変更 0 行。business-rules BR-U3-7(boundary 新設禁止 — requirements 受入条件14) |
| `completionProjectGate` は台帳のみを入力とする純関数として実装する(Project API 非照会) | business-rules BR-U3-8 — 決定的・オフライン評価。既存スタックの純粋判定+I/O handler 境界(technology-stack の core 様式)に適合 |
| close の実行順序は既存の1操作ずつ前進(final sync → close)を再利用し、新しい coordinator を作らない | business-logic-model 手順3(「coordinator 無変更」)+requirements FR-8a の順序維持 |
| 期待 Status の導出定義は同期側と共有し、gate・boundary 側で文字列表を複製しない(canonical 共有原則) | business-rules BR-U3-8 の導出元記載(「FR-9c と同じ canonical 共有原則」)+requirements FR-9c(診断用の複製導出を作らない) |
| ask 文言はテストで固定(verdict 別出力様式) | business-logic-model の FR-10a 節(ui-less-mockups-as-output-contract)— 既存4層テストランナー(technology-stack)へ integration として追加 |

## 却下した代替案

- **completion 専用の再試行デーモン/ジョブ**: 却下 — requirements FR-1b(daemon/polling 禁止)に抵触。close 保留の収束は boundary 駆動の reconcile 委譲(business-rules BR-U3-5)で成立する。
- **gate 評価時の Project API 再照会(最新状態での判定)**: 却下 — business-rules BR-U3-8 が台帳のみ入力を規定。再照会は NFR-3 の呼び出し予算を破り、gate を外部障害に曝す(オフライン決定性の喪失)。台帳の鮮度は直前の final sync が保証する。
