# NFR Design Questions — upgrade-flow

> ステージ: nfr-design (3.3) / Unit: upgrade-flow / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

U3 の NFR 要件(3.2)と U1/U2 の NFR 設計(ポート分離・SafeTargetPath・fail-fast)が確定済み。upgrade 固有の構造化は導出のみ。

未解決の曖昧さ: なし。


---

## レビュー経過の記録(§12a)

- イテレーション1: NOT-READY — 1件(「新規モジュールゼロ」claim が SEC-U01 の applier.ts 修正必要性と矛盾)→ modules/ セクションを精密化
- イテレーション2(最終): NOT-READY — 是正文自体が持ち込んだ同種欠陥1件(wizard.ts の「無改修」主張 — summary ヘルパーの文言分岐には中身の修正が必要)
- **ビルダー是正(イテレーション上限到達後)**: wizard.ts を修正対象(summary の subcommand 分岐、シグネチャ不変)と明記し、要約行を「修正3箇所(applier/cli/wizard)」へ更新。非ブロッキング指摘(U2 への相互参照)も U2 reliability-design へ反映済み
