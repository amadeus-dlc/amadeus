# Discovered Rules — チーム機能のコア昇格

> 上流入力(consumes 全数): code-structure、technology-stack、dependencies、code-quality-assessment、architecture、business-overview

## 新規発見ルール

なし(0件)。ユーザー確認(Q1=A、2026-07-23)により本 intent に伴うプラクティス変更はなく、affirm 済み team.md / project.md の現行内容を維持する。

## 根拠

- RE codekb(同日 2026-07-23 実測)のスキャン面が CI・テスト・コードスタイル・配布経路をカバーし、affirm 済み内容との差分ギャップは検出されなかった(practices-discovery:c1 の代用条件を充足)
- 昇格作業が触れる規約(core/tools 配置、Bun-only、drift guard)はすべて project.md に既決 — 新規ルール化の必要なし
- team.md / project.md への promote は不要のため実施しない(practices-discovery:c2 の churn 回避 — 無変更セクションの live 温存)
