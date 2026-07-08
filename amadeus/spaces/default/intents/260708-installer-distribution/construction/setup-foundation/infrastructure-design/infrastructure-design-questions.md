# Infrastructure Design Questions — setup-foundation

> ステージ: infrastructure-design (3.4) / Unit: setup-foundation / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

feasibility でクラウドインフラ不要が確定済み(compose ゲートでも「npm レジストリ+GitHub Actions ランナー+シークレット管理に絞った軽量版」として EXECUTE 維持)。本 Unit のインフラ面は外部サービス契約(GitHub)と CI の既存構成のみで、新たな人間判断はない。

未解決の曖昧さ: なし。


---

## レビュー経過の記録(§12a)

- イテレーション1(並行レビュー): NOT-READY — 3件(tsconfig 再帰グロブの未指定、出典欠落(NFR-006・U4 遅延ビルド)、dist 非依存前提の暗黙性)→ 全件是正: `packages/setup/src/**/*.ts` の再帰形を明示、出典を補完、遅延ビルドヘルパーの初出を U1 の FR-002 E2E と定義し「それ以外は TS 直接実行」を明文化

- イテレーション2: NOT-READY — (1) NFR-006 の出典が nfr-requirements/performance-requirements.md への誤帰属(実定義は inception/requirements-analysis/requirements.md)、(2) イテレーション1修正が導入した「遅延ビルドヘルパー U1 初出・U4 再利用」の所有関係が5成果物に未伝播+パス/契約未定義(functional-design:c3 パターン)
- **ビルダー決着(§12a 上限2イテレーション到達)**: 全指摘の実在を確認のうえ修正 — NFR-006 出典を requirements.md へ差し替え。ヘルパーを `tests/lib/setup-lazy-build.ts` / `ensureSetupCliBuilt(): Promise<string>`(不在時のみ ADR-002 同一コマンドで bun build、冪等)として契約化し、U1 cicd-pipeline・U1 shared-infrastructure(新規行)・U4 shared-infrastructure(消費行)・U4 cicd-pipeline(出典+本文)・U4 functional-design/business-logic-model(前提文の整合)の5箇所へ伝播。第3イテレーションは行わず、本記録をもって決着とする(指摘はすべて機械的な伝播・帰属修正であり、設計判断の変更を含まないため)
