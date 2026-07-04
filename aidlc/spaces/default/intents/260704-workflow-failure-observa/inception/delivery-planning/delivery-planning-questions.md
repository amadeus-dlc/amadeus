# Delivery Planning Questions

## 計画方針

### 上流文脈

この段階では、`requirements`、`stories`、`mockups`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices` を入力として扱う。

`requirements` は、R001-R009 と NFR001-NFR006 を定義している。

`stories` は、US001-US009 と Issue #431、#432、#433、#435、OpenTelemetry core 計装の対応を定義している。

`mockups` は、`doctor` standard output、audit evidence、OpenTelemetry core、PR readiness checklist の利用者体験を定義している。

`components` は、Error Audit、Hook Drop Doctor、Telemetry Core、Subagent Status、Conductor Warning、Verification Traceability、Doctor Composition、Shared Contracts を定義している。

`unit-of-work` は、U001、U002、U003 の 3 Unit を定義している。

`unit-of-work-dependency` は、U002 が U001 に依存し、U003 が U001 と U002 に依存する DAG を定義している。

`unit-of-work-story-map` は、US001-US009 を U001、U002、U003 へ割り当てている。

`team-practices` は、最初の Bolt を #431、#432、OpenTelemetry no-op default 計装の縦断 slice にし、同一 worktree 内の Bolt を直列実行し、Construction Autonomy Mode を gated として扱う方針を定義している。

### 制約

この段階は、Unit DAG をもとに Bolt sequence を決める。

Bolt は Construction stages 3.1-3.7 を 1 回通す実行単位である。

Stage 2.7 は topology を作った。

Stage 2.8 は、その topology の中で、どの Bolt が何を証明するかを決める。

## 質問

### Q1. Sequencing heuristic

Bolt sequence の判断軸はどれにしますか。

A. value-first だけにする。

B. risk-first だけにする。

C. WSJF score だけで決める。

D. Unit DAG の順序だけを機械的に採用し、confidence hypothesis を書かない。

E. 推奨: walking-skeleton-first と risk-first の hybrid にする。B001 は U001 を扱い、失敗記録、doctor visibility、OpenTelemetry no-op default を最初に証明する。B002 は U002、B003 は U003 とし、DAG を守る。

X. その他。

[Answer]: E

### Q2. WSJF-style scoring

WSJF-style scoring は使いますか。

A. 詳細な数値モデルを作り、score だけで順序を決める。

B. WSJF は使わず、説明も残さない。

C. job size だけで順序を決める。

D. time criticality だけで順序を決める。

E. 推奨: lightweight な説明用 scoring を使う。value、time criticality、risk reduction、job size を 1-5 で記録し、順序は team-practices と Unit DAG を優先する。

X. その他。

[Answer]: E

### Q3. Bolt granularity

Bolt の粒度はどうしますか。

A. すべての Unit を 1 Bolt にまとめる。

B. 1 Unit を複数の小さな Bolt に分割する。

C. Issue ごとに Bolt を作り、Unit DAG を崩す。

D. Construction 中に都度決めるため、ここでは Bolt を定義しない。

E. 推奨: 1 Unit per Bolt とし、3 Bolts にする。B001=U001、B002=U002、B003=U003 とする。

X. その他。

[Answer]: E

### Q4. Construction execution stance

Construction の実行姿勢はどうしますか。

A. 同一 worktree 内で Bolt を並列実行する。

B. U001 完了前に U002 と U003 を開始する。

C. gate を省略して自律実行する。

D. PR と CI を待たずに次 Bolt へ進む。

E. 推奨: gated かつ sequential にする。同一 worktree 内では Bolt を直列実行し、各 Bolt の検証と PR readiness evidence を残してから次へ進む。

X. その他。

[Answer]: E

### Q5. External dependencies

外部依存はどう扱いますか。

A. 新しい外部 API を必須依存として追加する。

B. OpenTelemetry collector と dashboard を外部依存として追加する。

C. cloud infrastructure approval を必須 gate にする。

D. 外部依存を未確認のまま残す。

E. 推奨: 実装は AI-contained とし、外部依存は GitHub Issue、PR、CI、人間承認 gate だけにする。collector、dashboard、cloud export は optional scope として外に置く。

X. その他。

[Answer]: E

### Q6. Earliest risks

最初に下げるべきリスクはどれにしますか。

A. PR readiness checklist を最初に作ることだけを優先する。

B. subagent status を最初に作ることだけを優先する。

C. conductor warning を最初に作ることだけを優先する。

D. collector や dashboard の用意を最初に優先する。

E. 推奨: B001 で stdout JSON preservation、audit emission recursion、hook drop parsing、OpenTelemetry no-op default no-send を先に検証する。

X. その他。

[Answer]: E

### Q7. Per-Bolt defaults

Bolt ごとの既定内容はどうしますか。

A. Bolt の Definition of Done と confidence hypothesis を後続で未定にする。

B. 全 Bolt に同じ Definition of Done を置く。

C. B001 だけを定義し、B002 と B003 は空欄にする。

D. Unit と Bolt の対応だけを書き、demo を書かない。

E. 推奨: 3 Bolt それぞれに Units、Definition of Done、confidence hypothesis、expected demo を定義する。B001 は `ERROR_LOGGED`、hook drop doctor、OpenTelemetry no-op default を demo する。B002 は subagent outcome classification を demo する。B003 は conductor warning と PR readiness traceability を demo する。

X. その他。

[Answer]: E

### Q8. Team allocation

Team allocation はどうしますか。

A. team-formation が SKIP でも新しい人間チームを仮作成する。

B. Bolt ごとに別の未確認 team を割り当てる。

C. 外部 platform team を必須にする。

D. mob assignment を未確認のまま空欄にする。

E. 推奨: mvp scope で team-formation が SKIP のため、すべての Bolt を `aidlc-developer-agent` に割り当てる。review と test は後続 stage の lead/reviewer に接続する。

X. その他。

[Answer]: E
