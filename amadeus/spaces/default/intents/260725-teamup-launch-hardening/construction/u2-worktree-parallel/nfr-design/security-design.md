# Security Design — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/performance-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/security-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/scalability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/reliability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/tech-stack-decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`

- `security-requirements.md` — S-1（破壊的操作の範囲限定）、S-2（並列書込の競合）、S-3（git のロック競合）を、下記の実装方針で満たす対象とした。
- `reliability-requirements.md` — R-4（走査範囲の安全性）を引き、S-1 と同一の設計で満たされることを確認した。
- `business-logic-model.md` — ロールバック対象の決定がメモリからファイルシステムへ移る点を引き、安全性の焦点を確定した。
- `performance-requirements.md` — P-3（上限4）を引き、並列度が競合リスクに与える影響を確認した。
- `scalability-requirements.md` — SC-3（リポジトリ規模への依存）を引き、環境差が安全性に影響しないことを確認した。
- `tech-stack-decisions.md` — 外部依存を追加しない方針を引き、攻撃面の拡大がないことを確認した。

測定 ref: HEAD `138a60372`。

## 設計方針

本ユニット最大のリスクは**破壊的操作の対象を誤ること**である。並列化そのものより、ロールバック対象の決定根拠がメモリからファイルシステムへ移ることの安全性が焦点になる。

## D-S1: 破壊的操作の3重の範囲限定（最重要）

ロールバックは `git worktree remove --force` と `rm -rf` を実行する。

| 層 | 限定 | 根拠 |
|---|---|---|
| 1. 起点 | `RUN_ROOT` = `$BASE/runs/$RUN_ID` のみ。`create_run` が `:1280` で組み立て、`:1282` で既存衝突を拒否する（`:1283` は `RUN_RECORD` 側） run 専用ディレクトリ | INV-P1 |
| 2. 名前 | 走査で得たディレクトリ名を `members_for "$TEAM_SIZE"` の集合と突き合わせ、**一致するものだけ**を対象にする | INV-P2 |
| 3. 深さ | `RUN_ROOT` の**直下のみ**。再帰しない | 設計制約 |

**この3層により、`RUN_ROOT` 外・無関係な名前・深い階層のいずれにも触れない。**

### 台帳方式との比較

| 方式 | 削除対象の根拠 | 誤りうる条件 |
|---|---|---|
| 現行（台帳） | 親シェルの `CREATED_MEMBERS` | 台帳と実体が乖離したとき（追記漏れ・順序違い） |
| U2（実在走査） | `RUN_ROOT` 配下の実ディレクトリ | 走査範囲を誤ったとき |

**どちらも誤りうるが、失敗様式が違う。** 台帳方式は「消し残す」方向（台帳に載っていない worktree が残る）、実在走査は「消しすぎる」方向（範囲を広げると無関係なものを消す）に倒れる。後者の方が有害なため、範囲限定を最優先の設計制約とする。

## D-S2: 並列書込の非競合

各サブシェルが書くのは `RUN_RECORD/members/<member>/` 配下のみ。

| 防御 | 内容 |
|---|---|
| パスの分離 | member 名でディレクトリが完全に分離されている（INV-P3） |
| 共通ファイルへの書込禁止 | 集約用の一時ファイル・ログ・ロックファイルを新設しない |
| 検証 | 並列実行後に全メンバー分のメタデータが揃っていること |

**共通ファイルへ追記する設計にしない。** これが並列書込を安全にする唯一の条件である。

## D-S3: git のロック競合

| 項目 | 内容 |
|---|---|
| 実測 | 全並列度（2/3/4/7）で成功 7/7、stderr 0 bytes |
| 評価 | git が内部でロックを直列化する。データ破損は観測されなかった |
| 設計 | **リトライ機構を追加しない**。存在しない問題への対策は複雑さだけを増やす |

## D-S4: 入力の値域

| 入力 | 値域 | 外部入力か |
|---|---|---|
| member 名 | `members_for` が返す固定集合 | いいえ |
| `RUN_ID` | `create_run` が生成し `valid_run_id` で検証済み | いいえ（`TEAM_RUN_ID` 経由なら環境変数だが既存の検証を通る） |
| `WORKTREE_PARALLELISM` | 定数4 | いいえ |

新規のコマンド構築はなく、`git worktree add` の引数は現行と同一。注入面の拡大はない。

## 実施する検査

| 検査 | 対象 |
|---|---|
| `bun run lint` / `typecheck` | テストファイル |
| `bash tests/run-tests.sh --ci` | 全スイート |
| **失敗注入によるロールバック検証** | D-S1 の範囲限定が実際に働くこと |

依存追加がないため、リポジトリ全体の依存監査は本ユニットの対象面と無関係（`cid:build-and-test:c1-doctor-seam`）。
