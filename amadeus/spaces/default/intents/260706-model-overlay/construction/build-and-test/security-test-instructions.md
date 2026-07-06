# security-test instructions（260706-model-overlay）

上流入力: [code-generation-plan.md](../model-overlay/code-generation/code-generation-plan.md)、[code-summary.md](../model-overlay/code-generation/code-summary.md)

## 適用判断

不適用とする。専用の security-test 工程は実施しない。

## 根拠

認証情報・外部入力・ネットワーク境界に触れる変更はない。overlay 設定は repo 内の開発用 JSON（配布対象外 = FR-1.3、installer 許可リスト方式で構造的に除外を実測確認済み）であり、読み取りは doctor 側で fail-open + 1 行警告（BR-7）として無害化されている。
