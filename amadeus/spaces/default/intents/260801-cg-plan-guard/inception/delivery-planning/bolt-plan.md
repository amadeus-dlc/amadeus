# Bolt Plan — 260801-cg-plan-guard

上流入力(consumes 全数): unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、components.md、requirements.md

- `unit-of-work.md` の4 Unit と採番予約(t399/t400/t401)、`unit-of-work-dependency.md` の直列 DAG(4バッチ)と理由記録、`unit-of-work-story-map.md` の価値到達点、`requirements.md` の制約(walking-skeleton gate 維持・worktree 分離・no-AI-merge)を Bolt 編成へ転記した。
- 各 Bolt の内容欄のコンポーネント対応(C1〜C7)は `components.md` の定義に従う(Bolt 1 = C4/C5、Bolt 2 = C1/C2/C3、Bolt 3 = C6/C7)。

## Bolt 編成(1 Unit = 1 Bolt = 1 PR、全直列)

| Bolt | Unit | 内容 | ブランチ | ゲート |
|---|---|---|---|---|
| 1 | U1 dag-integrity | FR-3 fail-closed+bolt_dag_absence+#1893 是正(FR-5) | bolt/cpg-1-dag-integrity | **walking-skeleton gate**(self-feature Mandated — Bolt 1 は単独実行・ユーザー承認後に残り継続) |
| 2 | U2 issuance-guard | FR-1 3値化+FR-4 guardMessage | bolt/cpg-2-issuance-guard | 通常(autonomy モードはラダープロンプトで決定) |
| 3 | U3 approve-reconciliation | FR-2 実績突合+corpus sweep(FR-6 横断) | bolt/cpg-3-approve-recon | 通常 |
| 4 | U4 docs-sync | reference/guide の en/ja 対 | bolt/cpg-4-docs | 通常 |

## walking-skeleton(Bolt 1)の根拠

U1 は判定入力の信頼化(fail-closed の骨格)であり、end-to-end スライスとして「absent/malformed → loud エラー → 計画訂正 → compile → 緑」の全経路を最初に実証する。最大リスク(誤発動)への防御(degrade スコープの正常系維持 = AC-3b)もここで確立してから B2/B3 のガード本体へ広がる。

## AC-4a の分担(UG レビュー advisory の反映)

AC-4a(3部メッセージの機械検査)は **U2 が canonical ビルダー+発行側メッセージ分、U3 が approve 側メッセージ分**を各自のテストで担う(共同所有 — 重複・欠落を U3 の corpus sweep で最終確認)。

## 直列実行の理由(本 intent のガード規範の自己適用)

全 Bolt 直列。理由は unit-of-work-dependency.md の記録どおり: U1→U2(bolt_dag_absence 消費)、U2→U3(guardMessage canonical+amadeus-orchestrate.ts 同一ファイル交差)、U3→U4(実装確定後の docs)。**本計画自身が「正当直列は理由を delivery-planning に記録する」規範の実例であり、実装後の corpus sweep で本 record 自体が緑ケースに入る。**

## 検証・着地

各 Bolt: TDD(Red verbatim → Green)→ 全検証(typecheck/lint/dist:check/promote:self:check/対象テスト/ローカル lcov uncovered 0)→ deslop → PR(日本語タイトル、closing keyword 禁止、Refs #1892 #1893)→ CI green → §12a → ユーザーマージ承認。core 変更 Bolt(1〜3)は dist 7面+self-install 再生成。
