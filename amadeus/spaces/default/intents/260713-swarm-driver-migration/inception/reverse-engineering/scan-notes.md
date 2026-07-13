# Developer Code Scan Results

## スキャン・メタデータ

| 項目 | 値 |
|---|---|
| 対象プロジェクト | `amadeus` |
| プロジェクト種別 | Brownfield |
| スキャン方式 | 既存 CodeKB に対する差分更新（diff-refresh） |
| 基点コミット | `13598b752b656cc9bbf5d931f8e3a6c34881fd1c` |
| 観測コミット | `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5` |
| 観測日時 | 2026-07-13T07:57:31Z |
| 基点からの距離 | 49 commits |
| 全体差分 | 398 files changed, 26,093 insertions, 637 deletions |

基点は、既存 `re-scans/*.md` に記録された Observed commit を Git 到達可能性で検査し、観測コミットの祖先である候補のうち距離が最短のものを選んだ。`c11554226542faabd2a6c694650ea26323745ed8` は一見新しい記録だが、`git merge-base --is-ancestor` が非祖先を返し、観測コミットとの merge-base は `83e408f26e5113ce209768fae54cd31616bb3e3b` だったため候補から除外した。

焦点差分では `amadeus-swarm.ts`、`amadeus-directive.ts`、code-generation stage 定義、swarm referee の主要テストに変更はない。`amadeus-orchestrate.ts` の差分は Issue #878 のエラー監査配線であり、swarm 選択契約を変更していない。Codex の skill、onboarding、emit、ガイド、`promote-self.ts` には変更があるが、内容は監査可能な prose gate とルール取り込みであり、新 driver selector の実装ではない。

## 現行アーキテクチャ

現行の swarm は、次の4境界に分離されている。

1. engine が eligible batch を判定し、最小の `invoke-swarm` directive を返す。
2. 各 harness の orchestrator skill prose が driver 選択、worker fan-out、retry を担う。
3. `amadeus-swarm.ts` が worktree 準備、収束判定、改竄検査、直列 merge、監査を担う。
4. packager が共通 core と harness 固有面を各 `dist/<harness>` へ投影する。

### Engine と directive

- autonomy は state の `Construction Autonomy Mode` が厳密に `autonomous` の場合だけ成立する（`packages/framework/core/tools/amadeus-orchestrate.ts:706-721`）。
- engine は runtime graph の `bolt_dag.batches` を読み、欠落・不正 JSON は安全側の「swarm なし」に倒す（同 `:724-742`）。
- 対象は Construction の `for_each: unit-of-work` かつ `mode: subagent` の stage に限定され、現行 graph では code-generation だけである（同 `:1744-1752`、`packages/framework/core/amadeus-common/stages/construction/code-generation.md:1-12`）。
- walking-skeleton gate は構造的に除外される。autonomy、DAG、未完了 Unit のすべてが成立すると、最初の未完了 batch を返す（`amadeus-orchestrate.ts:1754-1811`）。単一 repo のみ `repo` を付加し、0件または複数件では省略する（同 `:1812-1830`）。
- directive schema は `{ kind: "invoke-swarm", units: string[], repo?: string }` のみで、requested driver、selected driver、harness、topology、capability evidence を持たない（`packages/framework/core/tools/amadeus-directive.ts:142-163,280-292`）。
- 通常の per-Unit approval guard は autonomous swarm を除外し、batch ごとの referee verdict に委ねる（`amadeus-orchestrate.ts:2780-2796`）。

したがって、engine は「swarm を許可するか」と「どの Unit を実行するか」までは決定するが、「どの native driver を使うか」は決定していない。

### Referee

`packages/framework/core/tools/amadeus-swarm.ts` は AI worker dispatcher ではなく、3つの stateless CLI を提供する。

| CLI | 現行責務 | 証拠 |
|---|---|---|
| `prepare` | Unit ごとの worktree と Bolt state を作り、`SWARM_STARTED`、必要なら `SWARM_DEGRADED` を出す | `amadeus-swarm.ts:15-29,363-472` |
| `check` | check command と protected file の改竄検査から単一 Unit の advisory verdict を返す | 同 `:30-37,477-518` |
| `finalize` | claimed Unit を再検証し、成功分のみ直列 merge、失敗 envelope と監査を返す | 同 `:38-50,554-722` |

内部で起動する別プロセスは Bun の sibling tools、Git、convergence check shell であり、`claude`、`codex`、`kiro-cli` の AI worker は起動しない（同 `:72,122-172`）。AI fan-out は live conductor 側に残る。

現行 driver 型は `subagent | ultracode` の2値で、`--degraded-from` の記録専用である（同 `:15-29,82-96`）。fallback は常に `subagent` と記録される（同 `:257-345`）。新しい5値公開契約を表現できない。

## 現行 harness 別の実行経路

製品ソース、配布ソース、docs を検索した結果、今回の intent 文書を除いて `AMADEUS_SWARM_DRIVER` の実装ヒットは0件だった。現行の選択表は次のとおりである。

| Harness | 現行 fan-out | 別 AI CLI プロセスか | 現行 selector |
|---|---|---:|---|
| Claude Code | 既定は live session から N 個の並列 `Task`、`AMADEUS_USE_SWARM=1` は inline Dynamic `Workflow` | いいえ。`claude -p` は使用しない | `AMADEUS_USE_SWARM` の真偽のみ（`packages/framework/harness/claude/skills/amadeus/SKILL.md:61`） |
| Codex | Unit ごとに headless `codex exec --skip-git-repo-check -C <worktree> ... < /dev/null` | はい | driver 選択なし。旧変数が1なら exec floor へ loud-degrade（`packages/framework/harness/codex/skills/amadeus/SKILL.md:57,162`） |
| Kiro CLI | live session の `subagent` tool で一括 fan-out | いいえ。`kiro-cli chat --no-interactive` は使用しない | driver 選択なし。旧変数は no-op + loud-degrade（`packages/framework/harness/kiro/skills/amadeus/SKILL.md:57`） |
| Kiro IDE | live session の `subagent` tool で一括 fan-out | いいえ | Kiro CLI と同じ（`packages/framework/harness/kiro-ide/skills/amadeus/SKILL.md:57`） |

このため、「Code Generation は全 harness で `claude -p` / `codex exec` の別プロセス実装」という理解は正しくない。現状で AI worker が明示的な別 CLI プロセスなのは Codex floor のみである。

## Onboarding と設定面

- Codex onboarding は最小 CLI version、Bun、provider、MCP、locking、hook、permission を説明し、subagent stage を `codex exec workers` としているが、Ultra model／reasoning effort／native multi-agent capability／driver selector の設定を持たない（`packages/framework/harness/codex/onboarding.fills.ts:34-57`）。
- Codex emit は `config.toml.example` に model/provider を固定せず、`AMADEUS_RULES_DIR` だけを環境 seam として生成する。swarm driver は生成しない（`packages/framework/harness/codex/emit.ts:56-99`）。
- Claude onboarding は model default と個人設定には触れるが、Agent Teams の experimental environment、Ultra Code、driver selector の設定を持たない（`packages/framework/harness/claude/onboarding.fills.ts:25-30`）。
- Kiro CLI／IDE onboarding は CLI activation と native subagent の違いを説明するが、driver selector はない（`packages/framework/harness/kiro/onboarding.fills.ts:15-37`、`packages/framework/harness/kiro-ide/onboarding.fills.ts:28-37`）。

よって、明示 driver の availability 判定や `auto` 選択に必要な capability probe はまだ製品コードに存在しない。

## 監査契約

swarm taxonomy は `SWARM_STARTED`、`SWARM_UNIT_CONVERGED`、`SWARM_UNIT_FAILED`、`SWARM_BATON_RETURNED`、`SWARM_COMPLETED`、`SWARM_DEGRADED` の6イベントである（`packages/framework/core/knowledge/amadeus-shared/audit-format.md:181-193`）。

- driver 情報を持つのは `SWARM_DEGRADED` の Requested/Fallback driver だけである。
- `SWARM_STARTED` は batch、Unit names、concurrency cap、`SWARM_COMPLETED` は成功／失敗件数だけである。
- requested/selected driver、選択理由、capability probe、native execution evidence、correlation ID は記録されない。
- event emitter は referee に一元化され、conductor と engine は swarm audit を直接出さない（同 `:183`）。

新 selector の「explicit unavailable は hard error」「auto fallback は loud」「本当に native driver を使ったことを証明」を満たすには、開始時の選択結果と実行証跡を監査へ運ぶ契約拡張が必要である。

## 配布と同期境界

- 正本は `packages/framework/core/` と `packages/framework/harness/<name>/` である。`scripts/package.ts` は `manifest.ts` を持つ harness を自動発見し、core、harness 固有面、onboarding、compiled graph、runner、emit output を生成する（`scripts/package.ts:55-72,307-429`）。現行 harness は Claude、Codex、Kiro CLI、Kiro IDE の4種である。
- `bun scripts/package.ts --check` は temp build と committed `dist/` を byte compare し、missing／differs／orphan と未参照 harness source を検出する（同 `:638-731`）。
- self-promotion は Claude の `.claude`、Codex の `.codex` と `.agents`、ルート guidance を管理する。Kiro 配布は self-promotion 対象ではない（`scripts/promote-self.ts:29-38,187-205,289-326`）。
- したがって変更は generated `dist/**` を直接編集せず、正本を更新後 `bun scripts/package.ts`、Claude/Codex は `bun run promote:self`、最後に package/self drift check を行う必要がある。

小さな既存負債として、`scripts/package.ts:4,21-23` の説明は3 harness 表記と「Codex only today」のままで、実際の自動発見4 harness とずれている。また `amadeus-swarm.ts:3-6` は「live Claude Code session」と旧 `AMADEUS_USE_SWARM` のみを前提にしており、既に Codex/Kiro に配布される共通 core の説明として古い。

## テスト資産と未検証領域

### 既存の決定的検証

- `tests/integration/t135-invoke-swarm.test.ts:1-64,278-355` は engine の eligibility、2 Unit directive、skeleton guard、referee の mixed batch／baton return を real process と worktree で検証する。ただしテスト自身が conductor を演じ、live AI worker は起動しない。
- `tests/e2e/t134-swarm-referee.test.ts:1-35` は `prepare/check/finalize`、anti-tamper、lying-conductor、exit code、全6 audit event を検証する。`:426-443` の degrade case は旧 `ultracode -> subagent` のみである。
- `tests/unit/t211-swarm-batch-progress.test.ts` は完了 batch を飛ばす ledger、`tests/unit/t186-foreach-state-and-scope.test.ts` は per-Unit state、`tests/unit/t113-directive-schema.test.ts` は最小 directive schema、`tests/unit/t28-audit-event-sync.test.ts:61-69` は audit taxonomy 同期を担う。

### 再利用可能な live harness seam

- Codex には opt-in の real `codex exec` journey があり、version gate、isolated `CODEX_HOME`、stdin close、timeout の実装を再利用できる（`tests/e2e/t-exec-codex-journey-workspace.serial.test.ts:3-30,85-99,152-165`）。ただし native Codex Ultra fan-out の証明ではない。
- Kiro には opt-in の ACP session と tool-call trace があり、native `subagent` invocation を prose ではなく tool trace で検証する先例がある（`tests/e2e/t-acp-kiro-reviewer.serial.test.ts:3-49,70-80,127-192`）。
- Claude には Agent SDK／TUI の live journey があるが、現行 swarm の `Task`／Dynamic Workflow／Agent Teams を2 Unit以上で識別する専用 trace assertion はない。

### 今回不足している検証

1. 5公開値、不正値、harness mismatch、旧変数のみ、新旧一致／矛盾を網羅する selector matrix。
2. `auto` の優先順と capability probe 結果を固定する unit／integration test。
3. explicit unavailable が fallback せず hard error になる検証。
4. auto unavailable が loud fallback し、requested／selected／reason を監査する検証。
5. Claude Agent Teams、Claude Ultra Code、Codex Ultra、Kiro subagent の各 native driver が2 Unit以上を本当に fan-out した live proof。
6. canonical source、全4 `dist`、Claude/Codex self-install の drift guard。

Agent Teams と Codex Ultra は、利用可能性だけでなく native execution を機械判定できるイベント／trace 面が確定していない。これは Ideation の RG-01 と一致する stop-gate であり、実装時に prose の成功申告で代用してはならない。

## 既存 CodeKB との差分

既存 CodeKB には、現在のコードと矛盾する「現存問題」があるため、Architect は今回の再スキャンで訂正する必要がある。

- `code-quality-assessment.md` は Issue #841 の「batch 1 を再提示し続ける」問題を現存扱いしているが、現在は `amadeus-orchestrate.ts:1792-1811` が成果物 coverage から最初の未完了 batch を選んでいる。
- `component-inventory.md` と `code-quality-assessment.md` は package check に source-side unreferenced scan がないとするが、現在は `scripts/package.ts:711-725` に実装済みである。
- `component-inventory.md` は dist root の orphan blind spot を現存扱いしているが、現在は `scripts/package.ts:692-709` が whole-tree scan を行う。
- 一方、driver selector、capability probe、driver-aware audit、4 native driver live proof の欠落は現在も実測できる新しいギャップである。

## Architect への CodeKB 更新指示

| CodeKB artifact | 更新内容 |
|---|---|
| `architecture.md` | engine eligibility、harness conductor、stateless referee、packager の4境界と、driver selection が prose に残る現状を図示する |
| `code-structure.md` | selector 候補の配置判断に必要な core/harness/generated/self-install の正本境界を追記する |
| `api-documentation.md` | 現行 `invoke-swarm` schema と `amadeus-swarm prepare/check/finalize`、`--degraded-from` の狭い契約を更新する |
| `component-inventory.md` | 4 harness の現行 fan-out、onboarding、packager、live test seam を更新し、修正済み stale findings を削除する |
| `technology-stack.md` | Claude tools、`codex exec`、Kiro ACP/subagent、Bun/Git referee のプロセス境界を整理する |
| `dependencies.md` | engine→directive→harness conductor→referee→worktree/Bolt/audit→dist の依存を更新する |
| `code-quality-assessment.md` | #841、source scan、root orphan の修正済み評価を訂正し、selector/audit/probe/live-proof の欠落を新規 findings とする |
| `business-overview.md` | 旧 boolean seam から明示 driver 契約へ移行する intent と対象外（通常 subagent／対話 conductor）を記録する |
| `reverse-engineering-timestamp.md` | base、observed、日時、差分方式、per-intent re-scan の参照を更新する |

per-intent の正式な再スキャン記録は Architect が `amadeus/spaces/default/codekb/amadeus/re-scans/260713-swarm-driver-migration.md` に作成する。

## 設計判断に渡す事実と仮説

### 実測事実

- 新 selector は未実装である。
- engine directive は driver-neutral である。
- driver 選択は harness skill prose に分散している。
- referee は AI worker を起動せず、旧2値 degrade のみ受け取る。
- Codex floor だけが Unit ごとの別 AI CLI process である。
- 現行監査から selected native driver と native execution を復元できない。
- 4 driver の2 Unit以上 live proof は存在しない。

### Architect が決めるべき仮説

- 共通 selector を core の deterministic module とし、harness capability を入力データ化するのが最小の重複で済む可能性が高い。ただし capability probe が live tool availability をどこまで決定的に観測できるかを先に確定する必要がある。
- `invoke-swarm` に driver を積むか、`prepare` に requested／selected／reason を渡すかは、engine read-only と referee audit ownership を維持する形で比較すべきである。
- live proof は既存 Codex exec、Kiro ACP、Claude SDK/TUI の transport seam を再利用できる可能性があるが、driver 固有 event classifier は新設が必要である。

