# Security Test Instructions — 260814-plugins-rename-drift

上流入力: `requirements.md` NFR-2、各 Unit の `nfr-design/security-design.md`、`code-summary.md`。

## 実在境界へ trace できる検査(実装・実測済み)

| 検査 | 境界 | 実測 |
|---|---|---|
| 機密キー名パターン拒否(token/password/secret/credential/apikey/api-key) | settings 宣言・override の両面(NFR-2) | fail-closed テスト(落ちる実証 (i) の一部として builder 実測) |
| 未知キー・型不一致・閉語彙外の fail-closed | config parse / 解決 | 同上 |
| 綴り誤り宣言の loud 化 | manifest parse | 落ちる実証 (iii) |
| git 実行の配列 argv(shell 非経由) | git-drift の git 境界 | 実装レビュー + conformance |
| git 状態非破壊(作業ツリー・index・ブランチ不変) | git-drift R1 | テストで status 前後照合 |

## 生成しなかった検査(根拠)

- 認証・認可・暗号化・ネットワーク侵入系: 本 intent にネットワークサービス境界・認証面が存在しない(改名は挙動不変、settings は非機密ローカル値、git-drift は読取+fetch のみ)。承認済み NFR に trace できない検査は生成しない(ノルム同上)。env 宣言(機密系)は ADR-3 で先送り確定済み
