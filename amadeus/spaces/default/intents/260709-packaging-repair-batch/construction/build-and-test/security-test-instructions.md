# Security Test Instructions — packaging-repair-batch

## セキュリティ関連の検証(devsecops 視点)

- **#701**: stale ファイルの配布防止はサプライチェーン衛生に寄与(改名・削除された旧配布物が dist に残って出荷される経路を封鎖)。検証 = orphan 検出の負テスト2種
- **#702**: half-applied 状態の排除はリリース整合性の防御(version.ts とバッジの不一致状態が恒久化する経路を封鎖)。検証 = atomicity テスト(書込ゼロの byte 比較)
- 認証情報・シークレット・入力サニタイズ面の変更なし。新規外部入力なし(対象は自リポジトリ内ファイルのみ)
