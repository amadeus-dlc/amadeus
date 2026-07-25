# Scalability Requirements — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`

- `business-logic-model.md` — 並列化後のフローと並列度別の実測表を引いた。
- `business-rules.md` — BR-P1〜BR-P20 のうち該当するものを各要件の根拠 ID とした。
- `requirements.md` — FR-6〜FR-8 / NFR-1 / NFR-4〜NFR-8 を本ステージで具体化する対象とした。
- `technology-stack.md` — 「bash のジョブ制御で賄える範囲、外部の並列化ユーティリティ導入は要さない」という確認を前提とした。

測定 ref: HEAD `811961123`。

## 対象のスケール軸

**チームのメンバー数**のみ。`-2` / `-4` / `-6` により 3人 / 5人 / 7人に限定され、無制限のスケールは存在しない。

## SC-1: メンバー数に対する所要時間の伸び

| 構成 | 直列（現行） | 並列度4（U2 後） | 出典 |
|---|---|---|---|
| 3人 | 約3.2秒 | 約1.6秒 | **推定**（7人実測 7.39秒 / 3.32秒 からの線形按分。未実測） |
| 5人 | 約5.3秒 | 約2.4秒 | **推定**（同上。未実測） |
| 7人 | **7.39秒** | **3.32秒** | **実測**（feasibility の並列度スイープ） |

**実測は7人構成のみ**である。3人・5人の値は 7人実測からの線形按分による推定であり、受け入れ基準には使わない（合否判定は P-1 / P-3 の実測値ベースで行う）。

直列はメンバー数に線形。並列度4では、メンバー数が4以下なら全員同時、5以上なら2バッチになる（5人なら 4+1、7人なら 4+3）。

## SC-2: 並列度がメンバー数に追随しない

| 項目 | 内容 |
|---|---|
| 要求 | `WORKTREE_PARALLELISM` は**固定値4**であり、メンバー数に応じて変えない（BR-P1、ADR-4） |
| 根拠 | 並列度7（= 7人構成でメンバー数ぶん fan-out）は 7.55秒 で直列より遅い。メンバー数に追随させると最大構成で退行する |
| 検証 | 定数であること |

**「メンバー数ぶん並列にする」が最も自然に見えて最も遅い**、というのが実測の結論である。

## SC-3: リポジトリ規模への依存

| 項目 | 内容 |
|---|---|
| 実測環境 | tracked 11,051ファイル、`.git` 166M |
| 依存性 | worktree 作成時間はリポジトリ規模に比例する。本リポジトリでの**1個あたりの実測**は 1.153909 / 1.067943 / 1.013304 秒（3回、単独実行）で平均 **1.078秒**。直列7個の実測 7.39秒 から割り戻すと **1.056秒/個**（7.39 ÷ 7）で、単独実行より僅かに速い（キャッシュ効果） |
| 要求 | 並列度の上限はリポジトリ規模に依存しない固定値とする |
| 根拠 | 最適並列度を決めるのは I/O とロックの競合であり、リポジトリ規模ではない |

## 非対象

| 項目 | 理由 |
|---|---|
| 8人以上のチーム | 構成が `-2` / `-4` / `-6` の3択に限定されている |
| 複数チームの同時起動 | `--instance` で分離される既存機能。本ユニットは変更しない。ただし**別チームが同時に worktree を作ると git のロック競合が増える**可能性はあり、これは実測外（RAID R-6 に類する） |
| 動的な並列度算出（CPU コア数等） | 実測が macOS のみで動的式の妥当性を検証できない（ADR-4 の Alternatives Rejected） |
| 水平スケール・ロードバランシング | 常駐サービスの軸であり CLI に該当しない（`cid:nfr-design:c1`） |
