# security-test instructions（260706-runtime-graph-registrati）

上流入力: [code-summary.md](../runtime-graph-registration/code-generation/code-summary.md)

## 適用判断

認証情報・外部入力境界に触れる変更はない。hook の command filter は発火判定のみで command を実行せず、自己修復の spawn は import.meta.url からの sibling 解決（外部入力を path に使わない）。専用の security-test 工程は不適用と判断する。
