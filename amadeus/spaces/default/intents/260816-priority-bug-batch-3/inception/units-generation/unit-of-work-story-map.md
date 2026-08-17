# Unit of Work Story Map — intent 260816-priority-bug-batch-3

user-stories ステージは本スコープで SKIP のため、requirements.md の FR を物語単位として各 unit へ写像する(bugfix バッチの標準形)。

## FR → Unit 写像

| FR(requirements.md) | Issue | Unit | 横断 |
|---|---|---|---|
| FR-1: human-required 宣言 milestone ゲートの承認結線 | #3153 | milestone-presence | GATE_APPROVED フィールド追加は audit-format / event-registry の文書同期を伴う(unit 内で完結) |
| FR-2: INTENT_AUTONOMY_HUMAN_REQUIRED の冪等発行 | #3152 | autonomy-refusal-idem | ProductionAutonomyContext の供給面が FR-1 の前提(依存エッジ) |
| FR-3: converged 最終化経路 + 孤児化 created 回復経路 | #3149 | prc-finalization | クラスA(ADR-3)とクラスB(ADR-4)は同一 unit 内の2受け入れ面 |
| FR-4: workspace_requires ガードの後追い record 受理 | #3156 | source-work-probe | なし |
| FR-5: 選挙 store appendPending の並行安全化 | #3046 | election-append | なし |

## 横断関心事

- **NFR-1(TDD)/ NFR-2(回帰防止)**: 全 unit に適用(unit ごとの受け入れ条件に落ちる実証が含まれる)
- **NFR-3(台帳同期)**: `amadeus-state.ts` / `amadeus-orchestrate.ts` を触る unit(autonomy-refusal-idem / milestone-presence / source-work-probe)に適用。新規テストファイル追加は全 unit で coverage-registry regen を同梱
- 文書同期(audit-format.md ↔ event-registry): autonomy-refusal-idem(Idempotency Key 追加)と milestone-presence(承認根拠フィールド + :150 drift 是正)の2 unit が触る — 同一行域(:150 / :297 周辺)の編集が重なるため、着地順に応じた rebase 追従が必要(2.8 の直列化判断材料)

## 実装順(unit 内)

各 unit の内部実装順は TDD の vertical slice(Red → 最小実装 → Green の反復)。unit 内で複数の受け入れ面を持つのは prc-finalization のみ — クラスA(ADR-3)を先行し、その attestation ベース束縛の上にクラスB(ADR-4)の override 記録を載せる(ADR-4 契約3 の依存方向)。

## カバレッジ検証

- 全 FR(5件)が unit へ割当済み・全 unit(5件)が FR を持つ(1:1、漏れなし)
- 割当の根拠はいずれも decisions.md の ADR と Issue 完了条件(requirements.md 受け入れ条件)
