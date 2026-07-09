# Build & Test Results — bug-zero-batch

> 実行環境: conductor 本線ツリー(claude-engineer-1 ブランチ、6 PR マージ済みの origin/main + 工程記録を統合した状態)。すべて実測 exit code。

## 最終実測(2026-07-09、全 PR マージ+t199 是正後)

| 検証 | exit code | 詳細 |
|---|---|---|
| `bun run typecheck` | **0** | tsc --noEmit ×2 構成 |
| `bun run lint` | **0** | Biome、error 0(既存 warning のみ) |
| `bun run dist:check` | **0** | 全ハーネスツリー同期 |
| `bun run promote:self:check` | **0** | セルフインストール同期 |
| `bash tests/run-tests.sh --ci` | **0** | **262 files / 3896 assertions / 0 failed / RESULT: PASS** |

## 経過記録(是正イテレーション)

1. 初回実行: `--ci` で t199-generated-prefix-contract が1 assertion 失敗(2回再現、決定的)。原因は6 Bolt と無関係 — 別 intent(framework-repair-batch)の requirements.md 内の上流リポジトリ名言及がリブランド・プレフィックス契約に抵触(origin/main には該当ファイルがなく green、ブランチ統合でのみ顕在化)
2. 所有者(leader)へ選択肢付きでエスカレーション → leader が A 案(1行リフレーズ、意味不変)で修正・t199 PASS 実測・push
3. 修正 merge 後に全バッテリー再実行 → 上表の全緑

## 回帰テスト(各バグ、修正前赤・修正後緑の落ちる実証済み — 詳細は各 unit の code-summary.md)

| Issue | テスト | 赤(修正前) | 緑(修正後) |
|---|---|---|---|
| #674 | t134 case 14 | exit 1(converged 誤報告) | exit 0 |
| #675 | t188 fabricated reject | exit 1(rc=0 で通過) | exit 0(14 pass) |
| #676 | t33 negative | exit 1 | exit 0(26 pass) |
| #677 | setup-http | exit 1(SyntaxError throw) | exit 0 |
| #678 | setup-fetcher PAX/GNU | exit 1(malformed tar header) | exit 0(13 pass) |
| #668 | t182 remote slug | 3 fail | exit 0(14 pass) |
