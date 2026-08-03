# Build & Test Summary — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): code-generation-plan.md(全6 unit — 各 Bolt の実装方針・TDD・検証計画。本書のテスト選定はこの計画の検証計画節から導出)、code-summary.md(全6 unit — 着地 PR・実装内容・テスト・実測ゲート・逸脱裁定。本書の verdict はこの実績の統合判定)

## 何を検証したか

intent の目的は「記録系の write⇔read 非対称を実装前に潰せる状態にする」ことであり、検証もその2面で構成した。

1. **出荷面(利用者)**: 破損した election 台帳が読取時に fail-closed で棄却されること。この検証は dist 7ハーネスに乗り、ユーザー環境でも効く
2. **開発面(保守チーム)**: 非対称バグが PBT で実装前に検出され、バリデータ非経由の新経路が CI で機械的にブロックされること

## テスト戦略の実施

Test Strategy = Comprehensive。ただし**承認済み NFR と実在境界へ trace できる範囲だけを生成**した(cid:build-and-test:bt-proportional-selection)。

| 種別 | 生成 | 根拠 |
|---|---|---|
| unit | 5ファイル(PBT 4 + ガード純関数層1) | FR-2 / FR-4 / FR-3 |
| integration | 3ファイル(実 FS PBT・CLI 面・ci.yml ピン) | FR-1 / FR-3、cid:code-generation:fs-tests-integration-first |
| performance | NFR-4 の実行時間基準のみ | 常駐サービスが存在せず SLI がない |
| security | 入力検証コントロールの退行検出のみ | 認証・暗号・秘密管理の境界が変更面にない |

負荷試験・auto-scaling・DAST は対象境界が存在しないため生成しなかった(戦略名だけを根拠に機械追加しない)。

## 結果

`bun run coverage:ci` で **764 files / 10,323 assertions / 0 failed / RESULT: PASS**。ブロッキングゲート12種すべて exit 0(詳細は build-test-results.md)。

NFR-4: PR CI 階層 171ms(基準 2秒)、深掘り階層 9.04s / 600,283 assertions。

## verdict

**READY**(無条件)。

条件付きにしなかった理由: 未検証面として残るのは (a) `pbt-deep` ジョブの実 CI 初回 run(非ブロッキング面で、`timeout-minutes` の K 係数を初回 run から再導出する旨をコメントに明記済み)と (b) #2112 の潜在債務(安全側・現行コーパス該当なし・起票済み)の2点のみで、いずれも**本 intent の受け入れ基準(FR-1〜7 / NFR-1〜5)の外**にある。受け入れ基準はすべて着地面の実測で充足した。

## 既存テストの扱い

変更前ベースラインからの退行はゼロ。Bolt 1 で t259 の fixture が新しい fail-closed 読取と衝突したが、これは**要件どおりの棄却**であり fixture 側が非適合定義(`choices: []`)を持っていたため、選挙 E-RRP-CG1(2-0)の承認を得て fixture を妥当化した(仕様変更ではない)。
