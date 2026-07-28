# Application Design 質問ファイル — 260727-mirror-project-status

**モード**: 0問様式

## 判定(0問の根拠)

- 未決の設計判断は上流 requirements の「design への委任事項」4件(第4 operation か内部ステップか / config キー形状 / state 永続化形 / GraphQL 層設計)のみで、いずれも裁定済み委任 — architect が ADR として起草し、reviewer(architecture-reviewer)審査+承認ゲートで検証する。ユーザーへの追加質問は不要
- コンポーネント境界は上流 architecture(codekb)の実測地図(mirror 16モジュール、gateway 唯一のプロセス境界)と component-inventory の閉じた台帳(MIRROR_TOOL_FILES ↔ t285 の手動同期面 — 新モジュール新設可否の判断材料)が既定し、team-practices の対応表が制約を明文化済み。質問不要
- ユーザー承認: 2026-07-27T06:02:56Z(0問様式の確認「A. 0問で進める」)

## 裁定の記録

- 委任4件の設計裁定は decisions.md の ADR-1〜ADR-5 として成文し、承認ゲートで確定する(先取り記入はしない — ruling-dependent-placeholder 準拠。ゲート承認時刻はゲート後に監査が記録)。
