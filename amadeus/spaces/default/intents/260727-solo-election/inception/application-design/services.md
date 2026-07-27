# Services — solo-election

上流入力(consumes 全数): requirements.md(FR-01 の駆動列と異常系 AC)、components.md(責務境界)、component-methods.md(内挿点)、architecture.md(typed directive loop の状態列の実測源)、component-inventory.md(CLI verb 一覧の出典)、team-practices.md(ソロ運用の現行既定 = 降格先の定義)。

## ソロ選挙の実行時サービス構成(プロセス視点)

| 役割 | 実体 | 責務 |
|---|---|---|
| 選挙管理委員 | main agent(conductor セッション) | open(voters=subagent-1/2)→ next 指令追従 → notify で DeliveryDirective 取得 → 2 subagent 起動 → status 票着確認 → report distributed(bookReportedDeliveries が record を mint)→ tally → render → verify。投票はしない |
| 投票者×2 | fresh subagent(Agent tool、各1ターンの独立プロセス) | viewPath の blind view を読み、自前で証拠実測、ballot JSON を作成し vote verb を自身の Bash で実行 |
| 集計・状態機械 | amadeus-election CLI(bun) | 既存 typed directive loop。2体規則は tally 内部(輸送非依存) |
| 人間 | ユーザー | split/ブロック/棄権/再議論後 5 残存の解決 report、および選挙対象外事項の裁定 |

## シーケンス(正常系 2-0)

open → next{distribute} → notify(subagent 既定)→ [spawn subagent-1, spawn subagent-2](並行可)→ 各自 vote → status{pending:0} → report distributed → next{tally-ready} → tally{established} → render → verify → recorded。

## 異常系分岐

- 票未着(1体無応答): 再spawn 1回 → なお未着 → ユーザーエスカレーション(選挙は collecting 保存 — 既存 collect-wait 意味論)。
- split(賛成1・反対1): tally → hold "split" → ユーザー解決(adopted/rejected/reopen)。
- discussion(5×1): hold → discussed 解決 → **同一個体 resume**(相手票の留保・rationale を verbatim 添付)→ amend 提出 → 再 tally → 5 残存ならユーザーへ。
- 棄権(4×1): hold "quorum-short" → ユーザー解決(resume-collecting / close-rejected — 既存語彙)。
- spawn 不能環境: 発動時に loud 1行告知 → 選挙を開かずユーザー裁定へ(FR-10)。
