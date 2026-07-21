# API ドキュメント

## safety-wait supervisor が依存する内部 CLI 契約（最新: 260721-teamup-safety-wait）

この intent は HTTP API を追加しない。設計対象は `team-up.sh` から Herdr CLI へ接続する内部運用 API である。

| 契約 | 入力 | 成功結果 | fail-closed 条件 |
| --- | --- | --- | --- |
| role→pane 解決 | session、member role | pane ID が一意 | 0件、複数件、session 消失 |
| visible 読取 | session、pane ID、`source=visible` | 現在画面のみ | read error、partial／ANSI／wrap が正規化契約外 |
| output wait | pane、既知 fingerprint、timeout | 候補画面の到着 | timeout、version drift |
| 選択注入 | 対象 pane、限定 key、`enter` | 現在 modal を1回送信 | latch 済み、rate limit、再読取不一致 |
| 解除確認 | 同一 pane の visible 再読取 | fingerprint 消失 | 残留時は再連打せず警告停止 |

## 既存 launcher／bridge 契約

- `run-codex.sh` は `--dangerously-bypass-approvals-and-sandbox` を付けて Codex shim を起動するが、これは approval／sandbox 契約であり safety-buffering UI の抑止 APIではない。
- agmsg codex-monitor／shim／bridge は turn/start 注入を担い、TUI modal 操作 API を公開しない。今回その外部 API を拡張しない。
- `team-msg.sh` の Herdr backend は `agent send` の後に `pane send-keys ... enter` を送る既存入力契約を持つ。supervisor は自由文を送らず、完全 fingerprint 成立時の限定 key 操作だけを行う。

## swarm driver 関連の現行 CLI／directive 契約（2026-07-13、履歴）

### `invoke-swarm` directive

```typescript
type InvokeSwarmDirective = {
  kind: "invoke-swarm";
  units: string[];
  repo?: string;
};
```

engine が返す外形は上記だけであり、driver、harness、task topology、capability probe、fallback reason、native evidence は含まれない。eligibility は autonomous Construction の未完了 batch に限定される。

### swarm referee CLI

```bash
bun <harness-dir>/tools/amadeus-swarm.ts prepare \
  --batch <n> --units <a,b,...> [--base <branch>] [--repo <name>] \
  [--degraded-from <subagent|ultracode>]

bun <harness-dir>/tools/amadeus-swarm.ts check <unit> \
  --check-cmd "<command>" [--test-file <protected-spec>]

bun <harness-dir>/tools/amadeus-swarm.ts finalize \
  --batch <n> --units <a,b,...> --claimed <a,...> \
  --check-cmd "<command>" [--test-file <protected-spec>] \
  [--reasons <unit>=<reason>,...]
```

- `prepare`: Unit ごとの worktree／Bolt state を作り、`SWARM_STARTED` を発行する。`--degraded-from` は旧 `subagent|ultracode` のみで、fallback は `subagent` として `SWARM_DEGRADED` に記録される。
- `check`: convergence command と protected file を検査する advisory API。監査イベントは発行しない。
- `finalize`: claimed Unit を再検証し、genuine pass のみ直列 merge する。成功は exit 0、未収束／merge failure は failure envelope と exit 2。

現行 contract には `AMADEUS_SWARM_DRIVER` の5値、explicit unavailable hard error、`auto` fallback、requested／selected／reason／capability evidence／native trace の受け口がない。後続設計では、engine の read-only 性と referee の audit ownership を維持しながら、選択結果を worker 起動前に確定・監査へ渡す必要がある。

### packaging 契約の現行訂正

`scripts/package.ts --check` は現在、再生成 byte diff に加えて `dist/<name>/` 全域の orphan scan（`:692-709`）と harness source-side unreferenced scan（`:711-725`）を実行する。以下の #735／#701 節は発見当時の履歴であり、両ギャップを現存問題として扱わない。

## 公開 API サーフェス

この repository に HTTP API、GraphQL API、service endpoint は存在しない。公開されている契約は CLI コマンド(`@amadeus-dlc/setup`、AI-DLC 内部ツール群)である。当該スキャン intent(260709-bug-zero-batch)は既存契約の変更ではなく内部欠陥の修理であったため、CLI サーフェスの外形は維持される想定。以降の一連の bugfix intent(バッチ D=tools-dispatch-batch まで)も既存契約の変更を含まない。

> **2026-07-10 更新(intent 260710、#735)**: 前回 intent の2バグは出荷済み — **#685 は #729 で解消**(`delegate-rejection` subcommand + `DELEGATED_REJECTION` イベント追加。`amadeus-state.ts` dispatch L262-263)、**#670 は #727 で解消**(worktree write パスのアンカー化)。下記「#685」「#670」節は歴史的記録。

## `scripts/package.ts` の packaging CLI 契約(#735 に関連)

> **履歴・解決済み**: source-side unreferenced scan は現行 `scripts/package.ts:711-725` に実装済み。以下は修正前の契約記録。

```bash
bun scripts/package.ts [<harness>]            # write: dist/<name>/ を再生成(clean-sweep)
bun scripts/package.ts --check [<harness>]    # check: 再ビルドと committed dist を byte-diff、drift で exit 1
bun scripts/package.ts codex trust --project <abs-dir> [--hooks-json <abs-path>]  # codex trust-seed 出力
```

- write 契約(`writeHarness`, L521-549): `harness/*/manifest.ts` を発見(引数なし時)または名指しで、`dist/<name>/<harnessDir>/` と workspace-root method tree を clean-sweep 後に `buildTree` で再生成する。
- check 契約(`checkHarness`, L554-634): tmp に再ビルドして committed dist と byte-diff。`MISSING`/`DIFFERS`/`ORPHAN` を集め、1件でもあれば exit 1(最大40件表示、L672-678)。`dist:check`(package.json script)がこれを呼ぶ。
- **#735 のギャップ**: この `--check` の orphan 検出はすべて**出力側**(dist)で完結する。`harness/<name>/` の authored ソースが manifest 未参照でも、それは dist に出力されないため `--check` は何も鳴らさない。source 側に「全 authored ソースが `harnessFiles` 参照集合または既知 build 機構(`manifest.ts`/`onboarding.fills.ts`/`emit.ts`)に属するか」を照合する契約が存在しない。

## `amadeus-state.ts` gate resolution 契約(#685 に関連、前 intent、履歴)

```bash
bun packages/framework/core/tools/amadeus-state.ts approve <slug> [--user-input <text>]
bun packages/framework/core/tools/amadeus-state.ts delegate-approval <slug> --to-intent <record-dir> [--to-space <space>] [--user-input <text>]
bun packages/framework/core/tools/amadeus-state.ts reject <slug> [--feedback <text>]
```

- `delegate-approval` の契約(L1449-1541): 呼び出し元(leader session)が自身の audit shard に持つ実 `HUMAN_TURN` を根拠に、`--to-intent`/`--to-space` で指定した別セッション(conductor)の record dir へ `DELEGATED_APPROVAL` を発行する。対象側の `approve`/gate チェックは `verifyDelegatedApproval` でこの根拠を検証してから human act として受理する。
- **#685 の欠陥**: `reject` に相当する `delegate-reject`/`delegate-rejection` subcommand は存在しない(`amadeus-state.ts` の subcommand dispatch、L257-303、および `packages/framework/core/` 全体を grep して確認)。agent-team topology でリモートの conductor がゲートを REJECT する手段が構造的に存在しない — 唯一の経路は conductor 自身のセッションが実 `HUMAN_TURN` を持つことだが、それは leader 側の human turn では満たせない。

## `amadeus-worktree.ts` create / `amadeus-bolt.ts --worktree` 契約(#670 に関連、前 intent、履歴)

```bash
bun packages/framework/core/tools/amadeus-worktree.ts create --name <dev> [--repo <name>]
bun packages/framework/core/tools/amadeus-bolt.ts start --worktree ...
```

- 契約(`amadeus-worktree.ts:112-132` `assertNotSiblingWorktree`): `create`(L204)、L277、L512 近傍(`bolt --worktree` の release/merge 経路)は、呼び出し元の `git rev-parse --show-toplevel` がメインチェックアウトと一致しない限り無条件にエラー終了する。
- **#670 の欠陥**: この契約は「Bolt 自身が作るネストしたワークツリー(`.claude/worktrees/<dev>/`)からの呼び出しを防ぐ」ことを意図しているが、実装は cwd が**いずれの** git worktree であっても区別なく拒否する。マルチワークツリーのチーム体制(人間/エージェントごとに独立した sibling worktree を持つ運用)では、正当な sibling worktree から `amadeus-worktree create`/`bolt --worktree` を呼ぶユースケースそのものがブロックされる。

## `amadeus-swarm.ts finalize` の契約(#674 に関連)

```bash
bun packages/framework/core/tools/amadeus-swarm.ts finalize --batch <n> --check-cmd "<cmd>" \
  [--claimed <csv>] [--units <csv>] [--test-file <path>] [--reasons <unit>=<reason>,...]
```

- 出力: `{ batch, units: UnitResult[], converged, failed, merge_failures }` の JSON envelope(`amadeus-swarm.ts:620-627`)。
- exit code 契約: 0 = 全 claimed unit が genuine に converge かつ merge 成功。2 = いずれかの unit が failed、または `merge_failures` が非空(L630)。
- **#674 の欠陥**: exit code 契約は merge 失敗を正しく検知する(`mergeFailures.length > 0` を見ている)が、`units` 配列と、それに基づいて発行される `UNIT_CONVERGED`/`UNIT_FAILED` audit イベントは merge 失敗を反映しない。呼び出し元が JSON の `units[].status` だけを見た場合、merge に失敗した unit も `"converged"` と誤認する。

## `amadeus-state.ts` の gate 系サブコマンド契約(#675 に関連)

```bash
bun packages/framework/core/tools/amadeus-state.ts approve <slug> [--user-input <text>]
bun packages/framework/core/tools/amadeus-state.ts reject <slug> [--feedback <text>]
```

- `approve` の契約: autonomous Construction または `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` のいずれでもない限り、直前の gate 解決以降に `HUMAN_TURN` イベントが記録されていなければ拒否する(`amadeus-state.ts:1321-1337`)。
- **#675 の欠陥**: `reject` にはこの契約が存在しない。ドキュメント化された契約(`approve` 側のコメント、L1316-1337)は「gate はここで人間の判断が必要」と明言しているが、`reject` の docstring(L1279-1285 相当のコメントに `reject` 用のものはない)にも実装にもこの制約が反映されていない。

## `amadeus-bolt.ts start`/audit 契約(#676 に関連)

```bash
bun packages/framework/core/tools/amadeus-bolt.ts start --worktree --slug <slug> \
  --name <bolt-name> --batch <n> [--intent <id>] [--space <name>]
```

- 契約: `--worktree` 指定時は `BOLT_STARTED` audit イベントを、`--intent`/`--space` で指定された(または解決される)intent の record dir に書き込む。
- **#676 の欠陥**: `--intent`/`--space` が渡されても、内部の `recordDir()` 解決に失敗すると `auditFilePath()`(`amadeus-lib.ts:1267-1270`)が space レベルの bare fallback に静かに切り替わる。この切り替わりを呼び出し元(conductor)に通知するエラーや警告は出力されない。

## `@amadeus-dlc/setup` Http ポート契約(#677 に関連)

```typescript
type Http = {
  getJson(apiPath: string): Promise<Result<unknown, FetchError>>;
  downloadArchive(url: URL): Promise<Result<ReadableStream<Uint8Array>, FetchError>>;
};
```

- 契約(`ports/http.ts:9-12`): 両メソッドとも例外を投げず、必ず `Result` で解決する。
- **#677 の欠陥**: `getJson()`(L23-28)の `checked.value.json()`(L27)がこの契約の外にある。GitHub API が 200 かつ不正な JSON ボディを返した場合、`getJson()` は `Promise<Result<...>>` ではなく reject された Promise を返し、呼び出し元(`resolver`/`fetcher` 等)は `Result` のみを想定したハンドリングをすり抜ける。

## `extractTarGz` 契約(#678 に関連)

```typescript
export async function extractTarGz(
  archivePath: string,
  extractDir: string,
  tmpWrite: TmpWrite
): Promise<Result<void, FetchError>>
```

- 契約(`tar-archive-extractor.ts:33`): アーカイブ全体をストリーミングで読み、`extractDir` 配下に安全に展開する。PAX(`x`)/GNU(`L`)longname を含む `git archive` 形式の tar をサポートする(冒頭コメント L8-19)。
- **#678 として持ち越す論点**: この契約自体は変更しないが、PAX/GNU longname がネットワークチャンクの境界を跨ぐ入力に対する挙動が実測未検証。

## `codekb-path` コマンド契約(#668 に関連)

```bash
bun .claude/tools/amadeus-utility.ts codekb-path [--repo <name>] [--json]
```

- 契約(`amadeus-utility.ts:2690-2699`): 「決定的な per-repo codekb ディレクトリ」を出力する。`--repo` が指定されない場合は `codekbRepoName(projectDir, space)` の解決結果を使う。
- **#668 の欠陥**: `codekbRepoName()` の fallback(`amadeus-lib.ts:503`)がワークツリーのディレクトリ名を使うため、「決定的(deterministic)」であるべき per-repo ディレクトリが worktree ごとに変わってしまう。本スキャン自体が `codekb/claude-engineer-1/` に出力されている(この codekb ファイル群自体)ことが直接の実例である。

## `scripts/package.ts` CLI 契約(#701 に関連)

> **履歴・解決済み**: dist root を含む whole-tree orphan scan は現行 `scripts/package.ts:692-709` に実装済み。以下は修正前の契約記録。

```bash
bun scripts/package.ts [<harness>] [--check]
```

- `--check` の契約: `dist/<name>/` が現行 manifest から生成される内容と byte 一致することを検査し、不一致(`MISSING`/`DIFFERS`/`ORPHAN`)があれば非 0 で exit する drift ガード。全 harness 対象時は `[<name>] --check: OK` を harness ごとに出力する。
- 検査は5スキャンで構成(`checkHarness` `:554-624`): (1) harness 内 built→committed、(2) harness 内 committed→built orphan、(3) projectRoot ファイルの明示 diff `:586-592`、(4) harness 外 emit ファイルの diff、(5) harness 外 orphan スキャン `:611-618`。
- **#701 の盲点**: (3) は built→committed 方向のみで committed→built の orphan 検査が無い。(5) の walk ルートは `[".agents","amadeus"]`(`:611`)のハードコード2件のみ。→ dist ルート直下(`dist/<name>/` の非 `<harnessDir>/`・非 `.agents/`・非 `amadeus/`・非 manifest 宣言)の stale ファイルはどのスキャンにも当たらず、`--check` を exit 0 で通過する。契約が謳う「完全な drift 検出」に穴がある。

## リリース契約(#702 に関連)

- **起動経路**: `.github/workflows/release.yml` の `workflow_dispatch`(inputs: `bump`、`dry-run`)→ `npx release-it` が bump→commit→tag→push を `main` へ直接。初回は `--no-increment`(bootstrap)、`dry-run` は `--dry-run` + `npm publish --dry-run` でリハーサル。
- **同期フック**: `packages/setup/.release-it.json` の `hooks.after:bump` = `bun ../../scripts/release-version-sync.ts ${version} && git add -A :/`。`git.tagName` = `v${version}`、`requireBranch: main`、`requireCleanWorkingDir: true`、`github.release: false` / `npm.publish: false`(publish は release.yml 側)。
- **`release-version-sync.ts <semver>` の契約**: 引数 semver(prerelease サフィックス受理、`:22`)で version 面3点 — `packages/framework/core/tools/amadeus-version.ts` の `AMADEUS_VERSION`、`README.md` のバージョンバッジ、`packages/setup/package.json` — を同期する。いずれかの patchFile で期待パターンが見つからなければ `process.exit(1)`(`:37-40`)。
- **#702 の欠陥**: version 受理は prerelease を許すのに、README バッジの patch 正規表現(`:53-54`)は `X.Y.Z-blue` 固定で prerelease を許さない非対称。prerelease 版へ bump すると次回実行でバッジ patch が exit 1 に張り付き、かつ version.ts を先に書いた後の half-applied 状態を残す。release.yml の1ボタン運用が prerelease 到達時点で前進不能になる。
