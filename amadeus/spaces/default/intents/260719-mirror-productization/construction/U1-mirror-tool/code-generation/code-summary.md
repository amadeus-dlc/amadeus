# Code Summary — U1-mirror-tool

## 実装結果

`amadeus-mirror` の正本を `scripts/` から `packages/framework/core/tools/` へ移設し、旧 scripts 版を削除した。既存 `create` / `sync` / `close` の handler とテストシームを維持したまま、読取専用の `status` verb を追加した。

`status` は `gh auth status`、record snapshot、`gh issue view --json body` の順に同期実行し、次を返す。

| 結果 | exit | 内容 |
|---|---:|---|
| clean | 0 | Issue body が現 record の canonical render と一致 |
| diverged | 1 | `mirror-missing`、`stale-status-line`、`issue-drifted` を対象存在範囲で列挙 |
| precondition | 2 | gh 不在・未認証、record 不在、判別不能な view 障害、不正 JSON |

Issue 不在は 404 / not-found を示す gh stderr がある場合だけ `mirror-missing` とし、認証用 exit code 4 やネットワーク障害を誤分類しない。status 経路は `issue view` 以外の Issue command と record write を呼ばない。

## 変更ファイル

### 正本・テスト

- `packages/framework/core/tools/amadeus-mirror.ts` — core 正本、status 型・比較・handler・CLI dispatch・platform 非依存 root 解決
- `scripts/amadeus-mirror.ts` — 削除
- `tests/unit/t232-amadeus-mirror.test.ts` — status outcome、3 findings、複合 finding、exit 0/1/2、POSIX / Windows path semantics
- `tests/integration/t232-amadeus-mirror.integration.test.ts` — 実 FS + fake GhRunner、read-only、precondition 分類、既存3 verb 回帰

### 配布生成物

- `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**/tools/amadeus-mirror.ts`
- `.claude/tools/amadeus-mirror.ts`
- `.codex/tools/amadeus-mirror.ts`
- `.cursor/tools/amadeus-mirror.ts`
- `.opencode/tools/amadeus-mirror.ts`

配布物と自己導入面は core 正本から生成し、手編集していない。

## テスト・検証結果

Integration spot-check: U1-CG-SPOT-001 — `packages/framework/core/tools/amadeus-mirror.ts`

| 検証 | 結果 |
|---|---|
| 移設前 t232 baseline | PASS — 31 tests / 65 assertions |
| 移設後 t232 unit + integration | PASS — 49 tests / 98 assertions |
| t232 lcov | PASS — `SF:packages/framework/core/tools/amadeus-mirror.ts` の実行行 0-hit なし |
| CLI境界 | PASS — `main`注入によるusage/status exit 0/1/2・stdout/stderr契約、および`spawnGh`の実subprocess正常/非zero/実行ファイル不在を検証 |
| typecheck | PASS — `tsc --noEmit` (source + tests) |
| 対象ファイル Biome | PASS — diagnostics 0 |
| repository `lint:check` | PASS(exit 0) — 既存ファイル由来 warning 250 / info 17、U1 対象 warning 0 |
| `bun tests/run-tests.ts --ci` | PASS — 461 files、6,656 assertions、failed 0 |
| `bun run dist:check` | PASS — 6 harness trees in sync |
| `bun run promote:self:check` | PASS — claude / codex / cursor / opencode self-install in sync |
| scripts 版残存 | PASS — `scripts/amadeus-mirror.ts` 削除、`git grep ... scripts` 0件 |

落ちる経路は unknown usage、gh-unready、record 不在、Issue 不在、network error、認証 exit 4、不正 JSON、stale / drifted の fixture で固定した。既存 create / sync / close の baseline ケースはすべて維持した。

## 計画からの差分

- 新しい test runner / test config は不要だったため追加していない。既存 Bun runner、TypeScript、Biome、lcov 設定を再利用した。
- platform 差はホスト依存 E2E を増やさず、`node:path` の POSIX / Windows semantics を同一ホストで注入して core tools から repository root までの深さを検証した。計画Step 8のCLI全面subprocess化は、資格情報に依存しない`main`注入でusage/statusのexit 0/1/2とstdout/stderrを検証し、実process境界は`spawnGh`の正常・非zero・実行ファイル不在ケースで検証する構成へ適応した。
- CI の live AWS / Claude substrate ケースは環境資格情報・CLI availability により既存 runner が SKIP した。派生テストを含む CI 全体の判定は PASS。

## 未解決事項

U1 の未解決事項はない。live AWS / Claude substrate の SKIP は本 Unit の変更によるものではなく、既存 runner の環境判定による。
