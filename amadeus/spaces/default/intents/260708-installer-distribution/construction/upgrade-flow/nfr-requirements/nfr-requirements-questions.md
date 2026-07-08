# NFR Requirements Questions — upgrade-flow

> ステージ: nfr-requirements (3.2) / Unit: upgrade-flow / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

NFR-002(カスタマイズ保持)の実現規則は FR-008/009 と U3 functional-design(BR-U 系)で確定済み。U1/U2 の NFR 具体化(タイムアウト・予算・Windows 安全・書き込み封じ込め)を継承し、U3 固有の具体化(退避順序保証・対象側 md5 コスト)は導出のみ。

未解決の曖昧さ: なし。


---

## レビュー経過の記録(§12a)

- イテレーション1: NOT-READY — 1件(SEC-U01 第2文の空虚な除外主張)→ 設計上の事実へ再アンカリング+全 SEC-U 項目に検証行追加
- イテレーション2(最終): **READY**(設計との一致・検証可能性・波及なしを確認済み)
