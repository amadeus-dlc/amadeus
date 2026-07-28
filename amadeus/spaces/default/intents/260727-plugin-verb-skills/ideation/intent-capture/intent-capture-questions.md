# Intent Capture 明確化質問 — 260727-plugin-verb-skills

> E-OC1 判定: ソロモード運用(AMADEUS_OPERATING_MODE 未設定)につきエージェント選挙は適用外。本質問はユーザー直接裁定で回答する。
> 事前裁定済み事項(intent-capture:c1 準拠、質問を重複再演しない): 実装計画の骨子は Issue #1597 本文で確定済み — (1) `/amadeus plugin <status|compose|drop|doctor>` ユーティリティハンドラ(11-contributing.md チェックリスト準拠) (2) ユーザー起動スキル `amadeus-plugin`(amadeus-mirror 様式に倣う) (3) 全ハーネス投影+docs(19-plugins EN/JA)の入口更新。命名・様式は既存パターン(requirements-analysis:c5)に従い質問しない。

## Q1: #1598(runner-gen の plugin 対応)を本 intent に同乗させるか

composed plugin stage に stage-runner スキル(`/amadeus-<slug>`)が生成されない非対称(#1598、P3)を、本 intent のスコープに含めるか。

- A: 同乗させる — 同じ「plugin の入口対称性」テーマであり、runner-gen 変更+plugin 発見の配線を同一 intent で閉じる
- B: 同乗させない — 本 intent は #1597(運用 verb の入口)に限定し、#1598 は別 intent とする(推奨: 変更面が runner-gen 系と utility/skill 系で分かれ、PR も自然に分割される)
- C: 本 intent では設計判断のみ行い、実装は別 intent に送る
- X: その他(自由記述)

[Answer]: A — #1598 を同乗させる(ユーザー直接裁定。初回提示時の確認応答「スコープを削ろうとしていますか?」を受け、#1598 同乗=拡張である旨を明示した再提示で「#1597 フル + #1598 同乗」を選択)

## Q2: `/amadeus plugin install <path>` を本 intent のスコープに含めるか

Issue #1597 の提案4(検討マーク): folder-drop コピー+compose を1操作にする install verb。trust 境界は現行 compose の承認ゲートを維持する前提。

- A: 含める — INSTALL.md 手順の手作業(コピー→compose)が最大の摩擦点であり、入口整備と同時に閉じる
- B: 含めない — まず既存4 verb(status/compose/drop/doctor)の配線に限定し、install は利用実績を見て別 intent で判断
- X: その他(自由記述)

[Answer]: A — install verb を含める(ユーザー直接裁定「#1597 フル + #1598 同乗」— Issue 提案1〜4 の全項目実装)

## 裁定の記録

- Q1 = A(#1598 同乗)、Q2 = A(install verb 含む)。スコープ = #1597 提案1〜4 フル + #1598(runner-gen の plugin 対応)。
- ユーザー承認: 2026-07-27T14:58:20Z — AskUserQuestion「スコープ確定」への回答「#1597 フル + #1598 同乗」
- 経緯: 初回2問提示にユーザーが「スコープを削ろうとしていますか?」と確認 → 削減意図なし・選択肢の意味(拡張/Issue 内検討マーク)を明示して再提示 → 最大スコープを選択。
