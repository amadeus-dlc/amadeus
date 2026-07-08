# CD Config — installer-distribution

> ステージ: deployment-pipeline (4.1) / 作成: 2026-07-09
> 出典: `../../construction/ci-pipeline/ci-pipeline.md`(品質ゲート5点=ci-config/quality-gates 相当)、infrastructure-design 全ユニット(deployment-architecture: 所有インフラゼロ)・cicd-pipeline.md、docs/guide/publishing-setup.md

## CD の構成(自動 CD なし — 手動リリースパイプライン)

CD ツールの設定ファイルは**存在しない**(意図した設計 — CON-004)。リリースの直列パイプライン:

1. **PR マージ**(品質ゲート5点は CI が強制 — ci-pipeline.md)
2. **`vX.Y.Z` タグ発行**(手動、CHANGELOG 見出しと一致 — team.md。タグが resolver の配布物取得先: ADR-003)
3. **publish 前検証**: 手順書章3〜4(ビルド → 検証一式 → `AMADEUS_SETUP_E2E_NETWORK=1` 実ネットワーク E2E → `npm pack --dry-run` 目視 → tarball ローカル導入)
4. **`npm publish`**(手動・2FA。安定版 `--access public` / プレリリース `--tag next`)
5. **公開後検証**: `npx @amadeus-dlc/setup@<version> --help`+npm ページのメタデータ確認(手順書章6)

## 将来の拡張余地(スコープ外の記録)

CI publish+provenance への移行は SEC-P03 注記(手順書章5)が再検討ポイントを明示。移行時は 2FA automation token と provenance 設定を要再設計
