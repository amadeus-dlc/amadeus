# Design Decisions (ADR) — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/component-inventory.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `requirements.md` — FR-2 / FR-3 / FR-7 の受け入れ基準を、各 ADR の Decision と Consequences の検証軸とした。
- `architecture.md` — sentinel の生成条件、`mux_attach` の非ブロッキング性、単一定数から導出関数への形の変化を、各 ADR の Context の実測根拠とした。
- `component-inventory.md` — 既存コンポーネントの登録を引き、Alternatives Rejected の「既存で代替できるか」の判定に用いた。
- `team-practices.md` — canonical 1定義原則と `org.md` Forbidden（要求外機構の追加禁止）を、各 ADR の制約とした。

測定 ref: HEAD `0b0c6e20a`。

---

## ADR-1: bootstrap プロンプトを単一定数から単一の導出関数へ変える

### Context

`CLAUDE_MONITOR_PROMPT`（`:104`）は引数を持たないハード定数で、`:102-103` が「bootstrap プロンプトの単一ソース」という不変条件を宣言している。4箇所（`:861` / `:1094` / `:1202` / `:1211`）から参照される。

actas プロンプトは `/agmsg actas <role>` の形で **role を要する**（`spawn.sh:358`、main の `codex_member_cmd`）。定数のままでは role を含められない。

### Decision

**`member_bootstrap_prompt <member>` を新設し、定数を廃止する。** 4参照点はすべてこの関数を経由する。

### Consequences

- 「単一ソース」不変条件は保たれる（形が定数 → 関数へ変わるのみ）。`construction.md` § Code Completeness の canonical 1定義原則に適合。
- `watcher_verification_applies` は member 文脈を持たないため、代表 role で導出する（ADR-2 参照）。
- 定数を env で上書きしていた運用があれば壊れる。ただし `:104` は `${VAR:-default}` 形を取らない**上書き不能なハード定数**であり、そのような運用は存在しない（実測確認済み）。

### Alternatives Rejected

| 案 | 却下理由 |
|---|---|
| 定数を `/agmsg actas` のプレフィクスだけにし、呼び出し側で role を連結する | 文字列組立が4箇所に散り、canonical 1定義原則に反する。プロンプト形の変更時に4箇所の同期が要る |
| 定数を連想配列にして member → prompt を保持する | **技術的には可能**（対象は `#!/usr/bin/env bash` の bash スクリプトで、配列・`local`・`[[ ]]`・`$RANDOM` を既に使用）。却下理由は移植性ではなく**状態を持つ必要がないこと**: プロンプトは member から純粋に導出でき、事前構築した表を保持すると (a) member 集合の変化（`-2`/`-4`/`-6`）に追従する初期化コードが要る、(b) 表の構築時点と参照時点で `MSG_BACKEND` が変わりうる（`resolve_msg_backend` は起動途中で解決される）ため、導出時に評価する関数の方が正しい |
| `CLAUDE_MONITOR_PROMPT` を残しつつ actas 用の第2定数を足す | 「単一ソース」が2つになり、どちらが有効かの分岐が新たな欠陥面になる。`org.md` Forbidden の二重実装 |

---

## ADR-2: 適用可否判定は代表 role（`leader`）で導出したプロンプトを見る

### Context

`watcher_verification_applies`（`:1092-1102`）は launch 経路から2回呼ばれる（`:1461` stale sentinel クリア前、`:1478` 検証前）が、いずれも**member 文脈を持たない**。ADR-1 でプロンプトが member 依存になると、この述語は「どの member のプロンプトを見るか」を決める必要がある。

### Decision

**`member_bootstrap_prompt leader` の出力を判定に使う。**

根拠となる不変条件: `member_bootstrap_prompt` は role をフォーマット文字列に埋めるだけで、判定に使う `" actas "` の有無は **role に依存しない**。したがってどの member で導出しても判定結果は同一である。

### Consequences

- 判定は決定的で、member 数や構成に依存しない。
- 上記の不変条件が破れる変更（例: 特定 role だけ別形式のプロンプトにする）を入れると判定が壊れる。**この不変条件をテストで固定する**（FR-5 の受け入れ基準に含める）。

### Alternatives Rejected

| 案 | 却下理由 |
|---|---|
| 全 member 分を導出して全一致を確認する | 判定コストが member 数に比例し、得られる保証は同一（不変条件により結果が同じ）。過剰 |
| 述語に member 引数を足し、呼び出し側でループする | 呼び出し2点はどちらも「この run 全体で検証が適用されるか」を問うており、member ごとの適用可否は概念として存在しない。引数を足すと呼び出し側に無意味なループを強いる |
| `MSG_BACKEND` だけで判定し、プロンプト形を見ない | PR #1477 が入れた「起動プロンプトが実際に actas watcher を arm するか」という適用可否ガードの意味を失う。#1476 が未着地の中間状態で誤って検証が有効化される |

---

## ADR-3: ロールバック対象を台帳ではなく worktree 実在走査で再導出する

### Context

現行は `git worktree add` 成功（`:1305`）の直後に `CREATED_MEMBERS` へ追記（`:1306`）する**同一シェルの連続2行**で台帳を作り、`rollback_prepared_run`（`:1241-1251`）が `:1244` でそれを読む。

FR-6 で worktree 作成を並列化すると、各 `add` はサブシェルで走るため、そこでの変数追記は親プロセスへ届かない。この暗黙依存が切れる。

### Decision

**ロールバック対象を `RUN_ROOT` 配下の worktree 実在走査で再導出し、`CREATED_MEMBERS` を廃止する。**

### Consequences

- 子→親の状態共有機構（一時ファイル・FIFO 等）を新設せずに済む（`org.md` Forbidden の要求外機構の追加を避ける）。
- 「台帳と実体の乖離」という失敗様式そのものが消える。部分失敗（一部の `add` が途中で落ちた）でも実体を見るため取りこぼさない。
- ロールバックが `RUN_ROOT` の内容に依存するようになる。`RUN_ROOT` は `create_run` が組み立て（`:1280`、verbatim: `  RUN_ROOT="$BASE/runs/$RUN_ID"`）、`mkdir -p` で作る（`:1285`）run 専用ディレクトリであり、他の run と混ざらない。
- **走査の対象範囲を誤ると無関係な worktree を消しうる**。走査は `RUN_ROOT` 直下の member 名ディレクトリに限定し、`members_for "$TEAM_SIZE"` の集合と突き合わせる。

### Alternatives Rejected

| 案 | 却下理由 |
|---|---|
| 成功集合を一時ファイルで親へ回収する | 集約機構が新たな障害点になる（一時ファイルの作成失敗・競合書き込み）。台帳と実体の乖離という失敗様式も残る |
| 並列化せず直列のまま台帳を維持する | FR-6（7.39秒 → 3.3秒前後）を満たせない |
| `git worktree list` の出力を parse して対象を決める | `RUN_ROOT` 配下の実ディレクトリ走査で足り、git のコマンド出力形式への依存を増やす理由がない。なお**孤児ディレクトリ**（`add` が途中失敗して git 登録されていない残骸）は `worktree remove` が効かないが、現行 `rollback_prepared_run` はループ後に無条件で `rm -rf -- "$RUN_ROOT" "$RUN_RECORD"` を実行しており（`:1250`）、既にカバーされている。追加の実装は不要 |

---

## ADR-4: 並列度を固定値4とし、動的算出しない

### Context

feasibility の実測（同一リポジトリ、tracked 11,051ファイル、`.git` 166M、7個作成）:

| 並列度 | 所要時間 |
|---|---|
| 1（直列） | 7.39秒 |
| 2 | 4.88秒 |
| 3 | 4.03秒 |
| **4** | **3.32秒**（再現性 3.32 / 3.72 / 3.61） |
| 7（無制限） | **7.55秒** |

並列度7は直列より遅い。git が object store で直列化するため、無制限 fan-out はスループットを劣化させる。

### Decision

**`WORKTREE_PARALLELISM=4` の固定値とする。**

### Consequences

- 実装が単純で、挙動が環境によらず予測可能。
- 実測は macOS/APFS のみ。Linux CI や異なるディスク特性では最適値が違いうる（RAID R-6）。定数化により環境差は吸収されないが、**上限があること自体**が退行（並列度7）を防ぐ主目的である。
- 将来 CI 上で明確な劣化が観測されれば、その実測に基づいて値を見直す。

### Alternatives Rejected

| 案 | 却下理由 |
|---|---|
| CPU コア数ベースの動的上限（`min(4, ncpu/2)` 等） | 実測が macOS のみで動的式の妥当性を検証できない。実測に接地しない数値を導入しない（`cid:requirements-analysis:constants-from-code`）。式が正しいという根拠がないまま複雑さだけ増える |
| 無制限 fan-out（メンバー数ぶん同時） | 実測 7.55秒 で直列 7.39秒 より遅い。改善どころか退行 |
| 環境変数で上書き可能にする | 要求されていない設定面の追加（`org.md` Forbidden）。必要になった時点で足せばよい |

---

## ADR-5: 検証を `mux_attach` の後ろへ移し、タイムアウトを実測へ接地する

### Context

RE の実測により `mux_attach`（`:513-515`、verbatim: `  open -na Ghostty --args -e "$HERDR" session attach "$1"`）は**非ブロッキング**であり、`:1483` の後も `:1484-1496` が実行され `:1497` の `exit "$watcher_status"` に到達する。`:1473-1476` のコメント「an interactive attach would swallow it」は現行実装で成立しない。

一方 feasibility の実測で、sentinel 出現には **32.2秒/1メンバー**（Claude Code のコールドスタート含む）を要する。検証を `mux_attach` 前に置いたままだと、前 intent（PR #1477）が 200.85秒 → 5.87秒 として解消した起動レイテンシ問題が復活する。

### Decision

**検証を `mux_attach` の後ろへ移し、あわせて `WATCHER_READY_TIMEOUT` を 90 から実測 32.2秒 に接地した値へ縮小する。**

### Consequences

- アタッチは worktree 作成時間（U2 着地後は 3.3秒前後）で完了し、利用者は即座に作業を開始できる。
- exit code は保たれる（`mux_attach` 非ブロッキングのため）。
- スクリプトは attach 後も検証のあいだ生存する。最悪寿命は `WATCHER_READY_TIMEOUT × (WATCHER_RESEND_MAX + 1)` で、縮小により 180秒 → 120秒 前後になる。呼出元シェルのプロンプト復帰がその分遅れる。
- `:1473-1476` のコメントを事実に合わせて更新する必要がある（FR-4）。

### Alternatives Rejected

| 案 | 却下理由 |
|---|---|
| 検証を `mux_attach` の前に残し、タイムアウトだけ縮める | 正常系でも数十秒のブロッキングが残る。実測 32.2秒 は「正常系の値」であり、待てば必ず短縮されるものではない |
| 完全にバックグラウンド化し即座に exit 0 | 検証結果の通知経路を新設する必要がある（`org.md` Forbidden の要求外機構）。exit code が無意味になり、CI 等からの呼び出しで結果を判定できなくなる |
| `WATCHER_RESEND_MAX` も 0 にして1ラウンドにする | #1384 の prompt 脱落回復に最低1回の再送が要る（前 intent E-WTFRA1 の留保 FR-1）。既決裁定を蒸し返さない |
| タイムアウトを現行 90 のまま置く | 実測 32.2秒 に対し根拠の薄い値を残す。`cid:requirements-analysis:constants-from-code` に反する |
