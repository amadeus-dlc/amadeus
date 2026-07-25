# Unit of Work — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-methods.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/services.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-dependency.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`

- `components.md` — U1 / U2 のコンポーネント表（触る関数と対応要件）を、そのままユニット境界の根拠とした。
- `component-methods.md` — 各関数の契約と「廃止に伴う消費者の棚卸し」（2キー・11消費者）を、ユニットの作業項目へ展開した。
- `services.md` — 外部サービス（agmsg / herdr / git）との契約変化を引き、ユニットが外部へ与える影響範囲を確定した。
- `component-dependency.md` — U1/U2 の行域が非交差であること、唯一の交差点が配布同期であることを引き、独立出荷の根拠とした。
- `decisions.md` — ADR-1〜5 を各ユニットの設計制約として引き継いだ。
- `requirements.md` — FR-1〜FR-8 / NFR-1〜NFR-8 を各ユニットの受け入れ基準へ割り当てた。

測定 ref: HEAD `5c06db654`。規模見積りは実ファイルの行域と変更内容からの算出（`inception.md` § Architecture Standards が要求する**数値による規模の正当化**）。

## ユニット分割の方針

**2ユニット**とする。分割の根拠は `component-dependency.md` が示す**行域の非交差**であり、両者は独立に deployable である（`cid:units-generation:c1`）。

各ユニット単独で利用者価値が成立することも確認した。U1 は「#1384 の保護が実際に働く」、U2 は「起動がさらに速くなる」で、どちらも片側だけでは価値が出ない検出/記録のような組ではない。

---

## U1: actas 移行と待機設計（#1476、P1 / S2-CRITICAL）

### 目的

初期プロンプトを `/agmsg actas <role>` へ移行して ready sentinel が実際に書かれるようにし、**同時に**検証を `mux_attach` の後ろへ移して起動レイテンシの退行を防ぐ。あわせてテスト構造を是正する。

### 作業項目と規模見積り

| 項目 | 対象 | 変更行数（見積り） |
|---|---|---|
| `member_bootstrap_prompt` の新設 | `team-up.sh`（`:104` 付近） | +12 / −3（定数の廃止を含む） |
| `claude_member_cmd` の `init_prompt` 取得 | `:861` | ±2 |
| `watcher_verification_applies` の判定入力 | `:1092-1102` | ±4 |
| 再送のプロンプト導出 | `:1202` | ±2 |
| 診断メッセージ2行 | `:1210-1211` | ±6 |
| ヘッダコメントの更新 | `:87-91`, `:102-103` | ±8 |
| 検証呼び出しの移動 | `:1477-1480` → `:1483` の後 | ±10（移動 + コメント `:1473-1476` の更新） |
| `WATCHER_READY_TIMEOUT` の縮小 | `:108` | ±4（値 + 根拠コメント） |
| `t-team-up-watcher-arming.test.ts` の是正 | `:3` / `:172` / `:207` + モード差検証の追加 | +40 / −10 |
| `t294-team-up-watcher-applicability.test.ts` の是正 | `:55` / `:61` / `:75` / `:97` | +15 / −12 |
| 配布物の再生成 | dist 6面 + self-install 4面 | 生成（手書きなし） |

**正本の変更見積り: 約48行増 / 約13行減。テスト: 約55行増 / 約22行減。**

### 受け入れ基準

FR-1（actas プロンプト）、FR-2（単一の導出関数）、FR-3（検証を attach 後へ）、FR-4（exit code 保持 + コメント更新）、FR-5（テスト構造の是正）、**NFR-1（起動レイテンシ — スクリプトの全寿命が `WATCHER_READY_TIMEOUT × (WATCHER_RESEND_MAX + 1)` を超えない。両定数とも U1 の変更対象）**、NFR-2（タイムアウトの実測接地）、NFR-3（actas 排他ロックの検証）、NFR-4〜NFR-8。

### 完了の定義

- 実 launch で全メンバーの sentinel が出現し、検証が成功する（exit 0）。
- アタッチ到達時間が現行 5.87秒（3人構成）から悪化しない。
- 「monitor モードでは sentinel が書かれない / actas モードでは書かれる」というモード差を検証するテストが存在する。
- **actas 排他ロックの検証（NFR-3）**: (a) 7メンバー同時起動でロック競合による起動失敗が発生しないことを実測する、(b) 異常終了後の再起動（`-c`）でロック残存が起動を塞がないことを確認する。
- **スクリプトの全寿命（NFR-1）**が `WATCHER_READY_TIMEOUT × (WATCHER_RESEND_MAX + 1)` を超えない。
- `bun run typecheck` / `lint` / `dist:check` / `promote:self:check` / `tests/run-tests.sh --ci` がすべて exit 0。

### 単独 deployable か

**Yes.** U2 に依存しない。着地すれば #1384 の保護が実際に働くようになり、それ自体が利用者価値である。

---

## U2: worktree 並列化（#1478、P2）

### 目的

`create_run` の `git worktree add` を並列度4で並列化し、起動時間の支配項を削る。

### 作業項目と規模見積り

| 項目 | 対象 | 変更行数（見積り） |
|---|---|---|
| `WORKTREE_PARALLELISM` 定数の新設 | `team-up.sh`（定数群） | +6（値 + 実測根拠コメント） |
| worktree 生成ループの並列化 | `:1303-1310` | +20 / −8 |
| `CREATED_MEMBERS` の廃止 | `:1306` / `:1392` | −2 |
| `rollback_prepared_run` の対象再導出 | `:1241-1251` | +12 / −4 |
| 失敗メンバーの報告 | 並列ループ内 | +6 |
| 新規テスト（並列度上限・部分失敗のロールバック・失敗報告） | `tests/integration/` | +90 |
| 配布物の再生成 | dist 6面 + self-install 4面 | 生成（手書きなし） |

**正本の変更見積り: 約44行増 / 約14行減。テスト: 約90行増。**

### 受け入れ基準

FR-6（並列度4）、FR-7（実在走査によるロールバック）、FR-8（失敗メンバーの特定）、NFR-1（レイテンシ）、NFR-4〜NFR-8。

### 完了の定義

- 7個の worktree 作成が 3.3秒前後（直列 7.39秒 に対し）。
- 同時実行数が4を超えない。
- 部分失敗時に成功した worktree がすべて巻き戻される（**失敗注入で実証**）。
- どのメンバーが失敗したかがエラー出力から一意に特定できる。
- 検証5コマンドがすべて exit 0。

### 単独 deployable か

**Yes.** U1 に依存しない。着地すれば起動時間が短縮され、それ自体が利用者価値である。

---

## 既存インフラの再利用棚卸し（reuse inventory）

`inception.md` § Architecture Standards の要求により、新規機構を導入しない根拠を示す。

| 必要な機能 | 既存で代替 | 新規導入 |
|---|---|---|
| プロンプトの role 解決 | `member_role`（`:896-901`、既存・不変） | なし |
| メンバー集合の列挙 | `members_for`（既存） | なし |
| worktree のロールバック | `rollback_prepared_run`（`:1241-1251`、既存）+ 末尾の無条件 `rm -rf`（`:1250`） | なし（対象決定ロジックのみ差し替え） |
| テスト実行基盤 | `tests/run-tests.sh` の integration プロファイル | なし |
| シェル関数の単体駆動 | `TEAM_UP_LIB_ONLY=1` source シーム（既存、t294 が使用） | なし |
| 配布同期 | `bun scripts/package.ts` / `bun run promote:self` | なし |
| ドリフト検査 | `bun run dist:check` / `promote:self:check` | なし |

**新規に導入するのは関数1つ（`member_bootstrap_prompt`）と定数1つ（`WORKTREE_PARALLELISM`）のみ**。CI ジョブ・テストランナー・外部ツールの新設はない。

## adapter・外部契約の先行着地について

`inception.md` は「adapter・外部契約の先行着地は禁止 — 実装+配線が同一 intent に揃う場合のみ導入する」と定めている。

本 intent では **`member_bootstrap_prompt` の実装と4つの呼び出し元への配線が U1 内に揃う**。`WORKTREE_PARALLELISM` も定義と使用が U2 内に揃う。先行着地する dormant な契約面はない。
