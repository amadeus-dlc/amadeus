# Delivery Planning — Questions

> 上流入力（consumes 全数）: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`

## Interaction Mode

約6件のDelivery Planning判断を、どの方法で回答しますか。

- A. Guide me — 質問を順番に対話形式で進める
- B. Grill me — 推奨案と根拠を添えて、一問ずつ深掘りする
- C. I'll edit the file — 質問ファイルを自分で編集する
- D. Chat — 自由に議論し、会話から決定事項を抽出する
- X. Other (please specify)

[Answer]: A — Guide me
[Answered At]: 2026-07-24T04:36:19Z
[Mode]: guided

## Q1. Sequencing heuristic

Boltの経済的な順序付けに、どのheuristicを使いますか。

- A. walking-skeleton-firstとrisk-firstのhybrid。最初にcreate／provenance／重複なし回復をend-to-endで実証し、以後は安全性リスクの高い順に広げる（推奨: `team-practices.md`の確定方針）
- B. value-first。利用者に見える三モードUIから先に作る
- C. risk-firstのみ。walking skeletonを別扱いしない
- D. WSJF scoreの高い順だけで決める
- E. Unit DAGのtopological orderをそのまま単一順序にする
- X. Other (please specify)

[Answer]: A — walking-skeleton-firstとrisk-firstのhybrid
[Answered At]: 2026-07-24T04:37:11Z
[Mode]: guided

## Q2. Scoring model

WSJF形式の数値scoreを使いますか。

- A. 数値WSJFは使わず、risk reduction、user value、sizeをHigh／Medium／Lowで明示してhybrid判断の根拠にする（推奨: 5 Unitでは偽精度を避けられる）
- B. `(value + time criticality + risk reduction) ÷ size`を同じ重みで使う
- C. risk reductionを2倍に重み付けしたWSJFを使う
- D. user valueを2倍に重み付けしたWSJFを使う
- X. Other (please specify)

[Answer]: A — 数値WSJFは使わず、risk reduction、user value、sizeをHigh／Medium／Lowで示す
[Answered At]: 2026-07-24T04:37:40Z
[Mode]: guided

## Q3. Bolt granularity

5 UnitをBoltへどうまとめますか。

- A. 関連Unitをbundleする。walking skeletonはruntime 4 Unitを一つのgated Boltで統合し、distribution/docsを後続Boltにする（推奨: 確定済みend-to-end skeletonをUnit分割で断ち切らない）
- B. 1 Unitにつき1 Boltとする
- C. 全5 Unitを1 Boltにまとめる
- D. Unitを複数Boltへ分割してthin slice化する
- X. Other (please specify)

[Answer]: A — runtime 4 Unitをgated walking skeletonへbundleし、distribution/docsを後続Boltにする
[Answered At]: 2026-07-24T04:38:04Z
[Mode]: guided

## Q4. Bolt parallelism

複数BoltをConstructionで並行実行しますか。

- A. Boltは逐次実行する。Unit内ではDAGが許すstate-provenanceとGitHub Gatewayの並行作業を許可する（推奨: Bolt間のshared runtime／generated files競合を避ける）
- B. 独立可能なBoltはすべて並行実行する
- C. walking skeleton後のBoltだけ並行実行する
- D. 実装開始時に都度判断する
- X. Other (please specify)

[Answer]: A — Boltは逐次実行し、runtime Bolt内の独立Unitだけ並行作業を許可する
[Answered At]: 2026-07-24T04:38:28Z
[Mode]: guided

## Q5. External dependencies

外部依存をどう扱いますか。

- A. `gh`／GitHub auth／Issue権限をlive smokeのgated dependencyとして記録し、通常の開発とintegration testはfake runnerで非阻害にする。外部team hand-offはなし（推奨）
- B. live GitHubをすべての開発・testの必須依存にする
- C. GitHub確認を全てConstruction後へ延期する
- D. 新しいGitHub Appと専用credentialを準備する
- X. Other (please specify)

[Answer]: A — live smokeだけを`gh`／GitHub auth／Issue権限のgated dependencyとし、通常開発はfake runnerで非阻害にする
[Answered At]: 2026-07-24T04:39:04Z
[Mode]: guided

## Q6. Earliest risk

最初のBoltで最優先に検証するriskはどれですか。

- A. remote create成功／local write失敗後も同じIssueへ収束し、重複Issueを作らないこと（推奨: 最大の不可逆リスク）
- B. statusとpromptの文言品質
- C. 6ハーネス配布速度
- D. final sync後のcloseだけ
- E. 日英ドキュメントparity
- X. Other (please specify)

[Answer]: A — remote create成功／local write失敗後も同じIssueへ収束し、重複Issueを作らないこと
[Answered At]: 2026-07-24T04:40:10Z
[Mode]: guided

## E-OC1 Delivery Planの統合確認

2-Bolt構成、walking skeleton、逐次Bolt実行、Bolt内並行性、外部依存、Definition of Done、confidence hypothesis、AI mob割当を統合確認する。

[Answer]: E-OC1 — Approve Plan
[Answered At]: 2026-07-24T04:41:01Z
[Mode]: guided

6件の回答間に曖昧語、矛盾、未回答は0件である。Bolt sequenceは`unit-of-work-dependency.md`のDAGを満たし、Unitを依存元より前へ配置しない。
