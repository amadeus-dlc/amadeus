# チームプラクティス

## Way of Working

このリポジトリは `main` を中心に、短命ブランチから Pull Request 経由で変更を取り込む。Issue #610 のような設計 intent では、実装を急がず、CodeKB、要求、ADR/設計記録の順に根拠を積み、`packages/setup` のような sibling intent は同一 intent に吸収しない。

## Walking Skeleton

この intent は既存フレームワークへの設計・整理作業であり、新しい runtime skeleton を立ち上げる作業ではない。移行を実装する判断になった場合だけ、最初の Construction Bolt は小さな end-to-end の path abstraction または layout compatibility check として gate 付きで扱う。

## Testing Posture

layout に関わる変更では、`dist:check` と `promote:self:check` を第一級の品質ゲートとして扱う。実装が入る場合は `bun run typecheck`、`bun run lint`、関連する `tests/run-tests.sh` profile、packaging/self-promotion fixtures を同じ変更単位で確認する。

## Deployment

このリポジトリの release readiness は GitHub Actions の typecheck、lint、dist/self-install drift guard、smoke/unit/integration tests で判断する。今回の intent は npm package や runtime deploy を直接行わず、layout decision が release/drift guard を壊さないことを設計成果物で先に固定する。

## Code Style

TypeScript/ESM と Bun 直接実行を前提に、既存の root `core/`、`harness/<name>/`、`scripts/`、`dist/` の意味を尊重する。Markdown artifact は日本語で書き、コード識別子、CLI、path、machine-readable heading は正確性を優先して原文のまま残す。
