# Team Practices

## Way of Working

このリポジトリは `main` を中心に、短命ブランチから Pull Request 経由で変更を取り込む GitHub Flow / トランクベース寄りの運用を採用する。インストーラ実装では段階的な workspace 化を選び、`packages/setup/` に `@amadeus-dlc/setup` を追加する一方で、既存の `core/` / `harness/` / `dist/` / `scripts/` の全面移動は別 refactor として扱う。

## Walking Skeleton

この intent は既存フレームワークへのインクリメンタルな npm インストーラ実装だが、配布経路がユーザー体験の入口になるため、最初の Construction Bolt は小さな end-to-end スライスとして扱う。最初に最小の `amadeus-setup` 実行経路を通し、以後の拡張前に人間がゲートで確認する。

## Testing Posture

テストは TypeScript で `tests/` 配下に追加し、Bun ベースの既存ランナーで検証する。インストーラ実装では line coverage しきい値ではなく `covers:` registry と ratchet を品質床にし、CI で registry freshness/ratchet、installer smoke/unit/integration、typecheck、lint、dist/self-install drift guard を blocking gate とする。

## Deployment

デプロイ基盤は持たず、リリースは npm パッケージ配布と GitHub tag/Release を中心に扱う。PR CI は merge gate とし、production release は GitHub Actions の `workflow_dispatch` で人間がボタン実行し、通常は最新 stable tag から release/publish する。

## Code Style

TypeScript/ESM と Bun 直接実行を前提に、既存の `amadeus-` プレフィックス、ハーネス中立の `core/`、ハーネス別の `harness/<name>/` という境界を守る。`amadeus-setup` は人間が terminal で使う入口なので、ユーザー向けには human-readable stderr を基本とし、内部は structured result、非対話の競合は explicit force/backup policy なしでは fail させる。
