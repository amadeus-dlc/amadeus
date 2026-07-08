# Infrastructure Design Questions — setup-foundation

> ステージ: infrastructure-design (3.4) / Unit: setup-foundation / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

feasibility でクラウドインフラ不要が確定済み(compose ゲートでも「npm レジストリ+GitHub Actions ランナー+シークレット管理に絞った軽量版」として EXECUTE 維持)。本 Unit のインフラ面は外部サービス契約(GitHub)と CI の既存構成のみで、新たな人間判断はない。

未解決の曖昧さ: なし。


---

## レビュー経過の記録(§12a)

- イテレーション1(並行レビュー): NOT-READY — 3件(tsconfig 再帰グロブの未指定、出典欠落(NFR-006・U4 遅延ビルド)、dist 非依存前提の暗黙性)→ 全件是正: `packages/setup/src/**/*.ts` の再帰形を明示、出典を補完、遅延ビルドヘルパーの初出を U1 の FR-002 E2E と定義し「それ以外は TS 直接実行」を明文化
