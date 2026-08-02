# Code Generation Plan — u4-mirror-declaration-drift

## 前提とトレーサビリティ

- 対象は brownfield の Bun/TypeScript モノレポであり、既存の公開 API と Result 型を維持する。
- user-stories はスコープ外のため、`unit-of-work-story-map.md` の FR 写像をストーリー代替として用いる。
- テスト seam は `checkModelCompleteness`、`updateModelMap`、loader の公開検証結果、実 `model-map.json` の登録契約とする。
- 主な対応は FR-2(sensor 側の宣言 drift 検出)と FR-3(宣言 pin と機械補正)、u4 AC1〜AC4 である。
- テスト戦略は Comprehensive。新規統合テストと既存統合テストの追加ケースで、happy path・双方向 drift・fail-closed・impl-only latch を保護する。

## 実装手順

- [x] Step 1: u1〜u3 の実装済み状態と所有境界を確認する。`tla-module-deps.ts` の配置、model-map の vocabulary、loader の aux 検証を実測し、D-U4-1 の移転要否を確定する。(FR-2 / D-U4-1)
- [x] Step 2: `tests/integration/t405-mirror-declaration-drift.integration.test.ts` を先に追加し、control green、Core 意味論/コメント drift、宣言漏れ/過剰、補正の冪等性、identity 三者一致、循環参照 fail-closed を公開 seam で記述して Red を確認する。(FR-2 / FR-3 / AC1〜AC3)
- [x] Step 3: canonical resolver を core 配下へ移し、`scripts/package.ts` の `GENERATED_PLUGIN_SOURCES` から plugin 側コピーを生成管理する。sensor からは core-local import を使う。(FR-2 / D-U4-1)
- [x] Step 4: model-completeness sensor に aux identity 計測、宣言-vs-解決照合、flagless 宣言補正、optional フィールド保持、aux-aware latch を最小実装し、t405 を Green にする。(FR-2 / FR-3 / AC1〜AC3)
- [x] Step 5: `tests/integration/t380-impl-only-model-map-update.integration.test.ts` に aux 変更拒否、宣言不一致拒否、entries-only 純粋性のケースを追加し、Red→Green を確認する。(FR-3 / BR-IO1〜IO3)
- [x] Step 6: `tests/integration/t-formal-verif-mirror-model-registration.integration.test.ts` に auxiliaries/vocabulary の実 map pin を追加し、`updateModelMap` の補正経路で MirrorLifecycle 宣言を生成して Green にする。(FR-3 / AC3)
- [x] Step 7: sensor 関連の既存 unit/integration/components/e2e テストと loader 登録回帰を実行し、FormalElection・AsImplemented・Vacuity の非接触を確認する。(NFR-1 / NFR-2 / AC4)
- [x] Step 8: `bun scripts/package.ts` で生成物を同期し、`bun scripts/package.ts --check`、対象テスト、`bun run typecheck`、`bun run lint` を実行する。既存のテスト設定を使用するため設定ファイル変更は行わない。(NFR-1〜NFR-4)
- [x] Step 9: `code-summary.md` に変更ファイル、判断、テスト結果、計画との差分、残余リスクを記録し、全チェックボックスを実績と同期する。(AC1〜AC4)

## 対象外

- API、データベース、UI、デプロイ/IaC の変更は本 Unit に存在しない。
- `MirrorLifecycleAsImplemented` と Vacuity 関連ファイルは変更しない。
- `dist/` は手編集せず、packager で生成する。
