# Domain Entities — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-story-map.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-methods.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/services.md`

- `unit-of-work.md` — U2 の作業項目から、扱う実体（run・worktree・台帳・ロールバック対象）を抽出した。
- `unit-of-work-story-map.md` — US-5〜US-7 に現れる利用者視点の概念（部分失敗・失敗メンバー）を引いた。
- `requirements.md` — FR-6〜FR-8 が言及する実体（並列度定数・ロールバック対象）を列挙の起点とした。
- `components.md` — 改変 / 廃止のコンポーネントを、実体のライフサイクルへ対応づけた。
- `component-methods.md` — 並列化後のメタデータ書込所在を、実体の永続先へ落とした。
- `services.md` — git が所有する実体（worktree 登録）と、こちらが所有する実体（run record）の境界を引いた。

測定 ref: HEAD `d0287bb87`。

## 前置き

本ユニットに業務ドメインは存在しない。ここで「エンティティ」と呼ぶのは、**run 準備が扱う実体**である。本書の主目的は、**並列化によって「どこに存在する状態か」が変わる実体を特定すること**である。

## 実体の一覧

| 実体 | 型 / 値域 | 所在 | ライフサイクル |
|---|---|---|---|
| **member** | `leader` / `engineer-1`〜`engineer-6` | シェル変数（列挙） | `members_for "$TEAM_SIZE"` が返す。run の生存期間 |
| **RUN_ID** | `<YYYYMMDD>-<HHMMSS>-<hex4>` または `$TEAM_RUN_ID` | シェル変数 | `create_run` が生成（`:1278`）。run の生存期間 |
| **RUN_ROOT** | `$BASE/runs/$RUN_ID`（ディレクトリ） | **ファイルシステム** | `:1280` で組立、`:1285` で `mkdir -p`。run の生存期間 |
| **RUN_RECORD** | `$INSTANCE_DIR/runs/$RUN_ID`（ディレクトリ） | **ファイルシステム** | 同上 |
| **worktree** | `$RUN_ROOT/<member>`（ディレクトリ + git 登録） | **ファイルシステム + git** | `git worktree add`（`:1305`）で作成、`git worktree remove` で除去 |
| **member メタデータ** | `$RUN_RECORD/members/<member>/{path,branch}` | **ファイルシステム** | `:1307-1309` で書き出し |
| **`CREATED_MEMBERS`** | スペース区切りの member 名 | **親シェルのメモリ** | `:1392` で初期化、`:1306` で追記、`:1244` で読取 → **廃止**（BR-P6） |
| **`RUN_PREPARING`** | 0 / 1 | 親シェルのメモリ | `:1286` で 1、成功後 0。`handle_exit` がロールバック要否の判定に使う |
| **`WORKTREE_PARALLELISM`** | 4（固定） | シェル定数 | **新設**（BR-P1） |

## 並列化で所在が変わる実体

これが本ユニットの核心である。

| 実体 | 現行の所在 | 並列化後 | 理由 |
|---|---|---|---|
| `CREATED_MEMBERS` | 親シェルのメモリ | **廃止** | サブシェル内で追記しても親へ届かない（bash のサブシェルは変数を返さない） |
| member メタデータ | ファイルシステム | **ファイルシステムのまま。サブシェル内で書く** | ファイル書込はサブシェル境界を越えて残る。各メンバーのパスは互いに非交差 |
| worktree | ファイルシステム + git | **同左。サブシェル内で作る** | 同上 |
| ロールバック対象 | `CREATED_MEMBERS`（メモリ） | **`RUN_ROOT` 配下の実在走査**（ファイルシステム） | ADR-3。メモリからファイルシステムへ張り替える |

**設計の一言**: 並列化で失われるのは「親シェルのメモリに載った状態」だけである。ファイルシステム上の実体はすべて残るため、**メモリ上の台帳をファイルシステムの観測に置き換える**ことで並列化が成立する。

## 実体間の不変条件

| ID | 不変条件 | 対応ルール |
|---|---|---|
| INV-P1 | `RUN_ROOT` は run 専用のディレクトリであり、他の run と混ざらない | `:1280` の `$BASE/runs/$RUN_ID`、`:1282` の衝突検査（`:1283` は `RUN_RECORD` 側） |
| INV-P2 | `RUN_ROOT` 直下の member 名ディレクトリの集合 ⊆ `members_for "$TEAM_SIZE"` の集合 | BR-P9（走査範囲の限定） |
| INV-P3 | 各メンバーの `RUN_RECORD/members/<member>/` は互いに非交差である | BR-P4（サブシェル内書込が成立する根拠） |
| INV-P4 | `create_run` が成功した ⇔ 全メンバーの worktree が `RUN_ROOT` 配下に実在する | BR-P3、BR-P14 |
| INV-P5 | ロールバック後、`RUN_ROOT` と `RUN_RECORD` は存在しない | BR-P12、現行 `:1250` の無条件 `rm -rf` |

**INV-P2 は安全性の要**である。走査範囲を誤ると無関係な worktree を消しうる。

**INV-P3 は BR-P4（サブシェル内でメタデータを書く）が成立する根拠**である。破れると並列書込が競合する。

## 廃止される実体

| 実体 | 現在地 | 廃止理由 |
|---|---|---|
| `CREATED_MEMBERS` | `:1244`（読取）/ `:1306`（追記）/ `:1392`（初期化） | 並列化でサブシェル境界を越えられない。**`RUN_ROOT` 実在走査へ置換**（ADR-3、BR-P6） |

互換のための別名・フォールバックは残さない（NFR-8）。

## 外部が所有する実体

| 実体 | 所有者 | 本ユニットでの関わり |
|---|---|---|
| git の worktree 登録（`.git/worktrees/`） | **git** | `worktree add` / `worktree remove` で操作。**並列実行しても失敗しない**（feasibility 実測: 全並列度で成功 7/7、stderr 0 bytes）が、並列度を上げすぎるとスループットが劣化する |
| git のブランチ | **git** | `worktree add -b` で作成、ロールバック時に `branch -D` |

git のロック競合は**失敗にならない**ため、リトライ機構は不要（`services.md` の git 契約 — 「並列実行しても失敗しないが、並列度を上げすぎるとスループットが劣化する」）。必要なのは並列度の上限だけである。
