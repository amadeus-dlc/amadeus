# Unit of Work × Story Map — `@amadeus-dlc/setup`(installer-distribution)

> ステージ: units-generation (2.7) / 作成: 2026-07-08
> 出典: `unit-of-work.md`、`../user-stories/stories.md`、`../requirements-analysis/requirements.md`

## 写像表(19ストーリー → 5 Unit)

| Unit | ストーリー | FR |
|------|-----------|-----|
| U1 setup-foundation | US-B5(取得規約)、US-A7(ネットワーク失敗 — fetcher 基盤) | FR-006, FR-012, FR-016(スキーマ), FR-002(ビルド) |
| U2 install-flow | US-A1(ワンライナー)、US-A2(ウィザード)、US-A3(ヘルプ固定)、US-A4(導入済み保護)、US-A5(CI 導入)、US-A6(検証と案内)、US-A7(エラー表示面) | CLI Contract, FR-003/004/010/011/013, FR-016(書き込み) |
| U3 upgrade-flow | US-B1(検出)、US-B2(差分レポート)、US-B3(カスタマイズ保持)、US-B4(バージョン境界) | FR-005/007/008/009 |
| U4 publish-readiness | US-C1(メタデータ)、US-C2(pack 検証)、US-C3(手順書とバージョン運用) | FR-001/015/017/018 |
| U5 docs-rollout | US-C4(README 刷新) | FR-014 |
| 後続(Unit 外・Should/Could) | US-S1(エラー分類拡張)、US-S2(タグ固定の推奨記述)、US-S3(導入後ガイド拡張) | — |

## カバレッジ検証

- Must ストーリー16本: すべて U1〜U5 のいずれかに一意に割当(重複なし・漏れなし)
- US-A7 のみ U1(fetcher のリトライ/分類基盤)と U2(cli でのエラー表示)に跨がる — 統合契約は `FetchError` 型(component-methods.md)
- FR-001〜018: 全件がいずれかの Unit に帰属(トレーサビリティマトリクスの Unit Ref は delivery-planning 後に確定値を記入)
- NFR: NFR-001(1分)= U2 の E2E、NFR-002(安全性)= U3、NFR-005(依存ゼロ)= U1/U4、NFR-006(CI 互換)= U1
