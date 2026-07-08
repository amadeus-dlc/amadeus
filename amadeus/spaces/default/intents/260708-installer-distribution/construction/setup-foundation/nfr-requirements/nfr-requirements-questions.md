# NFR Requirements Questions — setup-foundation

> ステージ: nfr-requirements (3.2) / Unit: setup-foundation / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

NFR の上限・方針は requirements.md の NFR-001〜006 で確定済み。本 Unit 固有の具体化(取得時間配分、抽出安全性、リトライ境界)は既存決定(FR-006/012、ADR-002/003、BR-F 系)から導出可能で、新たな人間判断を要しない。

未解決の曖昧さ: なし。


---

## レビュー経過の記録(§12a)

- イテレーション1: NOT-READY — 7件(Windows コロン問題、予算算術、タイムアウト未定義、md5 帰属、hardlink、upstream 参照、メモリ検証)→ 全件是正+U2/U3 への伝播(Plan の二重タイムスタンプ表現)
- イテレーション2(最終): NOT-READY — 残指摘1件(U1 自身の domain-entities に「同一値」コメント2箇所が残存)
- **ビルダー是正(イテレーション上限到達後)**: installedAt / installStartedAt のコメントを「同一瞬間・別表現(拡張 ISO vs basic ファイル名トークン)」へ修正 — BR-F14/REL-F05/U2 Plan 型と完全整合
