# Constraint Register — チーム機能のコア昇格

> 上流入力(consumes 全数): intent-statement(スコープシグナル・成功定義を制約導出の起点として参照)

## Technical Constraints(技術制約)

| ID | 制約 | 出所 | 影響 |
|---|---|---|---|
| T-1 | 配布フレームワークへの runtime dependency 追加は理由の文書化なしに禁止(Bun-only) | project.md Forbidden(既決) | herdr/agmsg は「同梱しない外部 prerequisite」として扱う(Q1 裁定)。依存宣言と不在時 loud エラーの設計が必須。ADR で明文化 |
| T-2 | `packages/framework/core/tools/` 配置は全6ハーネスの dist へ構造投影される | cid:code-generation:harness-tools-placement(既決) | 選挙 CLI はハーネス中立なので core 配置が整合。配置根拠を ADR 化(leader 指摘 2026-07-22T22:24Z) |
| T-3 | チーム起動系は bash 実装(team-up.sh)、herdr の stable 対応は macOS/Linux | 実測(team-up.sh、herdr.dev) | サポート下限は macOS+Linux(Q2 裁定)。Windows はチーム機能対象外と docs 明記 |
| T-4 | 正本編集は packages/framework/、`dist/` 手編集禁止、`dist:check`/`promote:self:check` の drift guard 現役 | project.md Mandated(既決) | 昇格は「移動+再生成+ガード green」の定型で実施 |
| T-5 | 配布面(dist/self-install)から `scripts/` への参照は禁止(本 intent で機械ガード新設) | intent-capture Q2 裁定 | 選挙スキルの現存参照(SKILL.md → scripts/amadeus-election.ts)は昇格時に解消必須 |
| T-6 | 外部依存の契約は「PATH 上に存在し実行可能」のみ。バージョン実測値: herdr 0.7.1 / agmsg 1.1.6 | Q1 裁定+実測 | 検出は PATH 探索+不在時 loud エラー。動作確認バージョンを docs へ記録 |

## Organizational Constraints(組織制約)

| ID | 制約 | 出所 | 影響 |
|---|---|---|---|
| O-1 | PR マージは人間承認必須(no-AI-merge)、リリースは release.yml 一本 | org/project 既決 | 昇格 PR・docs PR とも通常のマージ承認フローに従う |
| O-2 | 本 intent の判断はユーザー直接回答で確定(選挙不実施) | ユーザー宣言(WORKFLOW_STARTED 2026-07-22T22:24:58Z アンカー) | 各ステージの質問・ゲートはセッション内で直接諮る |
| O-3 | チームモード運用ノルム(team.md)は本 intent の配布対象ではなく参照元 | team.md(既決) | docs 化は「Operating Modes 契約の公式説明」であり、ノルム本文の移動・改変はしない |

## Regulatory Constraints(規制制約)

| ID | 制約 | 出所 | 影響 |
|---|---|---|---|
| R-1 | 該当する規制要件なし(PCI/HIPAA/SOC2/データレジデンシー等) | compliance 視点の実測(開発ツール、ユーザーデータ収集なし) | 追加対応不要 |
| R-2 | 外部ツールのコード同梱を行わないため、ライセンス伝播は発生しない。agmsg の配布条件は入手経路確定時に1回確認 | Q1 裁定+ライセンス実測(herdr=OSS、agmsg=LICENSE 不在) | docs 記載前の確認タスクとして raid-log D-2 で追跡 |
