# Reliability Requirements — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`

- `business-logic-model.md` — 並列化後のフロー、並列度別の実測表、状態遷移（部分作成からの回復）を引いた。
- `business-rules.md` — BR-P1〜BR-P20 のうち非機能に関わるもの（BR-P1/P5 の並列度と時間、BR-P10 の部分失敗、BR-P13〜15 の失敗報告）を各要件の根拠とした。
- `requirements.md` — FR-6〜FR-8 / NFR-1 / NFR-4〜NFR-8 を本ステージで具体化する対象とした。
- `technology-stack.md` — 「U2 の並列化は bash のジョブ制御（`&` / `wait`）で賄える範囲であり、外部の並列化ユーティリティ導入は要さない」という確認を、技術選択の前提とした。

測定 ref: HEAD `811961123`。

## R-1: 部分失敗からの完全な回復（最重要）

| 項目 | 内容 |
|---|---|
| 要求 | 一部の `git worktree add` が失敗したとき、**成功した worktree がすべて巻き戻される** |
| リスク | 並列化で `add` 成功 ⇒ 台帳登録 の暗黙依存がサブシェル境界で切れる（`business-logic-model.md`） |
| 実現 | ロールバック対象を `RUN_ROOT` 配下の**実在走査**で再導出する（BR-P8、ADR-3）。台帳を親へ回収しない |
| 検証 | **失敗注入で実証**（BR-P10）。feasibility では失敗が0件で未観測（RAID R-4） |

**これが U2 の主要な正しさリスク**である。並列化そのものは実測で失敗ゼロだが、失敗したときの回復は未検証のまま設計している。

## R-2: ロールバックの完全性

| 項目 | 内容 |
|---|---|
| 要求 | ロールバック後、`RUN_ROOT` と `RUN_RECORD` が残らない（BR-P12） |
| 実現 | 現行 `rollback_prepared_run` の末尾にある無条件 `rm -rf -- "$RUN_ROOT" "$RUN_RECORD"`（`:1250`）を維持する |
| 検証 | 失敗注入後のディレクトリ不在 |

## R-3: 孤児ディレクトリの除去

| 項目 | 内容 |
|---|---|
| 要求 | `git worktree add` が途中失敗して git 登録されていない残骸も除去される（BR-P11） |
| 実現 | `git worktree remove` は効かないが、R-2 の無条件 `rm -rf`（`:1250`）がカバーする。**追加実装は不要** |
| 検証 | この行が残っていることの確認 |

## R-4: 走査範囲の安全性

| 項目 | 内容 |
|---|---|
| 要求 | 走査は `RUN_ROOT` **直下の member 名ディレクトリ**に限定し、`members_for "$TEAM_SIZE"` の集合と突き合わせる（BR-P9、INV-P2） |
| リスク | 範囲を誤ると**無関係な worktree を消しうる** |
| 検証 | 走査対象の検査。`RUN_ROOT` 外に影響しないこと |

**これは破壊的操作の安全性要件**であり、R-1 より優先度が高い（誤って消す方が、消し残すより有害）。

## R-5: 失敗の可視性

| 項目 | 内容 |
|---|---|
| 要求 | どのメンバーの worktree 作成が失敗したかが**エラー出力から一意に特定できる**（BR-P13） |
| リスク | 並列実行では複数サブシェルの stderr が交錯する |
| 検証 | 複数失敗時の出力（BR-P15） |

## R-6: 失敗の伝播

| 項目 | 内容 |
|---|---|
| 要求 | 1つでも失敗すれば `create_run` は**非ゼロで返る**（BR-P14） |
| リスク | サブシェルの終了コードが親へ自動では伝わらない |
| 検証 | 失敗注入時の戻り値、および `handle_exit` 経由でロールバックが走ること |

## R-7: git のロック競合に対する耐性

| 項目 | 内容 |
|---|---|
| 実測 | 全並列度（2/3/4/7）で成功 7/7、stderr 0 bytes。**ロック競合による失敗はゼロ** |
| 帰結 | **リトライ機構は不要**。必要なのは並列度の上限だけ |
| 根拠 | `services.md` の git 契約 |

## R-8: メタデータの完全性

| 項目 | 内容 |
|---|---|
| 要求 | 並列実行後、全メンバー分の `RUN_RECORD/members/<member>/{path,branch}` が揃っている（BR-P4） |
| 実現 | サブシェル内で書く。各メンバーのパスは互いに非交差（INV-P3）でファイル書込はサブシェル境界を越えて残る |
| 検証 | 並列実行後のメタデータ実在確認 |

## R-9: 既存テストの非退行

| 項目 | 内容 |
|---|---|
| 要求 | `bash tests/run-tests.sh --ci` が exit 0 |
| リスク | `CREATED_MEMBERS` の廃止（3消費者） |
| 実現 | grep 出力からの転記で全数確定（BR-P7）。**実装時に再実行**（U1 の変更で行番号がシフトするため） |

## 非対象

| 項目 | 理由 |
|---|---|
| SLO / エラーレート / 可用性パーセンテージ | 単発実行の CLI に該当しない |
| リトライ・サーキットブレーカ | R-7 のとおりロック競合は失敗にならないため不要 |
| 部分成功の許容（一部だけ起動する） | 現行の全か無かの契約を維持する。中途半端な run は利用者を混乱させる |
