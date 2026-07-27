# Reverse Engineering スキャンノート — 260726-mirror-envelope-lf(Issue #1498)

上流入力(consumes 全数): Issue #1498 本文+クロスレビュー 2/2 コメント、前 intent 260726-crossreviewed-bug-batch の codekb observed(`1673c4332`)、`amadeus/spaces/default/intents/260724-mirror-auto-modes/construction/mirror-github-gateway/nfr-design/security-design.md`

## 0. 測定 ref(measurement-ref-in-artifacts)

| 項目 | 値 | 取得コマンド |
|---|---|---|
| observed(本スキャンの基準) | `e3940222480b15d9cf10dd0a97df6a35a7ffb7d5` | `git rev-parse HEAD` |
| 差分 base | `1673c4332`(前 intent の observed) | ブリーフィング + 祖先性実測 |
| 祖先性 | 成立 | `git merge-base --is-ancestor 1673c4332 HEAD` → exit 0 |
| worktree / ブランチ | `.claude/worktrees/bugfix` / `worktree-bugfix` | `git branch --show-current` |
| gh | `gh version 2.96.0 (nixpkgs)` | `gh --version` |

本ノートの file:line はすべて observed `e39402224` の作業ツリーで再解決した実測値。
gh 実出力の採取はすべて read-only(`--method GET`)で、repo 外の scratch ディレクトリに保存した。

## 1. 区間スキャン(1673c4332 → e39402224)

`git log --oneline 1673c4332..HEAD | wc -l` = **27 コミット**
(ブリーフィングの「23」より 4 多い — 直近の origin/main マージ以降の前進分。以降は実測値 27 を使う)

変更ファイル総計: `git diff --stat 1673c4332..HEAD | tail -1` → `322 files changed, 20142 insertions(+), 2027 deletions(-)`

| 面 | ファイル数 | 取得コマンド |
|---|---|---|
| record(`amadeus/`) | 137 | `git diff --name-only … \| grep -c '^amadeus/'` |
| 実装(`packages/`,`tests/`,`scripts/`,`.github/`) | 58 | 同 `grep -Ec '^(packages\|tests\|scripts\|\.github)/'` |
| dist + self-install | 114 | 同 `grep -Ec '^(dist\|\.claude\|\.codex\|\.cursor\|\.opencode)/'` |

区間の実装面は主に (a) クロスレビュー済みバグ 6 件のバッチ修正(#1516/#1517/#1518/#1521/#1523/#1524)、(b) CI 検証ジョブ分割(#1528)、(c) metrics ダッシュボード(#1500/#1504)、(d) record 同期・metrics スナップショット。

### 1a. mirror-gateway 系は区間内で無変更(重要)

```
git log --oneline 1673c4332..HEAD -- '*amadeus-mirror-gateway*'   → 出力なし
git diff --stat 1673c4332..HEAD -- '*amadeus-mirror-gateway*'     → 出力なし
git diff --stat 1673c4332..HEAD -- tests/unit/t272-amadeus-mirror-gateway.test.ts \
    tests/unit/t270-amadeus-mirror-repository.test.ts \
    packages/framework/core/tools/amadeus-mirror-lifecycle.ts     → 出力なし
```

⇒ 患部は base 以前から不変であり、クロスレビュー(実測 ref `9ea9a6160`)の観測は observed でもそのまま有効。行番号も一致(§2 で再解決済み)。

## 2. 患部の再実測(observed `e39402224`)

正本: `packages/framework/core/tools/amadeus-mirror-gateway.ts`(724 行、`wc -l` 実測)

### 2a. 確定機序 — ステータス行が bare LF 終端

`gh 2.96.0` の `--include` は **ステータス行だけ LF 終端、ヘッダ行は CRLF** で出力する。

```
$ gh api --include --method GET repos/amadeus-dlc/amadeus/issues/1498 | head -c 18 | od -c
0000000   H   T   T   P   /   2   .   0       2   0   0       O   K  \n
0000020   A   c
```
(同一キャプチャの python 直読: `LF-terminated status lines: 1` / `CRLF-terminated status lines: 0` / `header CRLF count: 27`)

パーサは status line の終端を CRLF 前提で探す:

- `:179` `const STATUS_LINE_RE = /^HTTP\/[0-9.]+ (\d{3})(?: .*)?$/;`(非 multiline)
- `:195` `while (bin.startsWith("HTTP/", pos)) {`
- `:196` `const eol = bin.indexOf("\r\n", pos);`
- `:198` `const match = STATUS_LINE_RE.exec(bin.slice(pos, eol));`
- `:199` `if (match === null) return { kind: "malformed" };`
- `:215` `if (statuses.length === 0) return { kind: "malformed" };`

`:196` が掴むのは **最初のヘッダ行末の CRLF** であり、`:198` に渡る文字列は
`"HTTP/2.0 200 OK\nAccess-Control-Allow-Origin: *"` になる → `STATUS_LINE_RE` 不一致 → `:199` で malformed。
(`:215` へは到達しない。Issue 本文が示す `:215` 経路は「`[` で while に一度も入らない array 系」の場合の落ち方であり、単一系は `:199` で落ちる — 両方とも `malformed` に収束するので分類結果は同じ)

**決定的な対照実測**(observed の実 `parseHttpEnvelope` を repo 外 scratch から直接 import して実バイトへ適用):

| 入力 | mode | 結果 |
|---|---|---|
| `gh api --include GET repos/…/issues/1498` 実バイト | single | `{"kind":"malformed"}` |
| 同バイトのステータス行だけ LF→CRLF に置換 | single | `{"kind":"ok","statuses":[200],"jsonText":"{\"url\":\"https://api.github.com…"}` |
| `--paginate --slurp` 実バイト | array | `{"kind":"malformed"}` |
| 同バイトの先頭 `[` を 1 バイト除去 | array | `{"kind":"malformed"}` |

⇒ **主因は bare-LF ステータス行**。先頭 `[` の除去だけでは治らない(クロスレビュー 2/2 の訂正を独立再現)。

### 2b. malformed → invalid-response の分類経路

`:495` `const env = parseHttpEnvelope(result.stdout, mode);`
`:509` `if (env.kind === "malformed") {` → `:510` `if (result.exitCode !== 0) {`(gh は exit 0 なので偽)
→ `:525-534` `failure("invalid-response", false, effectForOp(op, true), result.exitCode, null)`(retryable=false)

これが症状文字列 `GitHub unavailable (invalid-response; no-effect-confirmed; exit=0; http=none)` の出所。

### 2c. 影響は 5 verb 全部(observed で行番号再確認)

すべて `interpretApiResult` → `parseHttpEnvelope` を通る:

| verb | 呼び出し | argv | `--slurp` |
|---|---|---|---|
| create | `:649` `runApi(createArgv(repository, input), "single")` / `:650` mode=`"single"` | `createArgv` `:97-116` | なし |
| find | `:656` `runApi(findArgv(repository), "paginated")` / `:657` mode=`"array"` | `findArgv` `:118-132` | **あり(`:124-125`)** |
| view | `:690` `runApi(viewArgv(repository, number), "single")` / `:691` | `viewArgv` `:134-139` | なし |
| edit | `:704` `runApi(editArgv(repository, number, body), "single")` / `:705` | `editArgv` `:141-155` | なし |
| close | `:718` `runApi(closeArgv(repository, number), "single")` / `:719` | `closeArgv` `:157-170` | なし |

`viewArgv` の実体(`:138` verbatim):
`return ["api", "--include", "--method", "GET", `${issuesPath(repo)}/${issueNumber}`];`
— `--slurp` を含まないこの経路も §2a の対照実測で malformed。⇒ auto-mirror は全面不成立(P1/S2 引き上げの根拠と一致)。

### 2d. find の `--slurp` は interleave 文法(設計宣言と構造的に別物)

実測(labels, per_page=20 で P=2 を作る。read-only):

```
$ gh api --include --method GET --paginate --slurp repos/amadeus-dlc/amadeus/labels -f per_page=20 > slurp.out; echo $?   → 0
size=8469
head -c 20  → b'[HTTP/2.0 200 OK\nAcc'
blocks 2 offsets [1, 6438]
offset 1    preceded by b'['
offset 6438 preceded by b'…"}]\n,'
EOF last 8  → b'd on"}]]'
page1 body starts (最初の \r\n\r\n の直後) → b'[{"id":11325744721,"node_i'
```

⇒ 実文法は

```
'[' <HTTPブロック> <ページ配列> ( '\n' ',' <HTTPブロック> <ページ配列> )* ']'
```

設計宣言(`amadeus/spaces/default/intents/260724-mirror-auto-modes/construction/mirror-github-gateway/nfr-design/security-design.md:37`、verbatim 抜粋):

> findの`--include --paginate --slurp` stdout grammarは、先頭からpage数P個のHTTP block `HTTP/<version> <3-digit-status> <reason> CRLF *(header CRLF) CRLF`が連続し、その後に単一slurped JSON outer array（要素数P）、末尾LF、EOFだけを許す。

宣言と実出力の相違は 3 点(すべて実測):
1. ステータス行終端が CRLF ではなく **LF**
2. P 個のブロックが連続するのではなく **ページ配列と interleave**、かつ先頭に `[`
3. 「末尾 LF、EOF」ではなく **末尾 LF なし**(single: `EOF last 6 = b':null}'` / slurp: `b'd on"}]]'`)。ただしパーサ `:220` `if (bodyBin.endsWith("\n")) bodyBin = bodyBin.slice(0, -1);` は LF 不在を許容するため、この 3 点目単独では欠陥にならない。

さらに find は仮に LF/CRLF 両対応にしても `:669` の不変条件で落ちる:
`:669` `if (!Array.isArray(outer) || outer.length !== interp.pageCount) {` → `:670` `invalidResponse("read-only")`
(`pageCount` は `:549` `env.statuses.length`。interleave では while が 1 ブロックで抜け `statuses.length=1`、一方 body には残りブロックの生ヘッダが混ざり `:665` の `JSON.parse` が先に失敗する)

**仮説(未検証)**: 「gh 2.96 で出力形式が変わった(ドリフト)」は本環境に 2.96.0 しか無いため帰属未検証。証拠(単一系も壊れている・fixture が自作 CRLF・record に gh 出力の実測が 0 件)は「実装時点から実 gh 出力を一度も測っていない仮定文法」と読むほうが整合する — クロスレビュー 1/2・2/2 の訂正に同意。

### 2e. 偽 green の機序(fixture が自作 CRLF)

`tests/unit/t272-amadeus-mirror-gateway.test.ts:61`(verbatim):

```ts
  return `HTTP/2 ${status} OK\r\ncontent-type: application/json\r\n\r\n`;
```

`grep -n 'HTTP/' tests/unit/t272-amadeus-mirror-gateway.test.ts` → **1 hit(:61 のみ)**。
同ファイルの `singleEnvelope`(:63-65)/`paginatedEnvelope`(:67-72)はこの `block()` を連結して合成するため、
paginated fixture も「P 個のブロック連続 + 単一 JSON 配列」= 設計宣言そのものを再現する。
⇒ **実 gh 出力を一度も通していない**ので、実環境で全 verb が落ちていても CI は緑のまま(検証劇場クラス)。

## 3. 増幅面(コピー数の実測)

`git ls-files "*amadeus-mirror-gateway*"` → **12 パス**(正本 1 + self-install 4 + dist 6 + テスト 1)

```
packages/framework/core/tools/amadeus-mirror-gateway.ts   ← 正本
.claude/tools/…  .codex/tools/…  .cursor/tools/…  .opencode/tools/…        (self-install 4)
dist/claude/.claude/…  dist/codex/.codex/…  dist/cursor/.cursor/…
dist/kiro-ide/.kiro/…  dist/kiro/.kiro/…  dist/opencode/.opencode/…        (dist 6)
tests/unit/t272-amadeus-mirror-gateway.test.ts
```

`cmp -s` 実測: self-install 4 + dist 6 = **10 コピーすべて正本とバイト一致**。
(self-install に `.kiro/tools` は存在しない — `ls -d .kiro/tools` → No such file。dist 側のみ kiro/kiro-ide がある)

投影宣言: `packages/framework/harness/projections.ts:26` に `"amadeus-mirror-gateway.ts"`。
消費側: `packages/framework/core/tools/amadeus-mirror-lifecycle.ts:29` が `from "./amadeus-mirror-gateway.ts"`。
テスト: `tests/unit/t272-…`(:11 import)、`tests/unit/t270-amadeus-mirror-repository.test.ts`(:10 import)。

## 4. 修正時に触る想定ファイル目録

| # | パス | 種別 | 備考 |
|---|---|---|---|
| 1 | `packages/framework/core/tools/amadeus-mirror-gateway.ts` | 正本(唯一の編集元) | parser `:179-235`、必要なら `findArgv :118-132` / `findIssuesByMarker :655-685` |
| 2-5 | `.claude|.codex|.cursor|.opencode/tools/amadeus-mirror-gateway.ts` | 生成物 | `bun run promote:self` |
| 6-11 | `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/…/amadeus-mirror-gateway.ts` | 生成物 | `bun scripts/package.ts` |
| 12 | `tests/unit/t272-amadeus-mirror-gateway.test.ts` | テスト | `block()` :61 を実 gh 形式へ。既存 CRLF ケースは残し **両形式**を持つ |
| 13 | `tests/.coverage-patch-allowlist.json` | 台帳 | gateway のピンは `447-448` / `602` / `615-620` / `702` / `716` の 5 件 — **`:179-235` へ行を挿入すると全件が下方シフトして stale 化**(`cid:code-generation:allowlist-line-pin-stale`)。同一 PR で更新 |
| 14 | `amadeus/…/260724-mirror-auto-modes/…/nfr-design/security-design.md:37` | 過去 record | 誤文法の宣言。訂正するか本 intent の record から反証を参照するかは requirements で裁定(仮説: 過去 record は改変せず本 intent 側に訂正を残すのが record 慣行に整合) |
| 15 | `packages/framework/core/tools/amadeus-mirror-lifecycle.ts` | 消費側 | parser の返り値型を変えない限り無改修見込み(仮説) |

検証コマンド: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`。

## 5. 落ちる実証の注入面と fixture 素材(実 gh 出力、verbatim 最小)

注入面 = **テストが読む面** = `tests/unit/t272-…` の `block()` 合成(:61)。
現行 fixture は自作 CRLF なので、**実 gh 形式の fixture を足した時点で修正前コードは赤になる**(= 落ちる実証はそれ自体が回帰テスト)。

### 5a. 単一 op(create/view/edit/close 用)素材

ステータス行(バイト厳密 — 末尾は **LF 単独**):

```
HTTP/2.0 200 OK\n
```

続くヘッダは CRLF、ヘッダブロック終端は `\r\n\r\n`(実測: `header block end idx: 1427 => terminator bytes: b'\r\n\r\n'`)。最小合成形:

```
HTTP/2.0 200 OK\nAccess-Control-Allow-Origin: *\r\ncontent-type: application/json; charset=utf-8\r\n\r\n{"url":"https://api.github.com/repos/…"}
```

(実測ヘッダ 1 行目 verbatim: `Access-Control-Allow-Origin: *` / 2 行目: `Access-Control-Expose-Headers: ETag, Link, Location, Retry-After, X-…`。EOF に末尾 LF は無い)

### 5b. find(`--paginate --slurp`)素材 — P=2 の interleave

先頭 20 バイト(実測): `b'[HTTP/2.0 200 OK\nAcc'`
ブロック境界(offset 6438 の直前 10 バイト、実測): `b'…"}]\n,HTTP/2.0 200 OK\nAcce'`
EOF(実測 last 8): `b'd on"}]]'`

最小合成形:

```
[HTTP/2.0 200 OK\n<headers CRLF>\r\n\r\n[{…page1…}]\n,HTTP/2.0 200 OK\n<headers CRLF>\r\n\r\n[{…page2…}]]
```

P=1 のときも先頭 `[` は付く(`--slurp` の outer array 開始)。P=1/P=2/P=3 の golden を推奨(設計宣言が要求した 1/2/100 page golden の実形版)。

素材の一次採取コマンド(read-only、repo 外 scratch で実行済み):

```
gh api --include --method GET repos/amadeus-dlc/amadeus/issues/1498            > obj.out    # exit 0, 8414 B
gh api --include --method GET repos/amadeus-dlc/amadeus/labels -f per_page=1   > single.out # exit 0, 1778 B
gh api --include --method GET --paginate --slurp repos/amadeus-dlc/amadeus/labels -f per_page=20 > slurp.out # exit 0, 8469 B
```

手法メモ(後続検証者向け): LF と CRLF は端末表示・`head` では区別できない — `head -c N | od -c` かバイト直読で確認する。判定は文言でなく **captured bytes に実 `parseHttpEnvelope` を適用して kind を得る** のが決定的。`grep -abo "HTTP/2.0 "` は Issue #1498 本文自体が API 応答に含まれるため偽陽性を出す(直後のヘッダ名まで含めて照合する)。

## 6. 修正方向の候補(設計は後続ステージで裁定)

- 単一系 4 verb: parser の status line 終端を LF/CRLF 両対応にすれば足りる(§2a で実証済み)。
- find: (A) 先頭 `[` + interleave 文法を正面から扱うブロックパーサ、(B) `--slurp` を外し 1 ページずつ `--include` で取得して統合(`:669` の `outer.length === pageCount` 不変条件が素直に生きる)。クロスレビュー 2/2 は (B) を推す。

## 7. 後続ステージへの引き継ぎ

- Issue 本文の機序記述(主因 = 先頭 `[`、影響 = create/sync)は **本スキャンで否定済み**。requirements は §2a/§2c を前提にする。
- CI 緑の理由は fixture の自作 CRLF(§2e)。修正 PR は「実 gh 形式 fixture の追加が修正前コードで赤になること」を落ちる実証として実測すること。
- allowlist の行ピン 5 件(§4 #13)は行挿入で必ず stale 化する — 同一 PR で更新する。
