# Business Rules — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-story-map.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-methods.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/services.md`

- `unit-of-work.md` — U2 の完了の定義を、各ルールの検証条件へ落とした。
- `unit-of-work-story-map.md` — US-5〜US-7 の Then 節を、ルールの期待結果とした。
- `requirements.md` — FR-6〜FR-8 / NFR-1 / NFR-4〜NFR-8 を各ルールの根拠 ID とした。
- `components.md` — 改変 / 廃止のコンポーネント境界を、ルールの適用対象とした。
- `component-methods.md` — 並列化の契約（同時実行数上限・失敗報告・メタデータ書込の所在）を BR-P1〜BR-P4 へ落とした。
- `services.md` — git の契約（並列 `worktree add` は失敗しないが劣化する）を BR-P2 の根拠とした。

測定 ref: HEAD `d0287bb87`。各ルールは実装が満たすべき不変条件であり、テストで固定する。

## 並列実行のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-P1 | worktree 作成の同時実行数は **`WORKTREE_PARALLELISM`（= 4）を超えない** | FR-6、ADR-4 | 同時に走るプロセス数の観測、または実装構造の検査 |
| BR-P2 | `WORKTREE_PARALLELISM` の値は feasibility の実測に接地する。実測根拠をコメントに記す | ADR-4、`cid:requirements-analysis:constants-from-code` | 値の assert とコメントの存在 |
| BR-P3 | 全メンバーの worktree が作成される（成功時） | FR-6 | 7人構成で 7/7 の実在確認 |
| BR-P4 | メンバーごとの `RUN_RECORD` メタデータ書込（`mkdir -p "$RUN_RECORD/members/$m"` と `path` / `branch`、現行 `:1307-1309`）は**サブシェル内で行う** | `component-methods.md`。各メンバーのパスは互いに非交差で、ファイルシステム書込はサブシェル境界を越えて残る | 並列実行後に全メンバー分のメタデータが揃っていること |
| BR-P5 | 7人構成の worktree 作成が **3.3秒前後**（直列 7.39秒 に対し）| FR-6、NFR-1 | 実測 |

**BR-P1 の「上限」が要件の核心**である。無制限 fan-out（並列度7）は実測 7.55秒 で直列 7.39秒 より遅く、退行になる。

## 台帳廃止のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-P6 | `CREATED_MEMBERS` を**完全に廃止**する（追記 `:1306` / 読取 `:1244` / 初期化 `:1392`）。互換のための別名・フォールバックを残さない | ADR-3、NFR-8（`org.md` Forbidden） | `grep` で不在を確認 |
| BR-P7 | 廃止に伴う消費者は `grep -rn "CREATED_MEMBERS" packages/framework/core/tools/team-up.sh tests/ scripts/ docs/` の**出力からの転記**で全数を確定する。既存表からの複製をしない | `cid:application-design:dual-key-consumer-inventory`、U1 の functional-design で同じ棚卸しが3度是正された実測 | 実装時に grep で残存 0 を確認 |

現時点の実測（HEAD `d0287bb87`）では `CREATED_MEMBERS` の消費者は **3件**（`team-up.sh:1244` / `:1306` / `:1392`）で、`tests/` `scripts/` `docs/` に消費者は存在しない。**実装時に再実行して確定すること**（U1 の変更で行番号がシフトするため）。

## ロールバックのルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-P8 | ロールバック対象は **`RUN_ROOT` 配下の worktree 実在走査**で再導出する。子→親の状態共有機構を新設しない | FR-7、ADR-3 | 実装構造の検査 |
| BR-P9 | 走査範囲は `RUN_ROOT` **直下の member 名ディレクトリ**に限定し、`members_for "$TEAM_SIZE"` の集合と突き合わせる | ADR-3 の Consequences（無関係な worktree を消さない） | 走査対象の検査 |
| BR-P10 | **部分失敗**（一部の `add` が失敗）でも、成功した worktree がすべて巻き戻される | FR-7 | **失敗注入で実証**（RAID R-4） |
| BR-P11 | 孤児ディレクトリ（`add` が途中失敗して git 未登録の残骸）も除去される | ADR-3 | 現行 `:1250` の無条件 `rm -rf -- "$RUN_ROOT" "$RUN_RECORD"` がカバー。**追加実装は不要**だが、この行（`:1250`）を残すことを確認する |
| BR-P12 | ロールバック後、`RUN_ROOT` と `RUN_RECORD` が残らない | FR-7 | 失敗注入後のディレクトリ不在 |

**BR-P10 が U2 の主要な正しさリスク**である。feasibility の実験では失敗が発生せず未観測のため、失敗注入が必須（`org.md` Mandated の落ちる実証と同じ趣旨）。

## 失敗報告のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-P13 | worktree 作成に失敗したメンバーが**エラー出力から一意に特定できる** | FR-8、US-7 | 失敗注入時の stderr にメンバー名が含まれること |
| BR-P14 | 1つでも失敗すれば `create_run` は**非ゼロで返る** | FR-8 | 失敗注入時の戻り値 |
| BR-P15 | 並列実行で stderr が交錯しても、どの行がどのメンバーのものか判別できる | FR-8 | 複数失敗時の出力 |

## 変更しないもののルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-P16 | `create_run` の手順1〜3（ベースコミット解決、`RUN_ID` 決定、run メタデータ書き出し。現行 `:1268-1302`）は**変更しない** | FR-6 のスコープ | diff の範囲 |
| BR-P17 | `handle_exit`（`:1253`）は変更しない。`rollback_prepared_run` を呼ぶ側であり、呼ばれる側の対象決定ロジックのみ変える | `components.md` | diff の範囲 |
| BR-P18 | U1 が触る関数（`claude_member_cmd` / `watcher_verification_applies` / `verify_watchers_armed` / 検証呼出）に**触れない** | `components.md` の U1/U2 コンポーネント表が両ユニットの対象関数を分離している。行域の非交差は実ファイルで検証可能（U1 = `:860-894` / `:1092-1102` / `:1174-1213` / `:1477-1480`、U2 = `:1241-1251` / `:1267-1311`） | diff の範囲 |

## 配布のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-P19 | 正本 `packages/framework/core/tools/team-up.sh` を編集し、dist 6面 + self-install 4面 = 計11コピーを同一変更で同期する | NFR-4、`project.md` Mandated | `dist:check` / `promote:self:check` の exit 0 |
| BR-P20 | U1 が先に着地しているため、着手時に `origin/main` から再接地する。**定数ブロックの textual conflict に注意**（U1 が `:104` / `:108` 付近を、U2 が `WORKTREE_PARALLELISM` を同領域へ追加する） | `cid:code-generation:code-generation:base-advance-regrounding`、`cid:code-generation:shared-ledger-insert-collision` | rebase 後の再生成と検証再実行 |

**BR-P20 により、U2 実装時の行番号は本書の値から変わる。** 実装時に実ファイルで再解決すること（`cid:reverse-engineering:upstream-cite-reresolve-on-shift`）。
