# Logical Components — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/performance-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/security-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/scalability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/reliability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/tech-stack-decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`

- `business-logic-model.md` — 並列化後のフロー（4a〜4d）と、台帳をやめる理由を引き、各論理コンポーネントの責務境界を確定した。
- `performance-requirements.md` — P-3（上限4）を、並列制御コンポーネントの制約とした。
- `reliability-requirements.md` — R-1〜R-8 を、ロールバック・照合・報告コンポーネントの責務とした。
- `security-requirements.md` — S-1（範囲限定）を、走査コンポーネントの実装制約とした。
- `scalability-requirements.md` — SC-2（メンバー数に追随しない）を、定数コンポーネントの性質とした。
- `tech-stack-decisions.md` — bash のジョブ制御のみで実装する方針を引き、新設を定数1つと制御構造に限定した。

測定 ref: HEAD `138a60372`。

## 論理コンポーネント一覧

| # | コンポーネント | 種別 | 責務 | 状態 |
|---|---|---|---|---|
| C-P1 | `WORKTREE_PARALLELISM` | 定数（**新設**） | 同時実行数の上限（4） | 新規 |
| C-P2 | worktree 生成ループ | 制御フロー | メンバーごとの作成をバッチ並列で発行 | **直列 → 並列** |
| C-P3 | メンバー処理サブシェル | 実行単位 | `git worktree add` + メタデータ書込 + 失敗報告 | 新規（現行はループ本体） |
| C-P4 | 完了照合 | 検証（**新設**） | 全メンバーの worktree が **git に正規登録されているか**を照合し成否を返す | 新規（台帳の代替） |
| C-P5 | `rollback_prepared_run` | 巻き戻し | 対象を `RUN_ROOT` 実在走査で再導出して除去 | 対象決定ロジックを変更 |
| C-P6 | 末尾の `rm -rf`（`:1250`） | 巻き戻し | `RUN_ROOT` / `RUN_RECORD` の除去。孤児ディレクトリもカバー | **不変** |
| C-P7 | `handle_exit` | トラップ | `RUN_PREPARING` を見て C-P5 を呼ぶ | **不変** |
| C-P8 | `members_for` | 純関数 | メンバー集合の列挙 | **不変**（C-P4 / C-P5 が照合に使う） |
| C-P9 | `CREATED_MEMBERS` | 状態 | — | **廃止**（C-P4 / C-P5 が置換） |

## 依存関係

```
C-P8 members_for（不変）
  ↑                    ↑
C-P4 完了照合      C-P5 ロールバック（実在走査）
  ↑                    ↑
C-P2 生成ループ    C-P7 handle_exit（不変）
  ↑        ↑
C-P1 定数  C-P3 サブシェル
                       ↑
                  C-P6 rm -rf（不変）
```

**C-P9（`CREATED_MEMBERS`）を介した C-P2 → C-P5 の状態依存が消える。** 両者は `RUN_ROOT` という共有された観測対象を介してのみ関係する。

## 各コンポーネントの契約

### C-P1: `WORKTREE_PARALLELISM`

| 項目 | 内容 |
|---|---|
| 値 | **4**（固定） |
| 根拠 | feasibility の並列度スイープ実測。コメントで実測表を示す |
| 性質 | メンバー数・リポジトリ規模に依存しない |

### C-P2: worktree 生成ループ

| 項目 | 内容 |
|---|---|
| 責務 | メンバーごとに C-P3 をバッチ並列で発行し、全完了を待つ |
| 制約 | 同時実行数が C-P1 を超えない |
| 実装 | bash のジョブ制御（`&` / カウンタ / `wait`）。外部ユーティリティ不要 |
| 台帳 | **追記しない**（C-P9 廃止） |

### C-P3: メンバー処理サブシェル

| 項目 | 内容 |
|---|---|
| 責務 | `git worktree add` → `RUN_RECORD/members/<member>/{path,branch}` の書込 |
| 失敗時 | メンバー名とパスを**1行**で stderr へ出し、非ゼロで終了 |
| 制約 | 共通ファイルへ書かない（S-2 / D-S2） |

### C-P4: 完了照合（新設）

| 項目 | 内容 |
|---|---|
| 責務 | 全ジョブ完了後、`members_for` の全メンバーについて `RUN_ROOT/<member>` が **`git worktree list --porcelain` に登録されているか**を照合 |
| 出力 | 1つでも欠けていれば `create_run` が非ゼロで返る |
| 判定基準 | **ディレクトリの有無では不十分**。`git worktree add` はディレクトリ作成後の checkout 段階で失敗しうるため、git 登録を見る（`reliability-design.md` D-R4 の実測表） |
| 設計理由 | サブシェルの終了コードを個別に取る代わりに、**実体を観測**する。C-P5 と同じ原理で一貫し、追加の状態を持たない |

### C-P5: `rollback_prepared_run`

| 項目 | 内容 |
|---|---|
| 対象決定 | `RUN_ROOT` 直下を走査し、`members_for` の集合と一致する名前のみ |
| 範囲限定 | 起点・名前・深さの3層（`security-design.md` D-S1） |
| 末尾 | C-P6（`rm -rf`）を維持 |

## 廃止されるコンポーネント

| コンポーネント | 置換 |
|---|---|
| C-P9 `CREATED_MEMBERS` | C-P4（成否判定）と C-P5（ロールバック対象）が実在観測で置換 |

互換のための別名・フォールバックを残さない（`org.md` Forbidden）。

## 新設しないもの

| 項目 | 理由 |
|---|---|
| 成功集合の集約機構（一時ファイル・FIFO） | C-P4 の実在照合で足りる。集約機構は新たな障害点になる（ADR-3） |
| リトライ機構 | git のロック競合は失敗にならない（実測） |
| 外部並列化ユーティリティ | bash のジョブ制御で足りる（`tech-stack-decisions.md`） |
| 進捗表示・ログファイル | 要求にない（`org.md` Forbidden の要求外機構） |

## U1 との適用順序（U2 実装時の前提）

本ユニットは U1（actas 移行）の**後**に着地する（`delivery-planning/bolt-plan.md`）。着手時に `origin/main` から再接地し、以下を実行する。

1. `bun scripts/package.ts` / `bun run promote:self` で配布11コピーを再生成
2. `bun run dist:check` / `bun run promote:self:check` の exit 0 を確認
3. **本書の行番号は U1 の変更でシフトしている**ため、実ファイルで再解決する（`cid:reverse-engineering:upstream-cite-reresolve-on-shift`）
4. 消費者の grep（D-R8）を**再実行**して全数を確定する

U1 が定数ブロック（`WATCHER_READY_TIMEOUT` 付近）を触り、U2 が `WORKTREE_PARALLELISM` を同領域へ追加するため、**定数ブロックの textual conflict が起きうる**（`cid:code-generation:shared-ledger-insert-collision`）。union 解消後に再生成する。
