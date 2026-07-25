# Performance Requirements — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`

- `business-logic-model.md` — 並列化後のフロー、並列度別の実測表、状態遷移（部分作成からの回復）を引いた。
- `business-rules.md` — BR-P1〜BR-P20 のうち非機能に関わるもの（BR-P1/P5 の並列度と時間、BR-P10 の部分失敗、BR-P13〜15 の失敗報告）を各要件の根拠とした。
- `requirements.md` — FR-6〜FR-8 / NFR-1 / NFR-4〜NFR-8 を本ステージで具体化する対象とした。
- `technology-stack.md` — 「U2 の並列化は bash のジョブ制御（`&` / `wait`）で賄える範囲であり、外部の並列化ユーティリティ導入は要さない」という確認を、技術選択の前提とした。

測定 ref: HEAD `811961123`。数値はすべて feasibility の実測からの転記。

## 対象の性能特性

本ユニットの性能は **worktree 作成に要する wall-clock 時間**で測る。これは起動時間の支配項であり、U1 着地後は残余時間の大半を占める。

## P-1: worktree 作成時間（最重要）

| 構成 | 現行（直列） | U2 後の要求 |
|---|---|---|
| 7人（leader + engineer×6） | **7.39秒** | **3.3秒前後** |
| 3人（leader + engineer×2） | 約3.2秒 | 約1.5秒前後 |

測定方法: 同一リポジトリ（tracked 11,051ファイル、`.git` 166M）で `create_run` の worktree 生成ループの wall-clock。

## P-2: 並列度と所要時間の関係（実測）

| 並列度 | 所要時間（7個作成） | 判定 |
|---|---|---|
| 1（直列） | 7.39秒 | ベースライン |
| 2 | 4.88秒 | 改善 |
| 3 | 4.03秒 | 改善 |
| **4** | **3.32秒** | **最適**（再現性 3.32 / 3.72 / 3.61） |
| 7（無制限） | **7.55秒** | **退行**（直列より遅い） |

**並列度7が直列より遅い**のは、git が object store で直列化するため全プロセスがロックを奪い合いスループットが劣化するからである。

## P-3: 並列度の上限

| 項目 | 値 |
|---|---|
| 要求 | `WORKTREE_PARALLELISM` = **4**（固定）。同時実行数がこれを超えない（BR-P1） |
| 根拠 | P-2 の実測（ADR-4） |
| 検証 | 実装構造の検査、または同時プロセス数の観測 |

**「上限があること自体」が要件の核心**である。最適値を外しても、上限があれば無制限 fan-out の退行（7.55秒）は防げる。

## P-4: 起動全体への寄与

| 項目 | 値 |
|---|---|
| 前 intent の実測（3人構成、アタッチ到達） | 5.87秒 |
| うち worktree 作成 | 約3.2秒（**約55%**） |
| U2 後の見込み | 約1.5秒（3人構成）→ アタッチ到達 約4.2秒 |

## 非対象

| 項目 | 理由 |
|---|---|
| `create_run` の手順1〜3（ベースコミット解決、`RUN_ID` 決定、run メタデータ書出） | 変更対象外（BR-P16）。実測でも支配的でない |
| git 自体の worktree 作成速度 | 外部依存。こちらから短縮できない。並列化で**重ねる**のが解 |
| Linux CI 上の特性 | 実測は macOS/APFS のみ（RAID R-6）。上限設計で吸収する方針であり、CI での最適化は本ユニットの要件に含めない |
| スループット・同時接続数・キャッシュ効率 | 常駐サービスの指標であり CLI に該当しない（`cid:nfr-design:c1`） |
