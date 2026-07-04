# Infrastructure Design Questions: U002-subagent-status-audit

## Q1. Deployment boundary

U002 の deployment boundary をどこに置くか。

- A. 新しい cloud service として切り出す。
- B. hook 専用 daemon として常駐させる。
- C. message queue を介して非同期処理にする。
- D. dashboard service に分類処理を寄せる。
- E. 既存 `.agents/aidlc/tools` と hook integration の in-process helper として扱う。

[Answer]: E

## Q2. Evidence service

U002 の evidence service をどう扱うか。

- A. 新しい database に保存する。
- B. 新しい event stream に送る。
- C. 既存 audit event 名を変更する。
- D. old row を migration で書き換える。
- E. `SUBAGENT_COMPLETED` の additive field と reader normalization に閉じる。

[Answer]: E

## Q3. Monitoring boundary

Subagent outcome の monitoring をどう扱うか。

- A. free text classifier で outcome を推測する。
- B. transcript 全文を telemetry attribute に入れる。
- C. `tool_input.status` を trusted source にする。
- D. stdout JSON command に診断文を出す。
- E. trusted top-level status、3 状態 outcome、low-cardinality summary に限定する。

[Answer]: E

## Q4. CI/CD guardrail

U002 の CI/CD guardrail をどう構成するか。

- A. cloud deploy を必須にする。
- B. IaC scan を必須にする。
- C. old row を自動 migration する。
- D. manual review だけにする。
- E. success、failure、unknown、old/new row、stdout JSON、audit append failure の deterministic fixture を必須にする。

[Answer]: E

## Q5. Secrets and compliance

U002 の message excerpt と agent id をどう扱うか。

- A. transcript 全文を保存する。
- B. last assistant message を分類 source にする。
- C. agent id を無制限に表示する。
- D. secret を含む可能性のある text をそのまま出す。
- E. message excerpt を最小化し、classification source から除外し、secret を標準出力に出さない。

[Answer]: E

## Q6. Scaling policy

U002 の scaling policy をどう扱うか。

- A. database sharding を設計する。
- B. queue-based decoupling を導入する。
- C. horizontal scaling を設計する。
- D. event 名を増やして downstream 分岐を増やす。
- E. hook payload 単体の O(1) field access と 1000 rows normalization fixture で制御する。

[Answer]: E

## Ambiguity Analysis

すべての回答は E であり、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components` と矛盾しない。

U002 は deployable service ではなく、`components`、`services`、`business-logic-model` が定義する Evidence Recording Service と Subagent Status helper の範囲で扱う。

追加 follow-up は不要である。
