# security-test instructions（260706-doctor-guidance）

上流入力: [code-summary.md](../doctor-guidance/code-generation/code-summary.md)

## 適用判断

認証情報・外部入力境界に触れる変更はない。doctor の fix 文言と installer の info 行は固定文字列で、外部入力を埋め込まない。専用の security-test 工程は不適用と判断する。
