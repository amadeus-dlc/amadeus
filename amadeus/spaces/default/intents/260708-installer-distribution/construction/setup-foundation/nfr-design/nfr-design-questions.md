# NFR Design Questions — setup-foundation

> ステージ: nfr-design (3.3) / Unit: setup-foundation / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

NFR 要件(3.2)が数値・制約・検証方法まで確定済み。本ステージは「どの構造で実現するか」の設計具体化であり、新たな人間判断を要しない。

未解決の曖昧さ: なし。


---

## レビュー経過の記録(§12a)

- イテレーション1: NOT-READY — 6件(REL-F01 自己矛盾、createManifestIo 乖離、domain/internal 依存方向、SEC-F03 シグナル、tech-stack 未参照、SafePath 宙ぶらりん)→ 全件是正
- イテレーション2(最終、再ディスパッチ): NOT-READY — 残指摘1件(是正自体が導入した createFetcher(http, tmpWrite) 乖離の置換注記漏れ)
- **ビルダー是正(イテレーション上限到達後)**: component-methods.md の fetcher 節に manifest-io と同パターンの置換注記を追加(TmpWrite 限定が REL-F01/SEC-F03 の構造保証である旨込み)
