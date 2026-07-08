# NFR Requirements Questions — publish-readiness

> ステージ: nfr-requirements (3.2) / Unit: publish-readiness / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

publish 関連の非機能方針(手動 publish・provenance 不採用・実ツール検証・落ちる実証)は requirements(FR-015/017/018、CON-004)と U4 functional-design(BR-P01〜P09)で確定済み。U4 固有の NFR 具体化は導出のみ。

未解決の曖昧さ: なし。


---

## レビュー経過の記録(§12a)

- イテレーション1(再ディスパッチ — 初回は認証障害で判定前に停止): **READY** — 非ブロッキング3点(scalability の BR 参照、npm CLI 可用性の前提明示、2FA の章立て1追記)を即時反映済み
