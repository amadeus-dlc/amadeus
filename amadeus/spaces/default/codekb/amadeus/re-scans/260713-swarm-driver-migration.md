# 260713-swarm-driver-migration 再スキャン記録

## メタデータ

| 項目 | 値 |
| --- | --- |
| Intent | `260713-swarm-driver-migration` |
| Repository | `amadeus` |
| Project type | Brownfield |
| 手法 | 既存 CodeKB に対する diff-refresh |
| Base commit | `13598b752b656cc9bbf5d931f8e3a6c34881fd1c` |
| Observed commit | `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5` |
| 距離 | 49 commits |
| 観測日時 | 2026-07-13T07:57:31Z |
| Focus | Construction multi-Unit の driver 選択、capability probe、harness fan-out、stateless referee、監査、packaging／self-promotion、live proof |
| 実施体制 | Developer code scan → Architect synthesis の直列実行 |

## Base 選定と到達可能性

既存 `re-scans/*.md` の全 Observed commit を候補とし、各候補について `git merge-base --is-ancestor <candidate> cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5` を実行した。観測 HEAD の祖先である候補のうち `git rev-list --count <candidate>..HEAD` が最小のものとして `13598b752b656cc9bbf5d931f8e3a6c34881fd1c` を採用した。

`260712-metrics-observation` に記録された `c11554226542faabd2a6c694650ea26323745ed8` は日付上は新しいが、現 HEAD の祖先ではない。merge-base は `83e408f26e5113ce209768fae54cd31616bb3e3b` であり、squash merge 後の別系譜 SHA と判断して base 候補から除外した。共有 `reverse-engineering-timestamp.md` は freshness pointer に限り、差分 base の真実源には使用していない。

## 差分の焦点所見

### 現行構造

- engine は `Construction Autonomy Mode=autonomous`、runtime graph の未完了 batch、Construction の `for_each: unit-of-work` かつ `mode: subagent` を eligibility として判定し、driver-neutral な `{ kind: "invoke-swarm", units, repo? }` を返す。
- driver 選択、AI worker fan-out、retry は各 harness の orchestrator skill prose と live conductor が担う。共通 selector module は存在しない。
- Claude Code は live `Task`／Dynamic `Workflow`、Codex は Unit ごとの別 `codex exec` process、Kiro CLI／IDE は live native `subagent` を使う。全ハーネスで別 AI CLI process を起動する構造ではない。
- `amadeus-swarm.ts` は AI dispatcher ではなく、`prepare`／`check`／`finalize` を提供する stateless referee である。Unit worktree、Bolt state、protected file、収束再検証、直列 merge、swarm audit を所有する。
- canonical source は `packages/framework/core/` と `packages/framework/harness/<name>/`。`scripts/package.ts` が4 harness の `dist` を生成し、`scripts/promote-self.ts` が Claude／Codex の project-local self-install を同期する。`dist/**` は生成物であり直接編集しない。

### 新 driver 契約に対する不足

1. intent 文書を除く製品コードに `AMADEUS_SWARM_DRIVER` の実装は0件である。
2. `auto` と4つの明示 driver を決定的に選ぶ selector matrix がない。
3. CLI version／flag 受理ではなく native 実行能力を判定する capability probe がない。
4. explicit unavailable を worker 起動前 hard error にする共通契約がない。
5. `auto` fallback の requested／selected／reason を利用者表示と監査へ相関させる契約がない。
6. `SWARM_DEGRADED` だけが旧 `ultracode → subagent` を記録し、`SWARM_STARTED`／`SWARM_COMPLETED` 等から selected driver や native execution evidence を復元できない。
7. Claude Agent Teams、Claude Ultra Code、Codex Ultra、Kiro subagent の各2 Unit以上を native event／trace で証明し、referee verdict と相関させる live suite がない。

### 修正済みの過去 finding

- #841 の完了済み batch 再提示は、`amadeus-orchestrate.ts:1792-1811` が成果物 coverage から最初の未完了 batch を選ぶ実装により解消済みである。
- package source-side unreferenced scan は `scripts/package.ts:711-725` に実装済みである。
- dist root の orphan blind spot は `scripts/package.ts:692-709` の whole-tree scan により解消済みである。

## CodeKB 更新表

| 成果物 | 更新内容 |
| --- | --- |
| `business-overview.md` | 新 driver 契約の利用者価値、対象／対象外、移行境界を最新節として追加 |
| `architecture.md` | engine、harness conductor、worker、stateless referee、worktree／Bolt／audit、packaging の境界と Interaction Diagrams を追加 |
| `code-structure.md` | selector／probe／driver adapter 候補を判断する canonical、harness、generated、self-install の配置境界を追加 |
| `api-documentation.md` | `invoke-swarm` と referee CLI の現行契約、旧 `--degraded-from` の限界、stale packaging 契約を訂正 |
| `component-inventory.md` | engine、directive、4 harness、referee、packager、live test seam の現行棚卸しを追加 |
| `technology-stack.md` | live tool／別 CLI process／Bun・Git referee のプロセス境界と live proof substrate を追加 |
| `dependencies.md` | engine→directive→conductor→worker↔referee→worktree／Bolt／audit と source→dist→self-install の依存図を追加 |
| `code-quality-assessment.md` | #841／source scan／root orphan を解決済みに訂正し、selector／probe／audit／live proof の未解決 finding を追加 |
| `reverse-engineering-timestamp.md` | 本 intent の最新 freshness metadata と本 per-intent record 参照へ更新 |

## 未解決ギャップ

- selector の正本配置と、task topology／harness capability をどの型で受け取るかは Application Design で確定する必要がある。
- engine directive に selected driver を積む案と、referee `prepare` に requested／selected／reason を渡す案は、engine の read-only 性と referee の audit ownership を保つトレードオフ比較が必要である。
- Agent Teams と Codex Ultra の native 実行を機械判定できる event／trace classifier は未確定であり、Ideation の RG-01 に従い早期 stop-gate とする。
- `scripts/package.ts` 冒頭の説明には harness 数／Codex emit の古い表現が残り、`amadeus-swarm.ts` 冒頭コメントも Claude／旧変数前提である。実装時に正本コメントを同期する必要がある。
- live suite は現在の認証済みローカル CLI と非機密 fixture を使う opt-in 契約であり、通常の credentialed CI job は追加しない。未実施を成功へ読み替えてはならない。

## 参照

- Developer code scan: `amadeus/spaces/default/intents/260713-swarm-driver-migration/inception/reverse-engineering/scan-notes.md`
- Ideation intent: `amadeus/spaces/default/intents/260713-swarm-driver-migration/ideation/intent-capture/intent-statement.md`
- Feasibility: `amadeus/spaces/default/intents/260713-swarm-driver-migration/ideation/feasibility/feasibility-assessment.md`
- Scope: `amadeus/spaces/default/intents/260713-swarm-driver-migration/ideation/scope-definition/scope-document.md`
