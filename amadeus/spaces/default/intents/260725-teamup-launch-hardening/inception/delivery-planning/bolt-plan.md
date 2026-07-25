# Bolt Plan — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-dependency.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-story-map.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `requirements.md` — FR-1〜FR-8 / NFR-1〜NFR-8 を各 Bolt の完了条件へ割り当てた。
- `components.md` — 各 Bolt が触るコンポーネントの一覧を引き、変更面と配布同期の範囲を確定した。
- `unit-of-work.md` — 2ユニットの作業項目・規模見積り（数値）・完了の定義をそのまま Bolt へ写した。
- `unit-of-work-dependency.md` — 依存辺ゼロと「唯一の交差点は配布同期」という判定を、順序と直列化の根拠とした。
- `unit-of-work-story-map.md` — US-1〜US-7 を各 Bolt の利用者価値の確認軸とした。特に US-2 が U1 内の順序制約である点を Bolt 1 の内部順序へ反映した。
- `team-practices.md` — 検証コマンド群・配布同期・落ちる実証・PR 単位の実務を、各 Bolt の Definition of Done へ組み込んだ。

測定 ref: HEAD `304bae2eb`。

## Bolt 構成

**2 Bolt、直列。** 各 Bolt = 1 Unit = 1 PR（intent-capture Q1 = A、`org.md` Way of Working の Bolt 単位 PR）。

walking-skeleton のセレモニーは**適用しない**。本 intent のスコープは `amadeus-feature` だが、変更対象は既存の bash スクリプトへの改変であり、ブートストラップすべき新パッケージ・新配布経路を持たない（`project.md` § Walking Skeleton: greenfield 要素を含む intent でのみスケルトンを立てる）。

---

## Bolt 1: U1 — actas 移行と待機設計（#1476、P1 / S2-CRITICAL）

### 内部順序（US-2 の順序制約による）

| # | 作業 | 根拠 |
|---|---|---|
| 1 | **B-3: 検証を `mux_attach` の後ろへ移す**（`:1477-1480` → `:1483` の後、コメント `:1473-1476` の更新を含む） | **先頭に置く。** actas 移行より先に入れておけば、検証が再有効化されても起動レイテンシが退行する窓を作らない（ADR-5 / US-2） |
| 2 | B-1: `member_bootstrap_prompt` の新設と `CLAUDE_MONITOR_PROMPT`（`:104`）の廃止 | ADR-1。4参照点をこの関数経由へ移す |
| 3 | B-2: 初期プロンプトを `/agmsg actas <role>` へ移行 | FR-1。`delivery.sh set monitor`（`:876-879`（`if [ -f "$DELIVERY" ]` 〜 `fi`、実行行は `:877`））は維持 |
| 4 | NFR-2: `WATCHER_READY_TIMEOUT`（`:108`）を実測 32.2秒 に接地した値へ縮小 | Q1 裁定 A |
| 5 | 診断メッセージ2行（`:1210-1211`）の更新 | FR-1, FR-2 |
| 6 | B-5: テスト構造の是正（`t-team-up-watcher-arming.test.ts` の `:3` / `:172` / `:207`、`t294-...` の `:55` / `:61` / `:75` / `:97`、モード差検証の追加） | FR-5。消費者棚卸し（2キー・11消費者）に従う |
| 7 | 配布同期（正本 → dist 6面 + self-install 4面） | NFR-4 |

### 規模

正本 約48行増 / 約13行減、テスト 約55行増 / 約22行減（`unit-of-work.md` の数値見積り）。

### Definition of Done

- 実 launch で全メンバーの sentinel が出現し、検証が成功して **exit 0**。
- アタッチ到達時間が現行 **5.87秒**（3人構成）から悪化しない。
- スクリプトの全寿命が `WATCHER_READY_TIMEOUT × (WATCHER_RESEND_MAX + 1)` を超えない（NFR-1）。
- actas 排他ロックの検証（NFR-3）: (a) 7メンバー同時起動で競合による起動失敗が起きない、(b) 再起動（`-c`）でロック残存が起動を塞がない。
- 「monitor では sentinel が書かれない / actas では書かれる」というモード差を検証するテストが存在する（FR-5）。
- 落ちる実証（NFR-6）: 対象ファイル限定の `git checkout <fix-sha> -- <path>` で pre-fix 面を再現し、新規テストが赤くなることを実測（stash 不使用）。
- `bun run typecheck` / `lint` / `dist:check` / `promote:self:check` / `bash tests/run-tests.sh --ci` がすべて **exit 0**。
- PR を作成し、CI green・レビュー成立を確認のうえ**ユーザー承認を得てからマージ**（`no-AI-merge`）。

---

## Bolt 2: U2 — worktree 並列化（#1478、P2）

### 内部順序

| # | 作業 | 根拠 |
|---|---|---|
| 1 | B-6: `WORKTREE_PARALLELISM=4` の新設と worktree 生成ループの並列化（`:1303-1310`） | ADR-4。実測の最適値 |
| 2 | B-7: `rollback_prepared_run`（`:1241-1251`）の対象を実在走査へ、`CREATED_MEMBERS`（`:1306` / `:1392`）を廃止 | ADR-3 / FR-7 |
| 3 | B-8: 失敗メンバーの報告 | FR-8 |
| 4 | 新規テスト（並列度上限・部分失敗のロールバック・失敗報告） | NFR-7 |
| 5 | 再接地と配布同期 | Bolt 1 が先に着地しているため、`origin/main` から rebase し dist / self-install を再生成 |

### 規模

正本 約44行増 / 約14行減、テスト 約90行増。

### Definition of Done

- 7個の worktree 作成が **3.3秒前後**（直列 7.39秒 に対し）。
- 同時実行数が **4 を超えない**。
- 部分失敗時に成功した worktree がすべて巻き戻される（**失敗注入で実証** — FR-7 / RAID R-4）。
- どのメンバーが失敗したかがエラー出力から一意に特定できる（FR-8）。
- 落ちる実証（NFR-6）。
- 検証5コマンドがすべて exit 0。
- PR を作成し、ユーザー承認を得てからマージ。

---

## Bolt 間の調整

依存辺はゼロだが、**同一ファイル `team-up.sh` の11コピーを両 Bolt が触る**ため直列化する（`cid:code-generation:c6`）。

Bolt 2 着手時の定型手順（`cid:code-generation:code-generation:base-advance-regrounding`）:

1. `origin/main` を fetch し merge-base を実測。
2. Bolt 1 着地後の main へ rebase。
3. **定数ブロックの textual conflict に注意** — Bolt 1 が `:104` / `:108` 付近を、Bolt 2 が `WORKTREE_PARALLELISM` を同領域へ追加する（`cid:code-generation:shared-ledger-insert-collision` の同型）。union 解消後に再生成。
4. `bun scripts/package.ts` / `bun run promote:self` を再実行し、`dist:check` / `promote:self:check` の exit 0 を確認。
5. 全検証コマンドを再実行。

## 自律性モード

ソロモード運用のため、**各 Bolt はゲート付きで実行する**。Bolt 1 の完了後にユーザーの承認を得てから Bolt 2 へ進む。`Construction Autonomy Mode` は `gated`。
