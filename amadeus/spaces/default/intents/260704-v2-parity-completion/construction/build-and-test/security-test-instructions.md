# Security Test Instructions

セキュリティテストは実行していない。
取り込んだコードは MIT-0 の公開上流（awslabs/aidlc-workflows、commit fde1e1af）からの無改変コピーで、コピー時にレビューした。
外部サービス依存や秘密情報の追加はなく、hook はローカルの Bun 実行に限られる。
