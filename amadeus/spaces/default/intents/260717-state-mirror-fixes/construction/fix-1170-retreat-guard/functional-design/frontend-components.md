# Frontend Components — fix-1170-retreat-guard(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## N/A 宣言(反証可能根拠付き)

本 unit は CLI/hook のみで UI を持たない(services.md「新規サービス・常駐プロセス・外部 API を導入しない」、rough-mockups/refined-mockups は scope SKIP)。UI-less unit の本成果物は「verdict 別の出力文言+exit code のモック」で充足する(ui-less-mockups-as-output-contract)。

## 出力契約モック(テスト文言の導出元)

| 経路 | stdout | stderr | exit |
|---|---|---|---|
| 前進(書き込み成功) | `{"updated":true,"phase":…,"stage":…,"agent":…}`(既存様式不変) | (なし) | 0 |
| 後退(no-op) | (なし) | `set-status: retreat write suppressed for "<stage>" (checkbox=<state>)` 1行 | 0 |
| 事前検証失敗(state 不在/stage 不明) | (なし) | 既存 die メッセージ(不変) | 1 |
| ロック取得失敗 | (なし) | withAuditLock の既存 throw メッセージ | 非0(既存) |

既存兄弟様式(engine の stdout=JSON / stderr=advisory — stdout-directive-stderr-advisory)に揃え、新規様式を発明しない。
