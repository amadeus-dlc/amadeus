# Security Test Instructions — dynamic-test-size(#699)

> Minimal 戦略+セキュリティ NFR なし。専用 SAST/DAST は作成しない。devsecops 観点の確認点のみ記す。

## 確認点

- 新規コードは認証情報・シークレットを扱わない(テスト計測メタデータのみ)✓
- レポート書き出し先は repo 内 gitignored パス(`tests/logs/`)固定で、外部入力によるパス操作なし ✓
- CI artifact は公開リポジトリの Actions artifact(コード名・実行時間のみで機微情報なし)✓
- 外部ネットワーク送信なし(Codecov 等への新規送信は追加していない)✓
