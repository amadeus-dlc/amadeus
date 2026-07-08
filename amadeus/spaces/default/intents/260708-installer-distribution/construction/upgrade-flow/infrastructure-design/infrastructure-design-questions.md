# Infrastructure Design Questions — upgrade-flow

> ステージ: infrastructure-design (3.4) / Unit: upgrade-flow / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

U3 は U1/U2 のインフラ面を完全に共有し、新規の外部面・CI 面を持たない。

未解決の曖昧さ: なし。


---

## レビュー経過の記録(§12a)

- イテレーション1(並行レビュー第1陣): NOT-READY — 2件(unsupported-layout フィクスチャの導出経路欠落、垂直 upstream 参照の薄さ)→ 是正: 派生フィクスチャを4種に拡張(LegacyLayout 条件 a/b の両系)+nfr-design/functional-design への参照を全成果物に追加

- イテレーション2(最終): READY — 派生フィクスチャ4種が `LegacyLayout.isUnsupported` 条件(a)/(b)と1対1対応、垂直 upstream 参照の実在・言い回し一致まで確認済み。新規指摘なし
