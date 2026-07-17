# Constraint Register — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`。

## 制約台帳

| # | 制約 | 出所 | 影響 |
|---|---|---|---|
| C-1 | 文書化(または一次ソース確定)イベントのみ配線 — 実測不能面は出荷しない | Issue スコープ(3)+PR #1046 U3 工程0 前例 | 写像表に「未対応(根拠)」行が残ることを設計が許容する |
| C-2 | ゲート強制・監査整合はツール所有 emit が正、hook は補助 | ADR-3 セキュリティ影響欄 | プラグイン欠落・無効化でも正しさ不変 — アダプタはベストエフォート |
| C-3 | core への harness 分岐直書き禁止 | #626 非目標(継承) | 表層は packages/framework/harness/opencode/ に閉じる |
| C-4 | payload スキーマ未文書(docs 実測) | 公式 docs(2026-07-16 WebFetch) | 語彙確定は @opencode-ai/plugin 公開ソース直読(saas-undocumented-source-read)が RE の必須工程 |
| C-5 | プラグインは JS/TS module(export const X = async (ctx)=>({hooks})) | 公式 docs verbatim | Bun-only 前提と両立(TS のまま配布可か、または JS 生成かは design 判断) |
| C-6 | dist regen 8ミラー+drift guard | project.md Mandated | plugins/ 追加は manifest 経由で package.ts に載せる(dist 手編集禁止) |

## 制約間の関係

C-1(配線限定)と C-4(語彙未文書)は対 — C-4 の解消(一次ソース直読)が C-1 の配線可否判定の入力になる。C-2/C-3 は不変条件、C-5/C-6 は実装形式の制約。
