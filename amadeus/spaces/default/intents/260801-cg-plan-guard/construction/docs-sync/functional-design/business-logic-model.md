# Business Logic Model — docs-sync(U4)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- 対象文書面は `requirements.md` FR-1〜FR-4 のユーザー可視挙動(ガード発動・3部メッセージ・redirect)と `unit-of-work.md` U4 の範囲宣言から列挙した。`unit-of-work-story-map.md` の U4 ストーリー(「挙動と出口が docs から分かる」)を検収観点とする。
- 記述の技術的正本は `components.md` / `component-methods.md` / `services.md` の確定設計(C1〜C7、判定表、guardMessage 3部)— docs は実装確定後にこれらへ照合して書く(U3 依存の理由)。

## 対象文書の列挙(対象語彙の repo 全域 grep 起点 — E-SDE-FD 準拠は実装時に再実施)

| 文書 | 更新内容 |
|---|---|
| docs/reference/12-state-machine.md + .ja.md | invoke-swarm 発行前の計画整合ガード(3値判定)、approve の SWARM 実績突合、bolt_dag_absence の語彙 |
| docs/reference/08-rule-system.md 系(該当時) | 変更なし想定(ルール層の変更なし)— 実装時 grep で確定 |
| docs/guide/(construction 運用節) | ガード発動時の出口手順(計画訂正 → compile → 再実行)、ラダー redirect |
| docs/reference/01-architecture.md(該当時) | bolt_dag_absence フィールド(runtime-graph 契約) |

## 同期規則

- en/ja 対訳を同一 PR で更新(docs-language-ownership)。
- 件数語は隣接列挙原則(c3-adjacent-enum-numerals)— 散文の硬数値を置かない。
- 実装(U1〜U3)着地後の実挙動・実メッセージ文言へ照合してから記述(推測記述禁止)。

## 検収

- ガード3種(発行側/approve側/dag欠落)それぞれの「発動条件・メッセージ3部・出口」が docs から辿れること。
- doc-consuming テスト(t132 系等)がある場合は paths-ignore 盲点(ci-paths-ignore-doc-guard-blindspot)を実装時に確認。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T10:51:43Z
- **Iteration:** 1
- **Scope decision:** none

docs-only unit の比例レビュー — 対象文書実在・引用ノルム実在・型複製なし(概念参照 posture の申告どおり)・実装後記述姿勢の整合を確認。指摘 0 件。

### Findings

- None
