# Phase Boundary Verification — IDEATION → INCEPTION

生成: 2026-08-03T09:27:31Z  
対象Intent: `260803-harness-live-e2e`  
方法論: `.codex/knowledge/amadeus-shared/verification.md`、`stage-protocol-governance.md`

## 1. 検証対象

| 成果物 | 状態 | 用途 |
|---|---|---|
| `ideation/intent-capture/intent-statement.md` | 存在・承認済み | 課題、対象者、成功指標、Intent完了境界 |
| `ideation/intent-capture/stakeholder-map.md` | 存在・承認済み | 利害関係者と価値 |
| `ideation/scope-definition/scope-document.md` | 存在・ユーザー承認受領済み | In/Out境界、Phase完了条件、安全境界 |
| `ideation/scope-definition/intent-backlog.md` | 存在・ユーザー承認受領済み | 優先順位付きproto-Unit、依存順序、バリューストリーム |
| `ideation/scope-definition/scope-definition-questions.md` | 存在・全回答に根拠あり | 既決照合、期限制約、合意サマリ、§13裁定 |

## 2. Intent → Scope → Intent Backlogトレーサビリティ

| Intent成功指標 | Scope | Backlog | 判定 |
|---|---|---|---|
| 1. opt-in、GHA deny、skip reason、隔離、lifecycle、失敗分類を共通contract化 | M1 | U1 | PASS |
| 2. policy unit、fake integration、違反注入テスト | M2 | U1および各adapter Unitの完了条件 | PASS |
| 3. Codex維持、Claude `claude -p`最小journey | M3 | U1、U2 | PASS |
| 4. Claude SDK/TUI、Kimi、Kiroの接続または根拠付き後続Issue | M4、M5 | U3、U4、U5 | PASS |
| 5. Cursor/OpenCode実測とadapterまたは後続Issue | M6 | U6 | PASS |
| 6. capability matrix、最終green SHA、実行台帳、完了前実行規範 | M7 | U7 | PASS |
| 7. ローカルopt-in、直列、短時間、短いプロンプト | M1、品質・安全境界 | U1〜U7の共通完了条件 | PASS |

順方向カバレッジ: **7/7（100%）**。すべてのIntent成功指標がScopeとBacklogへ到達する。

逆方向カバレッジ: **M1〜M7およびU1〜U7の100%**がIntent成功指標1〜7のいずれかに対応する。孤立したMustまたはproto-Unitはない。

## 3. スコープ境界の整合性

| 検査 | 結果 | 根拠 |
|---|---|---|
| 共通化境界 | PASS | policy/lifecycleのみ共通化し、transport固有責務をadapterに残す |
| Phase完了境界 | PASS | Phase 1〜3をIntent範囲とし、M4〜M6は実装または証拠付き後続Issueの二択 |
| 優先順位 | PASS | 共通contract→Codex/Claude→Kimi/Kiro→Cursor/OpenCodeの依存順 |
| 期限制約 | PASS | 外部の特定日期限なし。安全契約と証拠を優先 |
| 非目標 | PASS | transport統一、単一PR、通常GHA live、モデル出力完全一致を除外 |
| テスト戦略 | PASS | Comprehensive。各縦スライスにcontract/fake/違反注入/liveを内包 |

矛盾検出: **0件**。Scope Definitionの回答、Scope Document、Intent BacklogはIntent StatementおよびIssue #1717と整合する。

## 4. FeasibilityとスキップステージのN/A判定

| ステージ/成果物 | N/A根拠 | 代用するInception側の検証 |
|---|---|---|
| market-research | 既存Amadeus保守者向けの内部品質機能であり、市場探索を必要としない | Reverse Engineeringで既存live pathと利用者入口を棚卸しする |
| feasibility / `feasibility-assessment` / `constraint-register` | Issue #1717が既存コード、CLI実測、2名クロスレビューを含む。未知部分をCursor/OpenCode capability spikeとして明示済み | Reverse Engineeringで現行実装、Requirements Analysisで能力差と制約を確定する |
| team-formation | 単一チームのself-featureで、担当境界はproto-Unitと後続Units Generationで定義する | Units GenerationとDelivery Planningで所有権・依存関係を確定する |
| rough-mockups | CLIテスト基盤であり視覚UIを生成しない | Application Designでinterfaceと実行フローを設計する |
| approval-handoff | 実行計画でスキップ。Intent CaptureとScope Definitionに個別の人間承認ゲートがある | Scope Definition承認と本phase-checkをIdeation出口の証拠とする |

未知のCLI capabilityを「実現可能」と仮定していない。実装不能時も実測証拠・阻害要因・推奨seam・受け入れ条件を持つ後続Issueへ接続するため、未確認事項は追跡可能である。

## 5. 警告と後続確認事項

- **WARNING（追跡済み）**: Cursor/OpenCodeの非対話実行、project-local設定、認証、終了条件は未実測。U6およびReverse Engineeringで解消する。
- **WARNING（追跡済み）**: Claude TUI runnerによる`AMADEUS_TUI_LIVE=1`自動設定と明示opt-in contractの整合は未裁定。U3およびRequirements/Application Designで確定する。
- **WARNING（追跡済み）**: capability matrixとrun ledgerの配置・schemaは未設計。U7およびApplication Designで確定する。

いずれもInceptionの作業項目へトレースされており、Ideation境界を阻害する孤立・欠落ではない。

## 6. 判定

**PASS** — Intent、Scope、Intent Backlogは双方向に100%トレースされ、矛盾と孤立したMust/proto-Unitはない。スキップされたfeasibility/approval-handoffにはN/A根拠と代用証拠があり、追跡済みの未知事項はInceptionで解消できる。

- [x] 人間によるIntent Capture承認
- [x] 人間によるScope Definition承認回答
- [x] Ideation→Inception phase-check PASS

`PHASE_VERIFIED`監査イベントは、この成果物を確認するアトミックなphase遷移時にエンジンが記録する。
