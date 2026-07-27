# Requirements Analysis — 明確化質問 (260727-install-doc-mismatch)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — Q1 の背景は architecture.md(discovery 入力と compose 出力の分離モデル)と code-structure.md(#1569 対象ファイル所在表)の現在断面に依拠し、症状の業務影響は business-overview.md(plugin 導入 UX の案内誤り)に依拠する。

> 運用モード: ソロ。判定: 既決事項(ユーザー裁定 A = docs/INSTALL.md 側修正、修正対象面、リグレッションテスト必須)は質問対象外(cid:requirements-analysis:no-election-for-decided-norms)。真に未決の設計判断 1 問のみを問う。回答記入は裁定受領後にのみ行う(cid:requirements-analysis:election-answer-after-ruling)。

## Q1. installDoc 文言と discovery パスの一致をどう強制するか

背景: #1569 の真因は `packages/framework/core/tools/amadeus-plugin.ts:278-279` の discovery 定数(`.amadeus-plugin-src`、private・非 export)と `scripts/plugin-projection.ts:593` の installDoc 文言が別モジュールで独立管理され、一致を強制する仕組みが皆無だったこと(codekb `code-quality-assessment.md` 負債シグナル 1)。文言修正だけでは同型再発を防げない。

A. **共有定数化(構造的強制)** — `.amadeus-plugin-src` リテラルを export された共有定数へ昇格し、discovery(amadeus-plugin.ts)と installDoc(plugin-projection.ts)の両方が同一定数を参照する。リグレッションテストは installDoc 出力に定数由来のパスが現れることを固定
B. **テストのみで固定(変更最小)** — 生産コードの結合は増やさず、リグレッションテストが「installDoc 出力のコピー先 == discovery が走査するパス」を両モジュール横断でアサートする(installDoc 出力に `.amadeus-plugin-src/<name>/` が現れることを t307 系へ追加)
C. 文言修正のみ(テストなし) — bugfix スコープの regression-first 規範に反するため非推奨
X. Other (please specify)

[Answer]: A. 共有定数化(構造的強制)+リグレッションテスト

## 裁定の記録

- Q1 = **A(共有定数化)**: 承認 2026-07-27T07:52:00Z、ユーザー直接裁定(ソロ運用・AskUserQuestion 経由、推奨案をそのまま採用)。`.amadeus-plugin-src` を export された共有定数へ昇格し、discovery と installDoc の両方が同一定数を参照する。リグレッションテスト併設。
- 前提裁定(本ステージ外・承認系譜): #1569 の修正方向 = **(A) docs/INSTALL.md 側修正**(2026-07-27 ユーザー裁定、Issue #1569 コメント https://github.com/amadeus-dlc/amadeus/issues/1569#issuecomment-5088508377 に記録)。スコープ = amadeus-bugfix 維持(2026-07-27、amadeus-document 切替を提示のうえユーザーが維持を選択)。
