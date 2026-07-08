# Performance Requirements — publish-readiness

> ステージ: nfr-requirements (3.2) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../functional-design/business-logic-model.md`(pack 契約テスト)・`business-rules.md`(BR-P04)、team.md(CI プロファイル)

## CI 実行時間予算

| 項目 | バジェット | 根拠 |
|------|-----------|------|
| pack 契約テスト(`npm pack --dry-run --json` 実行込み) | ≤ 30秒 | npm CLI 起動+小規模 tarball 列挙。ビルド(bun build)が前提として必要な場合は +10秒 |
| files ドリフトテスト | ≤ 1秒 | JSON 読み比較のみ |

- 検証: 既存 `tests/run-tests.sh` の integration 層に含め、CI 全体時間への影響が上記予算内であることを初回実装時に実測して記録(BR-P04 — 新規 CI ジョブは作らない)
- publish 手順書の人間作業(手動 publish)は性能要件の対象外
