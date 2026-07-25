# チームプラクティス

## Way of Working

`main` を中心に短命ブランチと Pull Request で変更を取り込み、正本・6ハーネスの生成物・self-install 面を同じ変更で同期する。Intent record を仕様の正本、GitHub Issue を一方向の共有ビューとし、`auto-mirror: auto` の明示設定は、その Intent に属する mirror の create・sync・安全な close に限る継続同意として扱う。

## Walking Skeleton

本 Intent では、`auto` 設定から Intent Capture 承認後の create、provenance 保存、部分失敗後の重複なし再試行までを最初の end-to-end walking skeleton とする。parser 単体ではなく、最大リスクである外部操作と回復性を先に実証してから sync・close へ広げる。

## Testing Posture

TypeScript のテストは Bun で unit・integration・smoke を日常 CI に載せ、e2e と形式検証は対象リスクに応じて追加する。厳格な全変更 TDD は要求しないが、欠陥と新規ゲートは regression-first／落ちる実証を必須とし、相対 coverage ratchet、patch coverage、complexity、dist・self-install drift を blocking gate として維持する。

## Deployment

アプリケーション配備基盤は持たず、リリースは `.github/workflows/release.yml` の手動 `workflow_dispatch` から release-it、GitHub Release、npm publish を一続きで実行する。version bump・tag・publish は PR や Amadeus workflow から自動実行せず、人間の承認境界を維持する。

## Code Style

TypeScript／ESM、Bun 直接実行、strict `tsc --noEmit`、Biome lint に従い、formatter と import organizer は無効のまま近傍スタイルを保つ。core の純粋な判定・判別 union と I/O handler の境界、harness 中立な正本と harness overlay の分離を維持し、生成物を直接編集しない。
