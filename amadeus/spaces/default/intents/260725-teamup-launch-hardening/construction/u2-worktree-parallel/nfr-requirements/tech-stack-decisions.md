# Tech Stack Decisions — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`

- `business-logic-model.md` — 並列化後のフローと並列度別の実測表を引いた。
- `business-rules.md` — BR-P1〜BR-P20 のうち該当するものを各要件の根拠 ID とした。
- `requirements.md` — FR-6〜FR-8 / NFR-1 / NFR-4〜NFR-8 を本ステージで具体化する対象とした。
- `technology-stack.md` — 「bash のジョブ制御で賄える範囲、外部の並列化ユーティリティ導入は要さない」という確認を前提とした。

測定 ref: HEAD `811961123`。

## 結論

**新規の技術選択はない。** `technology-stack.md` が明記するとおり、**U2 の並列化は bash のジョブ制御（`&` / `wait`）で賄える範囲**であり、外部の並列化ユーティリティ（GNU parallel、xargs -P 等）の導入は要さない。

## 使用する技術と選択理由

| 技術 | 用途 | 選択理由 |
|---|---|---|
| **bash のジョブ制御**（`&` / `wait`） | worktree 作成の並列化 | 対象が既存 bash スクリプト。並列度4という小さな上限を実現するのに外部ツールは過剰 |
| **git** | `worktree add` / `worktree remove` | 既存。並列呼び出しでも失敗しないことを実測済み（`services.md`） |
| **ファイルシステム** | ロールバック対象の再導出（`RUN_ROOT` 走査） | 台帳（親シェルのメモリ）の代替。サブシェル境界を越えて残る唯一の状態 |
| **Bun test（integration 層）** | テスト | 実 FS・プロセスを使うため（`cid:code-generation:fs-tests-integration-first`） |

## 検討して採らなかった選択

| 案 | 却下理由 |
|---|---|
| GNU parallel / `xargs -P` | 外部依存の追加になる。`technology-stack.md` の「新規ランタイム依存なし」方針に反し、bash のジョブ制御で足りる |
| 成功集合を一時ファイルで親へ回収する | 集約機構が新たな障害点になる（一時ファイルの作成失敗・競合書込）。台帳と実体の乖離という失敗様式も残る（ADR-3） |
| `git worktree list` の出力を parse してロールバック対象を決める | `RUN_ROOT` 配下の実ディレクトリ走査で足り、git のコマンド出力形式への依存を増やす理由がない。孤児ディレクトリ（git 未登録）も拾えない（ADR-3） |
| CPU コア数ベースの動的並列度 | 実測が macOS のみで動的式の妥当性を検証できない（ADR-4） |
| ロック競合へのリトライ機構 | 実測で失敗ゼロ。存在しない問題への対策になる |

## 定数の技術的根拠

| 定数 | 値 | 根拠 |
|---|---|---|
| `WORKTREE_PARALLELISM` | **4** | feasibility の並列度スイープ実測（直列 7.39秒 / 並列度4 3.32秒 / 並列度7 7.55秒）。ADR-4、BR-P2 |

実測根拠をコメントとして定数の直上に記す（BR-P2、`cid:requirements-analysis:constants-from-code`）。

## 配布への影響

正本の変更は `bun scripts/package.ts` と `bun run promote:self` で dist 6面 + self-install 4面 = 計11コピーへ伝播する（BR-P19）。

**U1 が先に着地しているため、着手時に `origin/main` から再接地する**（BR-P20）。定数ブロックへの追記が U1 の `WATCHER_READY_TIMEOUT` 付近と競合しうるため、union 解消 → 再生成 → 検証再実行の手順を踏む（`cid:code-generation:shared-ledger-insert-collision`）。
