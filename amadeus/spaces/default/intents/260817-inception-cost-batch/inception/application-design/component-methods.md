# Component Methods — インセプション固定費バッチ(#3181 + #2415)

上流入力: `requirements.md` / `decisions.md` / `components.md`。シグネチャは実装段の合意 seam(TDD の Red を置く面 — NFR-4)。ビジネスルールの詳細は本 intent では契約 prose と本書で完結する(functional-design の要否判定は decisions.md 末尾)。

## C1: evidence gateway adapter(amadeus-github-gateway.ts へ追加)

```ts
// argv builders(既存 viewArgv の並び)
function commentsArgv(repo: RepoRef, issueNumber: number): string[];
// -> ["api","--paginate","--method","GET","repos/<owner>/<repo>/issues/<n>/comments"]

// DTO parse(既存 parseIssueObject の並び。防御的 parse、Result 型)
function parseIssueComments(payload: unknown, repo: RepoRef): Result<RemoteGitHubIssueComment[], GatewayParseError>;
// RemoteGitHubIssueComment = { id: number; body: string; createdAt: string; authorLogin: string; htmlUrl: string }

export function createEvidenceGitHubGatewayAdapter(runner: GhRunner): EvidenceGateway;
// EvidenceGateway = {
//   readiness(): ReadinessResult;                       // 既存 readiness() を再利用
//   viewIssue(repo, n): Result<RemoteGitHubIssue, GatewayFailure>;      // 既存 viewArgv+parseIssueObject
//   listComments(repo, n): Result<RemoteGitHubIssueComment[], GatewayFailure>;
// }
```

- エラー処理: 既存 gateway と同一 — 失敗は raw stdout/stderr を運ばず redaction テンプレートで要約(token 非保持)。pagination 失敗・parse 失敗は fail-closed(部分リストを成功として返さない)。
- 認可: read-only のため mutation permit(validateMirrorMutationPermit 系)は不要(ADR-1)。

## C2: issue-evidence verb(amadeus-utility.ts へ追加)

```
bun .claude/tools/amadeus-utility.ts issue-evidence fetch --issues <n[,n...]> [--repo <owner/repo>] [--project-dir <path>]
```

```ts
function handleIssueEvidence(args: string[]): void;
// 手順: parse flags → readiness() 検査 → 各 issue: viewIssue + listComments
//   → クロスレビューコメント抽出(<!-- issue-cross-review ... --> マーカー保持。マーカー無しコメントも「その他コメント」として保持)
//   → C3 のパスへ issue-evidence.md を原子的に書込(tmp+rename、全 issue 成功時のみ — 部分書込なし)
// 終了規約: 成功 exit 0 / readiness 失敗・API 失敗・parse 失敗は exit 非0 + 理由を stderr(loud fail)
//   ワークフロー継続の判断は呼び手(conductor)側 — 契約 prose が「失敗時は Request 自由文 fallback で続行」を規定(FR-EVD-5)
// 冪等: 再実行は全量再取得・上書き(append しない)
```

- 入力検証: `--issues` は正整数 CSV(それ以外は usage エラー)。`--repo` 省略時は gh の現在リポジトリ解決(既存 gateway の RepoRef 解決に従う)。
- 監査: 書込は ARTIFACT_CREATED/UPDATED の既存 PostToolUse 経路に乗る(verb 自身は audit を書かない — 状態遷移非該当)。

## C3: path resolver(amadeus-lib.ts へ追加)

```ts
export function issueEvidencePath(projectDir: string, intent?: string, space?: string): string | null;
export function relativeIssueEvidencePath(projectDir: string, intent?: string, space?: string): string | null;
// -> `<record>/ideation/intent-capture/issue-evidence.md`(resolveArtifactPath の owner 規約と一致 —
//    producing stage = intent-capture(ideation)。git 呼び出しなし・mkdir なしの純関数(codekbDir の流儀)
// 必要性(ADR-1): 汎用 resolveArtifactPath/resolveConsumePath は amadeus-orchestrate.ts 内部の
// graph-compile 済みコンテキスト専用で、CLI verb(C2)は orchestrate ループ外で単独実行される。
// engine 外の決定的パス解決には codekb-path と同じ前例を踏襲。値の一致は C7 drift 検査で pin
```

## issue-evidence artifact 様式(データ形状 — FR-EVD-6)

```markdown
# Issue Evidence — <intent-slug>
## メタデータ
- fetched-at: <ISO8601Z> / repo: <owner/repo> / tool: issue-evidence fetch
## Issue #<n>: <title>
- state / labels / url / target-sha(クロスレビューコメントの marker から抽出、無ければ n/a)
- review-run-id: <id> / 独立レビュアー: <k>名(marker 計数)
### 本文(verbatim)
<Issue body 逐語>
### クロスレビューコメント(verbatim、コメント URL 併記)
<marker 付きコメント逐語 ×k>
### その他コメント(verbatim、任意)
```

- 節見出しは機械抽出可能(per-issue `## Issue #<n>:` 見出し)。複数 Issue バッチは同一ファイル内の節並置(artifact kind は 1 path/1 kind の解決規約のため単一ファイル — scan record §3)。

## C4/C5/C6: 契約改訂(markdown — メソッドなし、編集面のみ)

- C6 `intent-capture.md`: frontmatter `optional_produces: [issue-evidence]` 追加+Step 5 に「issue-first intent では `issue-evidence fetch` の実行を確認」の1節。
- C4 `requirements-analysis.md`: frontmatter `consumes:` へ `{artifact: issue-evidence, required: false}` 追加+Step 2 へ読取指示+「確定事実は再導出せず消費する」明文(FR-EVD-3)+ Sensors 節の upstream-coverage parenthetical(現行 :185 — 3 artifact 列挙で既に stale)へ issue-evidence を含む現行 consumes 全列挙への同期(FR-EVD-7 の文書面)。
- C5 `reverse-engineering.md`: (U1 面)`consumes:` へ同追加+Focus 導出指示(FR-EVD-4)。(U2 面)Step 2 へ除外クラス宣言(ADR-2 の5クラス+specs/** 非除外+正準 `:(glob)` pathspec 逐語)+base 解決(re-scans 読取)と diff 入力の分離明記+「codekb 本体は工程記録を新規引用しない」(ADR-3)。

## C7: 落ちる実証テスト+帰属検査述語(tests/ へ新設)

```ts
export const RE_SCAN_EXCLUDED_PATHSPECS: readonly string[];
// [":(exclude,glob)amadeus/spaces/*/intents/**", ":(exclude,glob)amadeus/spaces/*/elections/**",
//  ":(exclude,glob)amadeus/spaces/*/codekb/**", ":(exclude,glob)amadeus/spaces/*/memory/**",
//  ":(exclude)metrics/**"]  // 逐語は実装時に git 実測で確定(FR-EXC-5 の事前実測 AC)
```

- テスト観点(いずれも実 git 区間への適用): (1) 既知非ゼロ区間で除外前後の件数差が正(0 件無音の反証)。(2) `amadeus/spaces/default/specs/tla/` のファイルが除外後も残る(FR-EXC-2)。(3) 帰属検査 — 除外された全行が5クラスのいずれかへ帰属し未帰属ゼロ(FR-EXC-4 述語)。(4) 契約 markdown 逐語と `RE_SCAN_EXCLUDED_PATHSPECS` の一致(drift 検査 — 正本1定義)。
