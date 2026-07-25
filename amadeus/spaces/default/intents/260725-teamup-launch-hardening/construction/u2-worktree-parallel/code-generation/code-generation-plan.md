# Code Generation Plan — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/domain-entities.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-design/performance-design.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-design/security-design.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`（`deployment-architecture` は本 intent に成果物が存在せず N/A — `find` 実測で不在を確認）

- `business-rules.md` — BR-P1〜BR-P20 を実装タスクの受け入れ条件へ落とした。
- `business-logic-model.md` — 手順4のみを 4a〜4d へ置き換える方針と、台帳をやめる理由を実装構造の根拠とした。
- `domain-entities.md` — INV-P2（走査範囲）と INV-P3（メタデータの非交差）を、走査実装とサブシェル内書込の根拠とした。
- `performance-design.md` — D-P1（バッチ制御）と D-P4（定数のコメント様式）を、そのまま実装形とした。
- `security-design.md` — D-S1 の3層限定を、`rollback_prepared_run` の実装制約とした。
- `unit-of-work.md` — U2 の作業項目5件と完了の定義を、下記タスク分解の起点とした。
- `requirements.md` — FR-6〜FR-8 / NFR-1 / NFR-4〜NFR-8 を検証計画の対象とした。

測定 ref: 実装コミット `1f4e82257`（その親 = U1 着地後の `07962180a`）。

## 着手時の行番号再解決（BR-P20）

設計成果物の行番号は U1 実装前の値であり、着手時に実ファイルで再解決した（`cid:reverse-engineering:upstream-cite-reresolve-on-shift`）。

| 対象 | 設計時 | 着手時の実測 |
|---|---|---|
| `rollback_prepared_run()` | `:1241` | `:1266` |
| `CREATED_MEMBERS` 読取 | `:1244` | `:1269` |
| `create_run()` | `:1267` | `:1292` |
| `git worktree add -q -b` | `:1305` | `:1330` |
| `CREATED_MEMBERS` 追記 | `:1306` | `:1331` |
| `CREATED_MEMBERS` 初期化 | `:1392` | `:1417` |

定数ブロックの textual conflict（BR-P20）は発生しなかった。U1 が `WATCHER_RESEND_MAX`（`:118`）/ `AGMSG_ACTAS_LOCK_LIB`（`:122`）を確定させた後の末尾へ追記したため。

## タスク分解

| # | タスク | 対象 | 根拠 |
|---|---|---|---|
| T1 | `WORKTREE_PARALLELISM=4` の新設（実測コメント付き） | 定数ブロック末尾 | BR-P1、BR-P2、D-P4 |
| T2 | 生成ループのバッチ並列化 + サブシェル化 | `create_run` 手順4 | BR-P1、BR-P4、D-P1 |
| T3 | 完了照合の新設（git 登録の照合） | `create_run` 末尾 | BR-P14、C-P4、**D-R4** |
| T4 | `rollback_prepared_run` の対象再導出（3層限定） | `rollback_prepared_run` | BR-P8〜P12、ADR-3、D-S1 |
| T5 | `CREATED_MEMBERS` の完全廃止 | 3消費者 | BR-P6、C-P9 |
| T6 | 失敗メンバーの1行報告 | サブシェル内 | BR-P13〜P15、D-R6 |
| T7 | テスト新設（t295） | `tests/integration/` | BR-P10、NFR-7 |
| T8 | 配布11コピーの同期 | dist 6面 + self-install 4面 | BR-P19 |

## T3 の設計判断: 何をもって「成功」とするか

D-R4 の指示どおり、**判定基準はディレクトリの有無ではなく git への正規登録**とした。

`git worktree add` はディレクトリ作成後の checkout 段階で失敗しうるため、ディレクトリだけが残り git 未登録という状態が起きる。`[ -d ]` による照合はこれを「成功」と誤判定する。実装では `git worktree list --porcelain` の出力と照合する。

`git rev-parse --is-inside-work-tree` は採らなかった（対象がリポジトリ配下だと親を辿って `true` を返しうる — D-R4）。

パス比較は、`git worktree list` 側が物理パスを返すのに合わせ、こちら側も `cd … && pwd -P` で物理パスに揃えてから `grep -qxF` で完全一致を取る（macOS の `/var` → `/private/var` のような symlink 差を吸収するため）。

## T2 の設計判断: `wait` の終了コードを見ない

`set -euo pipefail` 下で bash の引数なし `wait` は常に 0 を返す（scratch で実測確認）。したがって `wait` はジョブ失敗を伝播せず、`|| true` のような抑止も不要である。

失敗の検知は T3 の実在照合が唯一の権威であり、これは D-R4 が選択肢 (a)（`wait` の終了コードを見る）を却下して (c) を採った設計と一致する。

## 検証計画

| 検証 | コマンド |
|---|---|
| 型検査 | `bun run typecheck` |
| lint | `bun run lint` |
| 配布ドリフト | `bun run dist:check` |
| self-install ドリフト | `bun run promote:self:check` |
| 全スイート | `bash tests/run-tests.sh --ci` |
| 落ちる実証 | 対象ファイル限定の `git checkout <sha> -- <path>`（stash は使わない — `cid:code-generation:falling-proof-no-stash`） |
| 失敗注入 | PATH 上の `git` shim による `worktree add` の失敗注入 |

exit code はパイプ越しに拾わない（`cid:code-generation:no-exit-capture-through-pipe`）。

## 新設しないもの（設計どおり）

| 項目 | 理由 |
|---|---|
| 成功集合の集約機構（一時ファイル・FIFO） | T3 の実在照合で足りる（ADR-3） |
| リトライ機構 | git のロック競合は失敗にならない（D-R7 実測） |
| 外部並列化ユーティリティ | bash のジョブ制御で足りる |
| `WORKTREE_PARALLELISM` の env 上書き | ADR-4 が Alternatives Rejected として却下 |
| `CREATED_MEMBERS` の互換別名 | `org.md` Forbidden |

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T14:52:01Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 raised 1 Major (insertion count +87 vs measured +73) and 1 Minor (CREATED_MEMBERS grep claimed 0 hits, actual 1 comment-only hit); both corrected from command output and independently re-verified in iteration 2 with zero new findings.

### Findings

- None
