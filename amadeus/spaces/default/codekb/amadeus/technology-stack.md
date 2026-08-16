# 技術スタック

## Runtime and Language

| 技術 | バージョン/契約 | 用途 |
|---|---|---|
| Bun | `bun-types ^1.3.13` | runtime、package manager、test runner、script execution |
| TypeScript | `^6.0.3` | core/plugin/harness/test 実装 |
| ESM | `package.json` の `type: module` | module system |
| Node-compatible stdlib | Bun 提供 | filesystem、path、child process、crypto |

## Development Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| `@anthropic-ai/claude-agent-sdk` | `0.3.158` | Claude agent integration |
| `@ast-grep/napi` | `0.45.0` | structural source analysis |
| `@biomejs/biome` | `2.5.5` | lint、formatter disabled |
| `@opentelemetry/api` | `1.9.1` | telemetry API |
| `@opentelemetry/api-logs` | `0.221.0` | logs API |
| `@opentelemetry/context-async-hooks` | `2.10.0` | async context |
| `fast-check` | `^4.9.0` | property-based tests |
| `release-it` | `^20.2.1` | release automation |

## Tooling

- Type check: `tsc --noEmit`（root と tests の2 config）。
- Lint: Biome check、formatter は無効。
- Test: Bun test を包む `tests/run-tests.ts`、smoke/unit/integration/e2e の階層。
- Build: `scripts/package.ts` で harness distribution を生成し、`scripts/promote-self.ts` で self-install surface を更新。
- SCM boundary: GitHub CLI `gh`。直接 SDK や HTTP client は使わない。
- Persistence: Markdown/JSON/JSONL の local filesystem。database と long-running service はない。

## Issue #2838 Constraints

- attestation に Node/Bun の `node:crypto` を利用できるが、secret-based signature を採る場合は key lifecycle が新たな外部運用依存になる。
- 現行 audit は filesystem record であり、digest と event identity を結ぶ決定的 receipt は既存 stack 内で実装可能である。
- plugin は core module を直接 import しないため、汎用 receipt schema または process boundary contract が必要である。
- generated `dist/` と self-install surface は編集元ではなく、source 修正後の build で同期する。
## 差分リフレッシュ時点のスタック（260813-advisory-requestion-fix、履歴、observed `c0f9edf27`）

**観測 ref**: base `854692fd7a11b124236b0427fe3d59e2fe6bf785` → observed `c0f9edf27828def6fa3dbbbc4101d753b398e025`。

- ランタイム・言語・lint・テストの構成に変化はない（`package.json` / `bun.lock` は本区間で無変更 — `git diff --name-only 854692fd7..c0f9edf27 -- package.json bun.lock` が空出力）。
- 開発用ツールチェーンのピンのみ更新: `mise.toml` に `@openai/codex 0.146.0` / `takt 0.58.0`。
- ハーネス配布面の総数は 8（`ls -d packages/framework/harness/*/ | wc -l`）。[Issue #2967](https://github.com/amadeus-dlc/amadeus/issues/2967) の修正は engine 型と 8 ハーネスの skill 散文の同時更新（+ `bun run build` によるセルフインストール面の再生成）を要する。
- 有効プラグインは 3（`coverage-patch-quick` / `formal-model-check` / `pr-convergence`、`amadeus/config.json` の `plugin.activation.names`）。
## Issue #2813 技術制約（履歴、observed `c0f9edf2782`）

多問対応に新しい runtime dependency は不要である。現行の Bun `1.3.13` 系、TypeScript `^6.0.3` strict ESM、filesystem JSON/Markdown、fast-check `^4.9.0`、TLA+/TLC の範囲で実装・検証できる。

- 永続化: database ではなく `election.json` / `ledger.json` / `pending/` / `tally.json` / `record.md`。atomicity は tmp + rename を継続する。
- 型/validation: class-free の discriminated union と `Result`、parse-don't-validate。旧/new schema は decoder で new canonical type へ正規化する。
- Property testing: `tests/helpers/arbitraries/election.ts` と fast-check。question ID 一意性、legacy/new round-trip、mixed result、不変な established result を生成対象へ加える。
- Formal verification: `FormalElection.tla` / `.cfg` と `model-map.json`。5実装面の SHA identity 更新が必要で、spec だけまたは実装だけの変更は model-map drift になる。
- Distribution: `packages/framework/core/` を正本とし、各 harness 配布面は `bun run build` で生成する。`dist/` と self-install tree は直接編集しない。

Biome `2.5.5` は formatter 無効、cognitive complexity 15超を warning とする。model 550行、store 719行、CLI 853行、migration 580行であり、多問化を理由に新ロジックをCLIへ集中させないことが保守性上の制約である。

## Issue #2985 技術制約（履歴、observed `0fbbec42bb33d625bdb9d034789c0ff391df1287`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

- Runtime / language は Bun `1.3.13` と TypeScript ESM。focused test 実測も Bun `1.3.13` で行われた。
- 永続化は Markdown artifact、JSON runtime graph、append-only audit shard、Git/GitHub PR で構成され、長時間稼働 service や database はない。
- PR convergence は `git` と `gh` を外部 process boundary とし、CLI 自身は commit / push を行わない。
- report integrity は SHA-256 digest と canonical audit receipt に依存する。署名付き trust boundary ではなく、repository write 権限を持つ攻撃者への防御は既存 threat model の対象外である。
- #2985 は技術バージョン不足ではなく TypeScript data contract と Markdown／audit evidence ownership の cardinality 不一致である。新規 framework、database、queue の必要性は観測されていない。

## 260814-open-bug-batch-6 の技術制約（履歴、observed `a49f9e9fd`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

- ランタイム・依存に変更なし。`git diff 1d08374cd..a49f9e9fd -- package.json` は**空**（外部依存の増減ゼロ）
- プラグイン機構に `plugin.settings` が加わった（PR #3052、`packages/framework/core/tools/amadeus-plugin-settings.ts` 新設 +274 行）。宣言・階層化オーバーライド・fail-closed 解決を提供し、`git-drift` の `fetch-throttle-seconds`（既定 600）が最初の利用者
- センサー機構の構成（実測、`ls` 出力の転記）: core 正本 **11** 件（`packages/framework/core/sensors/`）、プラグイン供給 **3** 件（`formal-model-check` / `git-drift` / `github-pr-convergence` 各 1）、投影 `.claude/sensors/` は **13** 件。実在 14 に対し投影 13 の差分 1 件が `amadeus-model-completeness.md`（#3026）
- 選挙系は v2 へ移行（PR #3036）。`amadeus-election-codec.ts` / `amadeus-election-question-tally.ts` / `amadeus-election-transport.ts` が新設され、`scripts/amadeus-election-migrate.ts` は削除。本 intent の Focus 5 件はいずれもこの面に非接触
- 構成規模（observed 断面、`ls | wc -l` の転記）: `packages/framework/core/tools/*.ts` = **136**、`plugins/*/tools/*.ts` = **49**、テストファイル（unit + integration + e2e + smoke）= **1110**

## 差分リフレッシュ時点のスタック（260814-priority-bug-batch、履歴、observed `d64fd7cac`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780` → observed `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7`。

- ランタイム・言語・lint・テストの構成に変化はない（`git diff --name-only 1d08374cd..HEAD -- package.json bun.lock` が空出力）。Bun は `1.3.13`（`bun --version`）。
- ハーネス配布面の総数は 8（`ls -d packages/framework/harness/*/ | wc -l`）で不変。
- **有効プラグインは 4**: `coverage-patch-quick` / `formal-model-check` / `git-drift` / `github-pr-convergence`。取得コマンドは 2 系統で一致する — `ls plugins/` が返す 4 ディレクトリと、`amadeus/config.json` の `plugin.activation.names` の 4 要素。前区間の記述（3 プラグイン、うち `pr-convergence`）からの差分は、`git-drift` の新設（PR #3055）と `pr-convergence` → `github-pr-convergence` の rename（PR #3051、13 ファイルの `R080`〜`R100` 移動でツール名とディレクトリ内構造は不変）である。
- **プラグイン設定の宣言型機構が加わった**（PR #3052）。`plugin.json` の `settings` が型付き宣言（`string` / `number` / `boolean` / `enum` と default）を持ち、`amadeus/config.json` の `plugin.settings` が 3 レイヤ（project → space → intent）で override する。突き合わせは `packages/framework/core/tools/amadeus-plugin-settings.ts:240` の `resolvePluginSettings` 1 点に閉じ、未宣言キー / 型不一致 / enum 範囲外は default へ落とさず拒否する。実装は 274 行（`wc -l`）で、新規 runtime dependency は不要。
- **選挙 CLI が多問(multi-question)化した**（PR #3036）。モジュール構成の実測行数（`wc -l packages/framework/core/tools/amadeus-election*.ts`）: `amadeus-election-codec.ts` 908（新規）/ `amadeus-election-store.ts` 1232 / `amadeus-election.ts` 804 / `amadeus-election-record.ts` 651 / `amadeus-election-question-tally.ts` 386（新規）/ `amadeus-election-transport.ts` 301 / `amadeus-election-model.ts` 32。前区間の「model 550行、store 719行、CLI 853行、migration 580行」は失効している — `amadeus-election-model.ts` は `Result` / `VoterKind` / `HoldReason` だけを持つ 32 行の共有語彙へ縮小し、データモデルは codec（schemaVersion 2）へ、集計は question-tally へ移った。`scripts/amadeus-election-migrate.ts` は削除済み。
- Biome `2.5.5`（formatter 無効、cognitive complexity 15 超を warning）と `tsc --noEmit` の検査構成は不変。

## 区間の技術スタック（260815-per-unit-outcome、履歴、observed `78146f435a`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-stale-epoch-landed の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**本差分での変化なし。** base `9ba8170bb` → observed `78146f435a` で依存宣言は 1 バイトも動いていない — `git diff --stat 9ba8170bb 78146f435 -- package.json bun.lock '**/package.json'` の**出力は空**（exit 0）。ランタイム（Bun / TypeScript / ESM）、リンター（Biome、フォーマッタ無効）、型検査（`tsc --noEmit`）、テストランナー（`tests/run-tests.sh` の 4 層）の構成はいずれも不変。

本 intent の患部（per-unit consume の母集団取得と unit pool 監査イベント）は既存スタック内に閉じており、新しいランタイム依存・新しい検証系を必要としない。

## 区間の技術スタック（260815-stale-epoch-landed、履歴、observed `83e1dbeef`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-open-bug-batch-7 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**本差分での変化なし。** base `78146f435a` → observed `83e1dbeef` で依存宣言は 1 バイトも動いていない — `git diff --stat 78146f435a 83e1dbeef -- package.json bun.lock '**/package.json'` の**出力は空**。ランタイム（Bun / TypeScript / ESM）、リンター（Biome、フォーマッタ無効）、型検査（`tsc --noEmit`）、テストランナー（`tests/run-tests.sh` の 4 層）の構成はいずれも不変。

本 intent の患部（`plugins/github-pr-convergence/` の CLI・sensor・stage 文書）は既存スタック内に閉じており、外部依存として使うのは `gh` CLI のみ（optional dependency として既存の扱いのまま）。新しいランタイム依存・新しい検証系を必要としない。

## 区間の技術スタック（260816-open-bug-batch-7、現在、observed `5c5911ee3`）

**外部依存の変化なし。** base `83e1dbeef` → observed `5c5911ee3` で `git diff --stat 83e1dbee..HEAD -- package.json bun.lock '**/package.json'` の**出力は空**（本節の実測）。区間で core が +2342 行、新規 core tool が 5 本増えたが、いずれも既存スタック（Bun / TypeScript / ESM、Biome、`tsc --noEmit`、`tests/run-tests.sh` の 4 層）の内側に閉じている。新規 tool の import も `node:crypto` / `node:fs` / `node:path` と自リポジトリ内モジュールのみである。

本 intent の 3 領域が触れるスタック面は次のとおりで、**新しいランタイム依存・新しい検証系はいずれも不要**である。

| 領域 | 触れるスタック面 |
|---|---|
| #2363（pi 配布） | `scripts/` のパッケージャ・self-install 投影（Bun 直接実行）、`.gitignore` / `.gitattributes` の生成、`packages/framework/harness/pi/` の manifest / driver。**新規ハーネス追加ではなく既存 pi の配布面の追加**なので、ハーネス実装スタックは不変 |
| #2162（no-silent-drop） | `tests/no-silent-drop/` の TypeScript 実装と、`git cat-file` / `git show` / `git merge-base` を介した git 到達性判定。CI からは `bun run no-silent-drop` として起動（`.github/workflows/ci.yml:164`） |
| #3097（センサー docs） | Markdown の docs 面と、`tests/integration/` の bun test。導出は `readdirSync` + `plugins/*/plugin.json` の JSON 読取のみ |

`.github/` は区間内で 0 件変更（`git diff --name-only 83e1dbee..HEAD -- .github/` が空出力・exit 0）であり、CI の構成そのものも本区間で動いていない。
