# Requirements — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/intent-capture/intent-statement.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/scope-definition/scope-document.md`、`amadeus/spaces/default/codekb/amadeus/business-overview.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/code-structure.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `intent-statement.md` — 「達成したい状態」3項目（保護を機能させる／起動を短縮する／テスト構造を是正する）を FR の骨格とした。
- `scope-document.md` — In/Out 境界と U1-1〜U1-5 / U2-1〜U2-3 の受け入れ基準の骨子を、下記 FR へ具体化した。
- `architecture.md` — actas 移行後の launch シーケンス、`mux_attach` の非ブロッキング性、`CLAUDE_MONITOR_PROMPT` の単一定数から導出関数への形の変化を引き、FR-1〜FR-5 の設計制約とした。
- `code-structure.md` — U1（`claude_member_cmd` / `watcher_verification_applies` / `verify_watchers_armed`）と U2（`create_run` / `rollback_prepared_run`）の行域が非交差であることを引き、2 PR 分割の根拠とした。
- `business-overview.md` — Team Mode の利用者価値が起動の信頼性と待ち時間にある点を引き、NFR-1 を利用者体験の指標として立てる根拠とした。指標を具体的に「アタッチ到達時間」へ落とす際は `architecture.md`（`mux_attach` の launch シーケンス上の位置）を併せて参照した。
- `team-practices.md` — 検証コマンド群・配布同期・落ちる実証・テスト配置の実務を引き、NFR-4〜NFR-7 とした。

測定 ref: HEAD `bdb5c4068`。file:line は現 HEAD のワークツリー実ファイル直読。**PR #1477 が `team-up.sh:1071` 以降へ23行挿入しているため、ideation 成果物に残る行番号は PR 前の値である**（`cid:reverse-engineering:upstream-cite-reresolve-on-shift`）。本書の行番号はすべて現 HEAD で再解決済み。

## 背景

前 intent（PR #1477、`8729199589`）は watcher arming 検証を既定でスキップさせ起動を 200.85秒 → 5.87秒 にした。しかし #1384 の保護は不在のままで、起動時間の支配項は worktree 直列作成へ移った。

feasibility の実測により、**`delivery mode = monitor`（`team-up.sh:876-879`（実行行 `:877`）が既に設定）+ 初期プロンプト `/agmsg actas <role>`** で ready sentinel が **T+32.2秒** に出現することを実証した。

---

## U1: actas 移行と待機設計（#1476）

### FR-1: 初期プロンプトを actas 形へ移行する

`claude_member_cmd`（`:860-894`）の `init_prompt` を `/agmsg actas <role>` 形にする。role は `member_role()` が返す `leader` / `e1`〜`e6`。

受け入れ基準:
- `MSG_BACKEND=agmsg` かつ `RUNTIME=claude` のとき、各メンバーの初期プロンプトが ` actas ` を含み、role が解決されている。
- `delivery.sh set monitor`（`:876-879`（`if [ -f "$DELIVERY" ]` 〜 `fi`、実行行は `:877`））の呼び出しは**維持される**（actas が watcher を起動する前提条件。claude-code ドライバ `template.md:143` step 5d）。
- `MSG_BACKEND=herdr` では従来どおり初期プロンプトが空（`:881`）。

### FR-2: プロンプトを単一の導出関数から得る

`CLAUDE_MONITOR_PROMPT`（`:104`）は引数を持たない定数で、4箇所（`:861` init_prompt、`:1094` 適用可否ガードの `case`、`:1202` 再送、`:1211` 回復ガイダンス）から参照される。actas 化で role を要するため、`:102-103` が宣言する「bootstrap プロンプトの単一ソース」不変条件は**単一定数では保てず、単一の導出関数（role → prompt）へ形を変える**必要がある。

受け入れ基準:
- プロンプト文字列を組み立てる箇所が**1つの関数に集約**され、上記4参照点がすべてそれを経由する（`construction.md` § Code Completeness の canonical 1定義原則）。
- 手書きの複製がない（`grep` で文字列リテラルの重複が生じていない）。

### FR-3: 検証を `mux_attach` の後ろへ移す

`verify_watchers_armed` の呼び出し（現 `:1478-1480`）を `mux_attach`（`:1483`）の**後ろ**へ移す。

受け入れ基準:
- `mux_attach` までの経路に `WATCHER_READY_TIMEOUT` 由来の待機が存在しない。
- `clear_stale_watcher_sentinels` の呼び出し（`:1461-1463`）は**ペイン起動前のまま**維持する（起動後にクリアすると本物の sentinel を消すため）。
- 実 launch のアタッチ到達時間が現行 5.87秒（3人構成）から悪化しない。

### FR-4: 終了コードの意味づけを保持する

`mux_attach`（`:513-515`、verbatim: `  open -na Ghostty --args -e "$HERDR" session attach "$1"`）は**非ブロッキング**であり、`:1483` の後も `:1484-1496` が実行され `:1497` の `exit "$watcher_status"` に到達する。したがって検証を後ろへ移しても exit code は保たれる。

受け入れ基準:
- 全メンバーが armed になった場合 exit 0、1人でも unarmed なら非ゼロ。
- `:1473-1476` のコメント（「an interactive attach would swallow it」）を**現行実装の事実に合わせて更新**する（`cid:reverse-engineering:comment-premise-verify-not-just-quote`）。

### FR-5: テスト構造を是正する

`tests/integration/t-team-up-watcher-arming.test.ts`（268行）は agmsg をスタブし sentinel をテスト自身が書いている（`:42` パス関数スタブ、`:60` 再送時フェイク arming、`:87-91` 事前配置）。この構造が #1449 の欠陥を導入から2日間 CI で見逃した原因である。

受け入れ基準:
- 「monitor モードでは sentinel が書かれない / actas モードでは書かれる」という**モード差自体を検証**するテストが存在する（必須。この基準を満たさずに完成扱いにしない）。
- sentinel の生成条件（actas モードか否か）を**スタブが写す**。写せない部分が残る場合は、その範囲を特定したうえで「この境界は検証不能」と明示する — ただしこれは上記モード差検証を代替しない（`org.md` Forbidden の検証劇場を避けるため、免責のみで基準を満たすことは認めない）。
- 既存テストの他の検証意図（runtime/backend 軸、再送ロジック）を壊さない。

---

## U2: worktree 並列化（#1478）

### FR-6: `git worktree add` を並列度4で並列化する

`create_run`（`:1267-1311`）の `git worktree add`（`:1305`）を並列化する。**同時実行数の上限は4**。

受け入れ基準:
- 7個の worktree 作成が 3.3秒前後（直列 7.39秒 に対し）。
- 同時実行数が4を超えない（並列度7は 7.55秒 で直列より遅い — feasibility 実測）。
- 全 worktree が作成される（成功 7/7）。

### FR-7: ロールバック対象を worktree 実在走査で再導出する

現行は `add` 成功（`:1305`）の直後に `CREATED_MEMBERS` へ追記（`:1306`）する同一シェルの連続2行に依存し、`rollback_prepared_run`（`:1241-1251`）が `:1244` でそれを読む。並列化するとこの含意がサブシェル境界で切れる。

受け入れ基準:
- ロールバック対象を `RUN_ROOT` 配下の**worktree 実在走査で再導出**する（Q2 裁定 A）。子→親の状態共有機構を新設しない。
- 部分失敗（一部の `add` が失敗）でも、成功した worktree がすべて巻き戻される。
- **失敗注入で実証**する（feasibility の実験では失敗が発生せず未観測 — RAID R-4）。

### FR-8: 失敗メンバーを loud に特定できる

並列実行では stderr が交錯する。

受け入れ基準:
- どのメンバーの worktree 作成が失敗したかがエラー出力から一意に特定できる。
- 失敗時は `create_run` が非ゼロで返り、`handle_exit`（`:1253`）経由でロールバックされる。

---

## 非機能要件

### NFR-1: 起動レイテンシ

- アタッチ到達時間（3人構成、実 launch）が現行 5.87秒 から**悪化しない**。U2 着地後は短縮される。
- スクリプトの全寿命（attach 後の検証を含む）は最悪 `WATCHER_READY_TIMEOUT × (WATCHER_RESEND_MAX + 1)`。

### NFR-2: タイムアウトの実測接地

`WATCHER_READY_TIMEOUT`（現 90、`:108`）を feasibility の実測 **32.2秒/1メンバー** に接地した値へ縮小する（Q1 裁定 A）。

受け入れ基準:
- 新しい値が実測 32.2秒 を安全側に上回る（マージンの根拠をコメントに記す）。
- 値の出典が実測であることが判別できる（`cid:requirements-analysis:constants-from-code`）。
- `WATCHER_RESEND_MAX`（現 1、`:114`）は変更しない（#1384 の prompt 脱落回復に最低1回の再送が要る — 前 intent の裁定）。

### NFR-3: actas 排他ロックの検証

actas は事前クレームで排他ロックを取り、他セッション保持時は **abort** する（`template.md` step 4、`watch.sh:185` `actas_lock_state` / `:203` `actas_lock_claim`）。

受け入れ基準:
- 7メンバー同時起動でロック競合による起動失敗が発生しないことを実測する。
- 異常終了後の再起動（`-c`）でロック残存が起動を塞がないことを確認する。`_actas_lock_try_claim`（`lib/actas-lock.sh:106-133`）は所有 sid の生存を確認して stale 再取得を許すため恒久ブロックはしない見込みだが、**実測で確認**する。

### NFR-4: 配布物の同期

正本 `packages/framework/core/tools/team-up.sh` を編集し、`dist/` 6面 + self-install 4面 = 計11コピーを同一変更で同期する。

受け入れ基準: `bun run dist:check` / `bun run promote:self:check` が exit 0。

### NFR-5: 検証コマンド

`bun run typecheck` / `lint` / `dist:check` / `promote:self:check` / `bash tests/run-tests.sh --ci` がすべて exit 0。exit code はパイプ非経由で捕捉する（`cid:code-generation:no-exit-capture-through-pipe`）。

### NFR-6: 落ちる実証

FR-1〜FR-8 の各ガード・分岐について、修正前は赤・修正後は緑になることを実測する。対象ファイル限定の `git checkout <fix-sha> -- <path>` で切り替え、**stash は使わない**（`cid:code-generation:falling-proof-no-stash`）。注入面はテストが実際に読む面であること（`cid:code-generation:injection-surface-verify`）。

### NFR-7: テスト配置

新規テストは `tests/integration/` 配下（実 FS・プロセスを使うため — `cid:code-generation:fs-tests-integration-first`）。テスト番号は既存最大を実測してから採番する（`cid:code-generation:swarm-test-number-reservation`）。

### NFR-8: 変更の最小性

要求されていない後方互換レイヤー・フォールバック分岐・移行シムを追加しない（`org.md` Forbidden）。U1 と U2 は非交差の関数を触るため、互いのコードに影響しない。

---

## 出荷単位

**2 PR**（intent-capture Q1 = A）。

- **PR-U1**: FR-1〜FR-5、NFR-2、NFR-3。**FR-3（待機位置の変更）を必ず含む** — 欠くと前 intent の成果を失う。
- **PR-U2**: FR-6〜FR-8。

U1 と U2 の唯一の交差点は同一ファイルであることに起因する配布同期であり、**後着 PR 側で `bun scripts/package.ts` / `bun run promote:self` の再実行が要る**。

## トレーサビリティ

| 要件 | 由来 |
|---|---|
| FR-1, FR-2 | Issue #1476、feasibility 実験2（sentinel T+32.2秒）、architecture.md の単一定数→導出関数 |
| FR-3 | feasibility Q1 = A、RE の `:1478-1480` → `:1483` 順序実測 |
| FR-4 | RE の `mux_attach` 非ブロッキング実測、`cid:reverse-engineering:comment-premise-verify-not-just-quote` |
| FR-5 | intent-capture Q3 = A（完了条件にテスト構造の是正を含む） |
| FR-6 | Issue #1478、feasibility Q2 = A（固定上限4）、並列度スイープ実測 |
| FR-7 | requirements Q2 = A（実在走査で再導出）、RAID R-4 |
| FR-8 | scope-document U2-3 |
| NFR-1 | business-overview の利用者価値、前 intent の 5.87秒 実測 |
| NFR-2 | requirements Q1 = A、feasibility 実測 32.2秒 |
| NFR-3 | RAID R-2 |
| NFR-4〜NFR-8 | team-practices.md（project.md / org.md の affirm 済みルール） |

## 未解決事項

なし。Q1/Q2 ともユーザー直接裁定で確定済み。NFR-3 は実装時の実測課題として明示的に要件化した。
