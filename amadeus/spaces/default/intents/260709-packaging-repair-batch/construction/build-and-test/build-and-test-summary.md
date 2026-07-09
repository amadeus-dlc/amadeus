# Build and Test Summary — packaging-repair-batch

実行日: 2026-07-09 / 実行環境: mac studio(claude-engineer-1 clone)/ 統合対象: origin/fix/701-package-check-root-orphan + origin/fix/702-release-sync-prerelease-atomic(是正 2f34f31f6 含む)を統合ブランチへマージした状態

## 統合検証結果(実測 exit code)

| ゲート | 結果 |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bash tests/run-tests.sh --ci` | 0(RESULT: PASS、40 files / 294 assertions / fail 0) |

## ユニット別エビデンス(要約)

### u701(PR #711 / Issue #701)
- 赤先行: test-only commit b53a6ac58 で回帰テスト rc=1(ルート直下・未宣言サブディレクトリの2ケース赤)→ fix fc23a7724 後 rc=0(3/3)
- レビュー: アーキレビュー READY(指摘0)、codex-2 READY(独立実測: 回帰テスト 3 pass、4ハーネス --check OK、t145 3 pass、各ゲート exit 0)
- CI: typecheck·lint·drift·tests **pass**(Coverage Report は本レポート時点 pending)

### u702(PR #712 / Issue #702)
- 赤先行: test-only commit cb12717c3 で atomicity テスト rc=1(version.ts 先行書込の半適用を実証)→ fix 1a9913536 後 全緑
- レビューイテレーション1回: codex-3 NOT-READY(t68 versionAssignments が stable-only — prerelease 3面シミュレーションで 0/4 fail を独立実測)→ 是正 2f34f31f6(SEMVER 定数+capture を prerelease 対応、シミュレーション 4 pass / restore 後 4 pass を実測)→ codex-3 **再レビュー READY**
- アーキレビュー READY(指摘0: 4遷移・単一定義消費・置換セマンティクス・no-op パス・コミット順を検証済み)

## 特記事項

- 既存赤(t92 case44、node_modules 無し worktree での tsc 解決 fallback)は両ビルダーが独立検出し #709 起票済み。本統合環境(node_modules あり)では t92 は緑 — 環境依存であることの追加傍証。
- マージ判断待ち: PR #711 / #712 とも squash マージ対象。マージは leader → ユーザー承認の執行手順に従う。
