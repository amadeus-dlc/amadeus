# Business Rules — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-story-map.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-methods.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/services.md`

- `unit-of-work.md` — U1 の完了の定義を、各ルールの検証条件へ落とした。
- `unit-of-work-story-map.md` — US-1〜US-4 の Then 節を、ルールの期待結果とした。
- `requirements.md` — FR-1〜FR-5 / NFR-1〜NFR-3 を各ルールの根拠 ID とした。
- `components.md` — 新設 / 改変 / 廃止のコンポーネント境界を、ルールの適用対象とした。
- `component-methods.md` — `member_bootstrap_prompt` の契約と2キー消費者棚卸しを、BR-6 / BR-7 の具体へ落とした。
- `services.md` — agmsg の契約（delivery mode が前提条件、actas ロックの abort 挙動）を BR-1 / BR-8 の根拠とした。

測定 ref: HEAD `d0287bb87`。各ルールは実装が満たすべき不変条件であり、テストで固定する。

## プロンプト導出のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-1 | `MSG_BACKEND=agmsg` のとき、各メンバーの起動プロンプトは `/agmsg actas <role>` である。`<role>` は `member_role` の出力（`leader` / `e1`〜`e6`） | FR-1 | 全メンバー分のプロンプトを導出し形を検証 |
| BR-2 | `MSG_BACKEND=herdr` のとき、起動プロンプトは**空文字**である | FR-1（現行 `:881` の挙動を保存） | `MSG_BACKEND=herdr` で導出し空を検証 |
| BR-3 | プロンプト文字列を組み立てる箇所は `member_bootstrap_prompt` の**1つだけ**である。4つの参照点（起動コマンド・適用可否判定・再送・回復ガイダンス）はすべてこれを経由する | FR-2、`construction.md` § Code Completeness | `grep` で文字列リテラルの重複がないことを確認 |
| BR-4 | `member_bootstrap_prompt` は**副作用を持たない**（stdout のみ、状態を変えない） | ADR-1 | 連続呼び出しで同一出力 |
| BR-5 | プロンプト形の `" actas "` の有無は **role に依存しない** | ADR-2 の不変条件 | 全 role で導出し、`" actas "` の有無が一致することを検証 |

**BR-5 は ADR-2 の代表 role 判定が成立する前提**である。これが破れると `watcher_verification_applies` の判定が壊れるため、テストで固定する（FR-5 の受け入れ基準）。

## 検証の適用可否のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-6 | 検証が適用されるのは `RUNTIME=claude` **かつ** `MSG_BACKEND=agmsg` **かつ** 導出プロンプトが `" actas "` を含むときのみ | FR-2 | 3条件の組み合わせを網羅 |
| BR-7 | 適用されないときは理由を **stderr へちょうど1回**出す。stdout は触らない | FR-2（no-silent-success）、`cid:code-generation:guard-announcement-callsite-count` | 判定を2回呼んで stderr 1行 / stdout 0 を検証 |

BR-7 の「1回」は、launch 経路がこの述語を2回呼ぶ（stale sentinel クリア前・検証前）ことに由来する。既存の `WATCHER_SKIP_ANNOUNCED` ラッチを維持する。

## 検証の実行順序のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-8 | 検証は `mux_attach` の**後**に実行する | FR-3、ADR-5 | `mux_attach` までの経路に `WATCHER_READY_TIMEOUT` 由来の待機がないこと |
| BR-9 | stale sentinel のクリアは**ペイン起動の前**のまま維持する | FR-3 | 起動後にクリアすると本物の sentinel を消すため。位置を変えない |
| BR-10 | 検証結果は `watcher_status` を通じて **exit code へ反映**される。全員 armed なら 0、1人でも未 armed なら非ゼロ | FR-4 | 両ケースの exit code |
| BR-11 | スクリプトの全寿命は `WATCHER_READY_TIMEOUT × (WATCHER_RESEND_MAX + 1)` を超えない | NFR-1 | 定数の積 |

## 診断出力のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-12 | タイムアウト時、未 armed のメンバー名がすべて表示される | FR-1、US-3 | 一部未 armed のケースで出力を検証 |
| BR-13 | 診断メッセージは actas 移行後の**事実と一致**する。`/agmsg mode monitor` をリテラルで含む記述を残さない | FR-1, FR-2 | `grep` で旧リテラルの不在を確認 |
| BR-14 | 回復ガイダンスは、メンバーごとに**そのメンバーが実行すべきプロンプト**を示す（role が異なるため単一文字列では表せない） | FR-2、US-3 | 複数メンバーが未 armed のケースで出力を検証 |

## 定数のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-15 | `WATCHER_READY_TIMEOUT` は実測 **32.2秒**（1メンバーの arming）を安全側に上回る値である。マージンの根拠をコメントに記す | NFR-2、`cid:requirements-analysis:constants-from-code` | 値の assert とコメントの存在 |
| BR-16 | `WATCHER_RESEND_MAX` は **1 のまま変更しない** | NFR-2（#1384 の prompt 脱落回復に最低1回の再送が要る — 前 intent の裁定） | 値の assert |

## 廃止のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-17 | `CLAUDE_MONITOR_PROMPT` を**完全に廃止**する。互換のための別名・フォールバックを残さない | ADR-1、NFR-8（`org.md` Forbidden） | `grep` で不在を確認 |
| BR-18 | 廃止に伴い、**2つの検索キー**で消費者を全数是正する — (1) 変数名 `CLAUDE_MONITOR_PROMPT`、(2) 展開後のリテラル `/agmsg mode monitor` | `cid:application-design:dual-key-consumer-inventory` | 両キーで repo 全域（配布11コピーを除く）に残存がないこと |

### 消費者の全数（grep 出力からの転記、測定 ref: HEAD `d0287bb87`）

棚卸しは**2つの検索キー**で行う。変数名だけでは、展開後のリテラル文字列に依存する消費者を取りこぼす（`cid:application-design:dual-key-consumer-inventory`）。

**キー1: 変数名** — `grep -rn "CLAUDE_MONITOR_PROMPT\|CREATED_MEMBERS" packages/framework/core/tools/team-up.sh tests/ scripts/ docs/`（**13件**）

| # | 所在 | 内容 | 影響 |
|---|---|---|---|
| 1 | `team-up.sh:104` | 定数定義 | **廃止**（ADR-1） |
| 2 | `team-up.sh:861` | `claude_member_cmd` の `init_prompt` | `member_bootstrap_prompt "$m"` へ |
| 3 | `team-up.sh:1094` | 適用可否ガードの `case` | `member_bootstrap_prompt leader` へ（ADR-2） |
| 4 | `team-up.sh:1202` | 再送 | ループ変数 `$m` から導出 |
| 5 | `team-up.sh:1211` | 回復ガイダンス | メンバーごとに導出（BR-14） |
| 6 | `team-up.sh:1244` | `rollback_prepared_run` の `CREATED_MEMBERS` 読取 | **U2 の対象**（実在走査へ置換） |
| 7 | `team-up.sh:1306` | `CREATED_MEMBERS` 追記 | **U2 の対象**（廃止） |
| 8 | `team-up.sh:1392` | `CREATED_MEMBERS` 初期化 | **U2 の対象**（廃止） |
| 9 | `t-team-up-watcher-arming.test.ts:207` | env 上書きで述語を駆動 | 新実装の駆動方法へ移す |
| 10 | `t294-...test.ts:53` | `printf '%s' "$CLAUDE_MONITOR_PROMPT"` — **既定プロンプトの取得** | `member_bootstrap_prompt` の出力取得へ移す |
| 11 | `t294-...test.ts:61` | env 上書きで述語を駆動 | 同上 |
| 12 | `t294-...test.ts:75` | env 上書き + runtime/backend 軸 | 同上 |
| 13 | `t294-...test.ts:97` | env 上書きで述語を駆動 | 同上 |

**キー2: 展開後のリテラル `/agmsg mode monitor`** — `grep -rn "agmsg mode monitor" packages/framework/core/tools/team-up.sh tests/ scripts/ docs/`（6件）

| # | 所在 | 内容 | 影響 |
|---|---|---|---|
| 1 | `team-up.sh:89` | ヘッダコメント | actas 移行後の事実に合わせる |
| 2 | `team-up.sh:104` | 定数定義（キー1 と重複） | **廃止** |
| 3 | `team-up.sh:1210` | タイムアウト診断メッセージ | 事実に合わせる（BR-13） |
| 4 | `t-team-up-watcher-arming.test.ts:3` | ファイル冒頭コメント | 更新 |
| 5 | `t-team-up-watcher-arming.test.ts:172` | `expect(err).toContain("/agmsg mode monitor")` | **`:1210` の改修で無条件に破綻**。新しい表現に合わせる |
| 6 | `t294-...test.ts:55` | `expect(...).toBe("/agmsg mode monitor")` | `member_bootstrap_prompt` の出力検証へ移す |

`scripts/` と `docs/` に消費者は存在しない（両キーとも 0 hit）。U1 の対象はキー1 の #1〜5・#9〜13 とキー2 の全6件、U2 の対象はキー1 の #6〜8。

## 外部依存のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-19 | `delivery.sh set monitor` の呼び出し（`:876-879`（`if [ -f "$DELIVERY" ]` 〜 `fi`、実行行は `:877`））を**維持する**。actas が watcher を起動する前提条件である | FR-1、`services.md`、feasibility 実験1/2 の対照 | 呼び出しの存在 |
| BR-20 | agmsg（`~/.agents/skills/agmsg/`）を**変更しない** | `services.md`、NFR-8 | 変更ファイル一覧に agmsg が含まれないこと |
| BR-21 | actas 排他ロックの競合（`status=held` で abort）が7メンバー同時起動と resume（`-c`）で起きないことを**実測する** | NFR-3、RAID R-2 | 実 launch での検証 |

## 配布のルール

| ID | ルール | 根拠 | 検証 |
|---|---|---|---|
| BR-22 | 正本 `packages/framework/core/tools/team-up.sh` を編集し、dist 6面 + self-install 4面 = 計11コピーを同一変更で同期する | NFR-4、`project.md` Mandated | `dist:check` / `promote:self:check` の exit 0 |
