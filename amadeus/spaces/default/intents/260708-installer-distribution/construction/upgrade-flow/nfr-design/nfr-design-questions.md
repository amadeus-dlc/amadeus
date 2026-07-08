# NFR Design Questions — upgrade-flow

> ステージ: nfr-design (3.3) / Unit: upgrade-flow / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

U3 の NFR 要件(3.2)と U1/U2 の NFR 設計(ポート分離・SafeTargetPath・fail-fast)が確定済み。upgrade 固有の構造化は導出のみ。

未解決の曖昧さ: なし。


---

## レビュー経過の記録(§12a)

- イテレーション1: NOT-READY — 1件(「新規モジュールゼロ」claim が SEC-U01 の applier.ts 修正必要性と矛盾)→ modules/ セクションを精密化(applier.ts = 修正対象と明示、install 経路への安全側副作用を許容として記載、wizard 文言の実現方法も明記)
