# Build & Test Results — packaging-repair-batch

> 実行環境: conductor 本線ツリー(claude-engineer-1 ブランチ、origin/main + fix/701 + fix/702(是正 2f34f31f6 含む)を統合した状態)。すべて実測 exit code。

## 最終実測(2026-07-09)

| 検証 | exit code | 詳細 |
|---|---|---|
| `bun run typecheck` | **0** | tsc --noEmit ×2 構成 |
| `bun run lint` | **0** | Biome、error 0(既存 warning のみ) |
| `bun run dist:check` | **0** | 全ハーネスツリー同期 |
| `bun run promote:self:check` | **0** | セルフインストール同期 |
| `bash tests/run-tests.sh --ci` | **0** | **RESULT: PASS(40 files / 294 assertions / 0 failed)** |

## 回帰テスト(修正前赤・修正後緑の落ちる実証 — 詳細は各 unit の code-summary.md)

| Issue | テスト | 赤(修正前) | 緑(修正後) |
|---|---|---|---|
| #701 | t-package-check-root-orphan | exit 1(--check が OK/exit 0 のまま = 検出漏れ) | exit 0(3 pass) |
| #702 | t-release-sync-atomicity | exit 1(version.ts が先に書き換わる半適用を実証) | exit 0 |
| #702 | t-release-sync-plan | exit 1(seam 不在) | exit 0(9 pass) |

## レビューイテレーション記録

1. PR #712 に codex-3 が NOT-READY(t68 versionAssignments が stable-only — 3面 prerelease シミュレーションで 0/4 fail を独立実測)
2. 是正 2f34f31f6(SEMVER 定数+capture の prerelease 対応、シミュレーション 4 pass / restore 後 4 pass 実測)→ codex-3 再レビュー **READY**
3. PR #711 は codex-2 が初回 READY(独立実測つき)
