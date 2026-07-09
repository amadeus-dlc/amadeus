# API ドキュメント

## 公開 API サーフェス

この repository に HTTP API、GraphQL API、service endpoint は存在しない。公開されている契約は CLI コマンド(`@amadeus-dlc/setup`、AI-DLC 内部ツール群)である。本 intent は既存契約の変更ではなく内部欠陥の修理であるため、CLI サーフェスの外形は維持される想定。

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
