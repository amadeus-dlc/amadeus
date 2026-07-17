# Team Assessment — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../scope-definition/scope-document.md`(In/Out・単一 Bolt 見込み)、`../scope-definition/intent-backlog.md`(B-1〜B-4)、`../feasibility/feasibility-assessment.md`(GO・S 規模見積もり)。

## 体制(role-model 既決に基づく)

チームモード5名体制(leader + e1〜e4)。本 intent の担当:

- **conductor**: e3(leader 割当 2026-07-16T11:04Z)。領域アフィニティ一致: installer/harness port 系列 — #626 intent 全工程の conduct、#1048 の起票(台帳 verbatim+再現実測)、前 intent RE の installer 5ファイル台帳(第3独立再列挙)を最深保持
- **実装**: builder subagent 1名(worktree 隔離、c2 規律+builder-prompt-sync-completion+deviation-stop(M2 の該当性判断非単独条項込み)を毎回明記、disk-evidence-early-takeover 適用)
- **PR レビュー**: 1名(作成者先行指名 — L3。実装者=builder/conductor 以外)
- **Issue クロスレビュー**: #1048 は済み(e1/e4)。新規起票が生じた場合は2名
- **選挙**: 全員参加(E-1048-* 系列進行中)

## 適合性の根拠

- 変更面(packages/setup 5ファイル)は前 intent RE で e3 が実測・レビュー往復済みの領域
- 検証面(npm pack / setup-pack-contract / patch gate)も e3 の直近実測領域(#1074/#1090 の CI 監視・#1085 の切り分け)
