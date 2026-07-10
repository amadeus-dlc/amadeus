# リバースエンジニアリング実施記録

> このファイルはリポジトリ単位の**共有鮮度ポインタ**(last-writer-wins)であり、直近スキャンのメタデータを反映する。各 intent の差分ベース点は `re-scans/<intent-record>.md` に置かれ、このファイルからは導出しない(#707)。

## 実行メタデータ

- Date: 2026-07-10
- Intent: `260710-codecov-project-gate`
- Scope: `refactor`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-2`
- Stage: `reverse-engineering`(2.1)
- 手法: per-intent re-scan(本 intent の `re-scans/` は初回のため差分ベースなし。base=none / observed=HEAD)
- Base commit: `none`(初回 re-scan、差分ベースなし)
- Observed commit: `98089faf175e1f39460821303d4682d8ab3cee06`
- Focus: #734 選挙 A — 既存 Coverage Report ジョブの lcov から総カバレッジ% を自前算出し、main ベースライン比で fail-closed 判定する project ゲート(Codecov の project status 非依存)。重点ファイル: `.github/workflows/ci.yml`(coverage/codecov-status/ci-success)、`codecov.yml`、`tests/run-tests.ts`(総%算出)、`tests/gen-coverage-registry.ts` + `tests/.coverage-ratchet.json`(ラチェット前例)、`package.json`(coverage:ci)。
- 詳細スキャン記録: `amadeus/spaces/default/intents/260710-codecov-project-gate/inception/reverse-engineering/developer-scan.md`、per-intent ベース点: `re-scans/260710-codecov-project-gate.md`

## 前回スキャンメタデータ(参考・上書き前)

- Date: 2026-07-09
- Intent: `260709-bug-zero-batch`
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-1`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit: `aff3b6671`(`amadeus/spaces/default/codekb/claude-leader/` の観測コミット、前回 intent `260709-framework-repair-batch` のスキャン)
- Observed commit: `a1c79dc12df38a8363524116eff9d877677a7224`
- Focus: 修理対象バグ6件 — #674(`amadeus-swarm.ts` finalize の merge-back/audit 分離)、#675(`amadeus-state.ts` reject の human-presence guard 欠落)、#676(`amadeus-bolt.ts` start + `amadeus-lib.ts` auditFilePath の bare fallback)、#677(`packages/setup/src/ports/http.ts` getJson の json() 未保護)、#678(`packages/setup/src/internal/tar-archive-extractor.ts` の PAX/GNU longname 状態)、#668(`amadeus-utility.ts`/`amadeus-lib.ts` の codekb-path `<repo>` セグメント導出)
- ベースにした codekb: `amadeus/spaces/default/codekb/claude-leader/`(2026-07-09、intent `260709-framework-repair-batch`、対象バグ #656/#657/#641/#661)

## 分析範囲

`git diff --name-status aff3b6671..HEAD` で143ファイルの差分を確認した(19コミット、うち大半は `origin/claude-leader` ブランチのマージ)。主な変更内容は次の通り。

- `modelOverride` → `model` へのエージェント frontmatter 改名(PR #669、114ファイル規模、`.claude`/`.codex`/`dist/*`/`packages/framework/core/agents/` の全複製箇所)。
- `amadeus/spaces/default/codekb/claude-leader/` の新設(前回 intent `260709-framework-repair-batch` のスキャン結果、9ファイル)。
- `amadeus/spaces/default/intents/260709-canonical-settings/`・`260709-framework-repair-batch/` の工程記録追加(ideation/requirements-analysis の memory・questions・requirements)。
- `amadeus/spaces/default/memory/team.md` への §13 学習事項の複数追記(human-presence interim 運用、auto-gate-approval、blocker-election 等の運用ノルム)。

この差分自体は本 intent(bug-zero-batch)が対象とする6バグのコード領域(`amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts`/`amadeus-lib.ts`/`packages/setup/src/ports/http.ts`/`packages/setup/src/internal/tar-archive-extractor.ts`)に変更を加えていない。したがって6バグはこの差分区間の前後を通じて存在し続けている欠陥である。

重点スキャン対象は次の6ファイル/領域(すべて実コードを直接読解して確認)。

- `packages/framework/core/tools/amadeus-swarm.ts` L484-631(`handleFinalize`)— #674
- `packages/framework/core/tools/amadeus-state.ts` L1286-1487(`handleApprove`/`handleReject`)— #675
- `packages/framework/core/tools/amadeus-bolt.ts` L180-239(`start` の `--worktree` パス)+ `amadeus-lib.ts` L1246-1271(`stateFilePath`/`auditFilePath`)— #676
- `packages/setup/src/ports/http.ts` 全体(84行)— #677
- `packages/setup/src/internal/tar-archive-extractor.ts` 全体(228行)— #678
- `packages/framework/core/tools/amadeus-lib.ts` L495-524(`codekbRepoName`)+ `amadeus-utility.ts` L2690-2699(`codekb-path` ハンドラ)— #668

## 鮮度に関する注記

ベースライン `amadeus/spaces/default/codekb/claude-leader/`(2026-07-09、intent `260709-framework-repair-batch`)は #656/#657/#641/#661 という前回バッチの4バグを主眼に書かれており、本 intent が対象とする6バグには一言も触れていない。本スキャンはこの前提を次のように更新した。

- 対象バグ群を完全に入れ替えた(#656/#657/#641/#661 → #674/#675/#676/#677/#678/#668)。前回バッチの4件はこの codekb では扱わない。
- 前回バッチのうち #656(`Installation.detect` が `LegacyLayout` を呼ばない)は、`upgrade.ts:192` で `Installation.detect` の evidence を `LegacyLayout.isUnsupported` に渡す配線が確認でき、解消済みと判断した。#657(`bunx tsc` の無条件使用)は `amadeus-sensor-type-check.ts:157,174` の時点でも変更が確認できず、未修理のまま残存している。#641・#661 は本スキャンの重点対象外のため状態未確認。これらは本 intent のスコープではないため、修理判断は行わず状態のみを記録する。
- `packages/framework/core/`・`packages/setup/` の全体構造(one-core-many-harnesses、functional-domain-modeling-ts スタイル)自体は前回スキャン時点から変更なし。

## 合成方針(Architect 想定)

Developer スキャン結果として、6アーティファクト構造(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment / reverse-engineering-timestamp の9ファイル)を diff-refresh 方式で更新した。前回バッチの4バグに関する記述は新しい6バグの記述に置き換え、全体構造・技術スタック・依存関係グラフのうち変更がない節(one-core-many-harnesses、Bun/TypeScript/Biome スタック、`release.yml` 一本化のバージョン運用)はベース(claude-leader 版)の記述をほぼ温存した。architecture.md に6バグそれぞれの相互作用図(シーケンス図)を新設し、原因コード位置・再現条件・修理時の波及範囲を code-structure.md・code-quality-assessment.md に集中して記述した。

## 更新した成果物

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `reverse-engineering-timestamp.md`

## 統合記録(AC-668-4、2026-07-09)

- **統合**: #668 修正(PR #693)マージ後、分裂していた4ディレクトリ(`amadeus`(2026-07-07 stale)/ `installer-distribution`(2026-07-08)/ `claude-leader`(2026-07-09)/ `claude-engineer-1`(2026-07-09))を本ディレクトリ `codekb/amadeus/` に一本化した
- **正の根拠**: スキャンの系譜は amadeus(7/7)→ installer-distribution(7/8、base 8510281ae)→ claude-leader(7/9、base aff3b6671)→ claude-engineer-1(7/9、base aff3b6671 の leader 版をベースに observed a1c79dc12)という差分リフレッシュの連鎖であり、最新の claude-engineer-1 版が累積 superset。本ディレクトリはその claude-engineer-1 版の git mv
- **包含チェック**: 4ディレクトリとも同一の9ファイル構成でファイル単位の欠落なし(削除分は git 履歴から復元可能)
- **以後**: `codekb-path` は #668 修正により安定名 `amadeus` を返す(このコミットで実測済み)ため、次回スキャンは本ディレクトリへの差分リフレッシュとなる
