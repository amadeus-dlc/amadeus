# security-test instructions（260706-adr-vocab）

上流入力: [code-generation-plan.md](../adr-vocab/code-generation/code-generation-plan.md)、[code-summary.md](../adr-vocab/code-generation/code-summary.md)

## 適用判断

不適用とする。専用の security-test 工程は実施しない。

## 根拠

認証情報・外部入力・ネットワーク境界に触れる変更はない。削除した docs/adr と追加した文書はいずれも公開リポジトリ内の設計文書である。
