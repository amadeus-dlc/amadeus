# Logical Components — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/performance-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/security-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/scalability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/reliability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/tech-stack-decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`

- `business-logic-model.md` — 主フローと制御フローを引き、各論理コンポーネントの責務境界を確定した。
- `performance-requirements.md` — P-3（タイムアウト値）と P-4（判定コスト）を、定数コンポーネントと判定コンポーネントの制約とした。
- `reliability-requirements.md` — R-2 / R-3（失敗とスキップの表明）を、診断コンポーネントの責務とした。
- `scalability-requirements.md` — SC-1 / SC-3 を、判定コンポーネントと導出コンポーネントの性質（一定コスト・純関数）とした。
- `security-requirements.md` — S-1（注入耐性）を、導出コンポーネントの実装制約とした。
- `tech-stack-decisions.md` — bash のみで実装する方針を引き、新設コンポーネントを関数1つに限定した。

測定 ref: HEAD `138a60372`。

## 論理コンポーネント一覧

対象は bash スクリプトであり、論理コンポーネント = **シェル関数と定数**として扱う。

| # | コンポーネント | 種別 | 責務 | 状態 |
|---|---|---|---|---|
| C-1 | `member_bootstrap_prompt` | 純関数（**新設**） | member → 起動プロンプトの導出。`MSG_BACKEND` に応じて actas 形または空文字を返す | 新規 |
| C-2 | `member_role` | 純関数 | member → role の導出（`leader` / `e1`〜`e6`） | **不変** |
| C-3 | `watcher_verification_applies` | 述語 | 検証の適用可否。C-1 を代表 role で1回呼ぶ | 判定入力を変更 |
| C-4 | `WATCHER_SKIP_ANNOUNCED` | ラッチ変数 | スキップ通知を run ごと1回に閉じる | **不変** |
| C-5 | `verify_watchers_armed` | 待機ループ | 全メンバーの sentinel を共有ポーリングし、未 armed へ再送する | **本体不変**。再送プロンプトの導出のみ C-1 経由へ |
| C-6 | `WATCHER_READY_TIMEOUT` | 定数 | 1ラウンドの待機上限 | 90 → **60** |
| C-7 | `WATCHER_RESEND_MAX` | 定数 | 再送回数の上限 | **不変**（1） |
| C-8 | `clear_stale_watcher_sentinels` | 前処理 | ペイン起動前に stale sentinel を消す | **不変**（位置も不変） |
| C-9 | 診断出力（`:1209-1211`） | 出力 | 未 armed のメンバー名・原因・回復手順 | 文面と回復プロンプトを更新 |
| C-10 | 検証呼び出しブロック（`:1477-1480`） | 制御フロー | `watcher_status` の初期化と検証の実行 | **`mux_attach` の後ろへ移動** |
| C-11 | `CLAUDE_MONITOR_PROMPT` | 定数 | — | **廃止**（C-1 が置換） |

## 依存関係

```
C-2 member_role（不変）
  ↑
C-1 member_bootstrap_prompt（新設・純関数）
  ↑          ↑              ↑                ↑
claude_    C-3 述語      C-5 の再送      C-9 診断出力
member_cmd    ↑
           C-4 ラッチ
              ↑
           C-10 呼び出しブロック → C-5 待機ループ
                                      ↑
                                  C-6 / C-7 定数
```

**C-1 が唯一の新設**であり、4つの消費者すべてが一方向にこれへ依存する。循環はない。

## 各コンポーネントの契約

### C-1: `member_bootstrap_prompt`

| 項目 | 内容 |
|---|---|
| 入力 | member 名（`leader` / `engineer-1`〜`engineer-6`） |
| 出力 | `MSG_BACKEND=agmsg` → `/agmsg actas <role>` / それ以外 → 空文字 |
| 副作用 | なし（stdout のみ） |
| 実装制約 | `printf '/agmsg actas %s' "$role"` — フォーマット指定子で値を渡す（`security-design.md` D-S1） |
| 不変条件 | 出力の `" actas "` の有無が role に依存しない（ADR-2、テストで固定） |

### C-3: `watcher_verification_applies`

| 項目 | 内容 |
|---|---|
| 判定 | `RUNTIME=claude` かつ `MSG_BACKEND=agmsg` かつ C-1(`leader`) が `" actas "` を含む |
| コスト | メンバー数に依存しない（C-1 を1回だけ呼ぶ） |
| 副作用 | 偽のとき C-4 のラッチ経由で stderr へ1回だけ通知 |

### C-6: `WATCHER_READY_TIMEOUT`

| 項目 | 内容 |
|---|---|
| 値 | **60**（現行 90 から縮小） |
| 根拠 | 実測 32.2秒 の約1.86倍。7人同時起動での負荷とホスト状態の変動を吸収するマージン |
| コメント | 実測値と選定理由を定数の直上に記す（`cid:requirements-analysis:constants-from-code`） |

### C-10: 検証呼び出しブロック

| 項目 | 内容 |
|---|---|
| 移動先 | run record 確定（`:1484-1492`）の後 |
| 含むもの | `watcher_status=0` の初期化行（`:1477`）を含めて移す |
| 移さないもの | `start_safety_wait_supervisors`（`:1482`）は位置不変 |

## 廃止されるコンポーネント

| コンポーネント | 置換 |
|---|---|
| C-11 `CLAUDE_MONITOR_PROMPT` | C-1 `member_bootstrap_prompt`（定数 → 導出関数） |

互換のための別名・フォールバックを残さない（`org.md` Forbidden）。消費者13件は2キー grep で全数是正する（`reliability-design.md` D-R7）。

## 新設しないもの

| 項目 | 理由 |
|---|---|
| プロンプトの表・キャッシュ | 純関数で導出でき、状態を持つ理由がない（ADR-1） |
| 通知経路 | 検証結果は既存の exit code と stderr で表明する |
| リトライ機構 | `WATCHER_RESEND_MAX` の既存再送で足りる |
| 並列化機構 | 共有ポーリングが既に最大値で待つ構造（`scalability-design.md` D-SC2） |

## U2 との適用順序（U1 実装時の前提）

本ユニットは U2（worktree 並列化）の**前**に着地する（`delivery-planning/bolt-plan.md`）。U1 は先着のため再接地は不要だが、以下に留意する。

- U1 が定数ブロック（`WATCHER_READY_TIMEOUT` の `:108` 付近）を変更するため、後着の U2 が `WORKTREE_PARALLELISM` を同領域へ追加する際に textual conflict が起きうる。**解消は U2 側の責務**（`cid:code-generation:shared-ledger-insert-collision`）。
- U1 は `create_run`（`:1267-1311`）と `rollback_prepared_run`（`:1241-1251`）に**触れない**。行域は非交差である。
