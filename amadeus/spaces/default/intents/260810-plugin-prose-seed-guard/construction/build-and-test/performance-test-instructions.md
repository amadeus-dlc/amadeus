# Performance Test Instructions

## 判定

- `code-generation-plan.md` と `code-summary.md` に性能 NFR はない
- 変更は静的 mapping、Markdown prose、テストガードに限定され、実行時 hot path や常駐サービスを追加しない

## 実行

- 専用 load / benchmark テストは対象外
- 既存 `bun run test:ci` の実行時間・timeout 契約を回帰指標として用いる

## 成功条件

- 新規 integration は明示 timeout 内で完了
- 既存 CI 全体に新しい timeout failure がない
