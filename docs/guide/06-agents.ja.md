# Agents（エージェント）

## エージェントとは何か

**エージェント**は、stage の実行中に採用する視点である。
仕組みではなく、視点である。

14 個のエージェントは、それぞれ `.agents/amadeus/agents/` 配下の 1 個の flat markdown ファイルである。
frontmatter は、`name`、`display_name`、そのエージェントが lead または support を務める stage を示す `description`、`modelOverride` を宣言する。
すべてのエージェントファイルは `disallowedTools: Task` を宣言し、同じ一文から始まる。
エージェントは、自分から sub-agent を生成しない。
delegate するのは conductor だけである。

stage は、実行モードに応じて 2 通りのいずれかでエージェントの persona を読み込む。

- **inline stage**：conductor が lead エージェントのファイルを自分自身のコンテキストへ直接読み込み、その視点で stage を進める。複数エージェントを使う stage では、統合の前に各 support エージェントのファイルも同じ方法で読み込む。
- **subagent stage**：conductor はエージェント名を指定して Task を呼び出し、harness が sub-agent 境界でそのエージェントの persona を自動で読み込む。persona 本文を prompt へ手動で注入することはない。

各 stage の実行モードは、その stage 定義（frontmatter）が宣言し、stage ごとの一覧は [Stage Catalog](../../skills/amadeus/references/stage-catalog.md) が持つ。
本章が扱うのは、モードが決まったあとに persona をどう読み込むかだけである。

## 14 個のエージェント

14 個のエージェントファイルは、3 つの役割に分かれる。

- **domain エージェント（11 個）**：`amadeus-architect-agent`、`amadeus-aws-platform-agent`、`amadeus-compliance-agent`、`amadeus-delivery-agent`、`amadeus-design-agent`、`amadeus-developer-agent`、`amadeus-devsecops-agent`、`amadeus-operations-agent`、`amadeus-pipeline-deploy-agent`、`amadeus-product-agent`、`amadeus-quality-agent`。それぞれ、自分の frontmatter に書かれた stage の lead または support を務める。たとえば Architect Agent は、Feasibility、Application Design、Units Generation、Functional Design、NFR Requirements、NFR Design の lead を務める。実際に成果物を作るのは、この 11 個である。
- **reviewer エージェント（2 個）**：`amadeus-architecture-reviewer-agent` と `amadeus-product-lead-agent`。どちらも成果物は作らない。すでに domain エージェントが作った成果物をレビューする（後述の「gate 前の reviewer」を参照）。
- **composer エージェント（1 個）**：`amadeus-composer-agent`。自分では stage 作業を行わず、どの stage を実行するかを提案する（後述の「composer」を参照）。

どの domain エージェントがどの stage の lead または support を務めるかは、stage ごとに宣言されている。
本章では列挙せず、「エージェントの宣言場所」で扱う。

## gate 前の reviewer

frontmatter に `reviewer` が宣言された stage は、lead エージェントが成果物を作ったあと、learnings ritual と承認 gate の前に、独立した reviewer のレビューを 1 回受ける。

reviewer の sub-agent が受け取るのは、stage 定義、その stage の質問と回答のファイル、作られた成果物である。
lead エージェントの作業メモ（`memory.md`）や plan ファイルは渡さない。
そのため、reviewer の判断は、成果物がどう作られたかから独立する。

reviewer は、主成果物に `## Review` セクションを追記し、次のいずれかの判定を書く。

- **READY**：stage は learnings ritual と承認 gate へ進む。
- **NOT-READY**：lead エージェントが指摘に対応し、成果物を再度レビューする。この往復は、stage ごとに設定された `reviewer_max_iterations`（既定 2 回）まで繰り返す。回数を使い切った場合も、stage は承認 gate へ進み、未解決の指摘は人間の判断に委ねる形で提示する。

reviewer が workflow を完全に止めることはない。
最終判断は、常に gate での人間に残る。

## composer

composer エージェント（`amadeus-composer-agent`）は、`/amadeus compose` skill から、または Intake が既定の scope を超えて workflow を組み立てる必要がある場面で dispatch される。
composer は、対象の内容（プロンプト、スキャン結果、実行中 workflow の状態のいずれか）を読み、ライフサイクルの各 stage に対する EXECUTE / SKIP の組み合わせを提案する。
人間が gate で提案を承認したあと、composer はその組み合わせを、新規 workflow なら scope データとして書き出す。
実行中の workflow に対しては、未実行 stage の EXECUTE / SKIP 反転案として提示する。
composer が stage から直接呼ばれることはない。
dispatch するのは orchestrator だけである。

## エージェントの宣言場所

各 stage 定義（`.agents/amadeus/amadeus-common/stages/<phase>/<slug>.md`）は、frontmatter に自分の `lead_agent`、任意の `support_agents` の一覧、任意の `reviewer` を宣言する。
どのエージェントがどの stage を担うかは、この宣言だけが正である。
本章はこの対応を複製しない。

stage 一覧の全体は [Stage Catalog](../../skills/amadeus/references/stage-catalog.md) を参照する。
これらのフィールドが関わる契約本体（入出力、gate）は [Lifecycle Contract Overview](../amadeus/lifecycle/overview.ja.md) を参照する。

## 次に読むもの

エージェントは、stage の成果物を作り、レビューする。
次章の [Interaction Modes](07-interaction-modes.ja.md) は、人間が stage の質問にどう答えるかを扱う。
各章の状態は、ガイドの[目次](index.ja.md)で確認できる。
