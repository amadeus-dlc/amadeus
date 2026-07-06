# Build & Test Summary — Amadeus Grilling 統合

**Stage**: build-and-test (3.6) / **Date**: 2026-07-07
**Upstream**: `../grilling/code-generation/code-generation-plan.md` と `code-summary.md` の変更セットを検証した。

## サマリ

- **ビルド**: dist 再生成・4ハーネスパリティ(--check)・typecheck すべてグリーン
- **テスト**: 新設 t199(FR 合否基準の機械検証)パス、t68 パス、フルスイート 230 ファイルで新規リグレッションゼロ(失敗8は main 既知ベースラインと完全一致)
- **セキュリティ**: シークレットなし・監査バイパスなし・read-only 分類を機械検証・MIT ライセンス帰属確認(security-test-instructions.md)
- **性能**: 実行時コンポーネント追加なしのため該当なし(performance-test-instructions.md)
- **既知の残課題**: promote:self:check が合成スコープのランタイムファイルを drift 誤認(フレームワーク既存ギャップ — build-test-results.md に根本原因と推奨対応を記録。ゲート判断事項)

## 受け入れ基準との対応

- AC-6.1(4 dist 配布)/ AC-6.2(--check パス)/ AC-6.3(docs+帰属)→ t199 + 手動確認で充足
- NFR-3(既存互換)→ フルスイートのベースライン同一で充足
- NFR-5(ハッピーパス+2エッジ)→ t199 の配布/分類/帰属エッジで代替(決定的検証可能な範囲。LLM 実行時挙動はドッグフーディング確認へ — integration-test-instructions.md)
