# Your First Workflow（最初のワークフロー）

## conductor loop の仕組み

Claude Code の中では、`/amadeus` と打つだけで Amadeus DLC を動かす。
続けて、作りたいものの自由記述を渡してもよい。例えば `/amadeus "Add a hello command to my CLI"` のように打つ。

その後の一切は、`amadeus` skill がエンジンに対して回す、小さく固定された 1 個の loop である。
`amadeus-orchestrate.ts next` に次の一手を尋ね、その一手だけを実行し、結果を `report` し、エンジンが完了と言うまで繰り返す。
Intake、scope、stage 順序、gate を適用するかどうかを判断するのは skill ではなくエンジンである。
skill は、渡された directive をそのまま実行するだけである。
この loop の契約全体は [skills/amadeus/SKILL.md](../../skills/amadeus/SKILL.md) の「The Forwarding Loop」節が持つ。

本章は `/amadeus` の chat セッションをそのまま書き起こすものではない。
代わりに、skill が利用者の代わりに実行するのと同じエンジンのコマンドを直接実行する。
こうすることで、skill を信頼して loop を任せる前に、エンジンが実際に何を返すかを見られるようにする。

## Birth：最初の Intent を作る

`/amadeus` の内側では、Intent を直接作ることはない。
Intake が自由記述の入力を分類し、独立して完了判断できる新しいアウトカムに見える場合だけ、エンジンが **birth**（Intent の作成）を提案する。
birth の前に人間の承認を得ることは必須であり、エンジンが自動で birth することはない。
承認が得られると、skill は承認された scope と説明を渡して `intent-birth` を実行する。

本章のコマンドはすべて、対象 workspace のルートで実行する。[Getting Started](01-getting-started.ja.md) の導入作業を終えた Amadeus の clone ディレクトリではなく、導入先へ移動してから進める。

```sh
cd <workspace>
```

次は、その同じ birth コマンドを直接実行した結果である。

```sh
bun .agents/amadeus/tools/amadeus-utility.ts intent-birth --scope poc --arguments "Add a hello command to my CLI" --label "hello-command"
```

```
Intent born: 260706-hello-command (space: default)
State initialized: poc scope, 7 stages, Minimal depth
Project type: Greenfield
Languages: Unknown
Frameworks: Unknown
Build System: Unknown
First post-init stage: intent-capture (IDEATION)
```

birth は、Intent の record（`amadeus/spaces/default/intents/260706-hello-command/`）と、その傍らで Space shell（`amadeus/spaces/default/memory/`）を作る。
この Space shell こそ、[Getting Started](01-getting-started.ja.md#導入を検証する) で導入直後に `pending first workflow` と表示されていたものである。
同じ workspace でこの birth の直後に `doctor` を再実行すると、その行が `workspace shell ready` へ切り替わる（以下は無関係な pass 行を省略した。省略以外は変更していない）。

```
AI-DLC Health Check
─────────────────────────────────────
…
✓  workspace shell ready (.claude/ + amadeus/spaces/default/memory/)
…
─────────────────────────────────────
33 passed, 0 failed
```

## エンジンが次の一手を示す

Intent の birth が済んだら、エンジンに次の一手を尋ねる。

```sh
bun .agents/amadeus/tools/amadeus-orchestrate.ts next
```

エンジンは、ちょうど 1 個の directive を JSON で返す。
次は、この Intent に対する実物である。完全な JSON ドキュメントではなく、途中で切った抜粋として示す。
`conductor_persona` フィールド（毎セッション最初の directive に載る、実行品質に関する長大な固定文書）は省略した。
下記の抜粋は、実測ログ自体がその直前で途切れている箇所で切れている。

```json
{
  "kind": "run-stage",
  "stage": "intent-capture",
  "phase": "ideation",
  "lead_agent": "amadeus-product-agent",
  "support_agents": [
    "amadeus-architect-agent"
  ],
  "mode": "inline",
  "gate": true,
  "memory_path": "amadeus/spaces/default/intents/260706-hello-command/ideation/intent-capture/memory.md",
  "consumes": [],
  "produces": [
    "amadeus/spaces/default/intents/260706-hello-command/ideation/intent-capture/intent-statement.md",
    "amadeus/spaces/default/intents/260706-hello-command/ideation/intent-capture/stakeholder-map.md",
    "amadeus/spaces/default/intents/260706-hello-command/ideation/intent-capture/intent-capture-questions.md"
  ],
  "rules_in_context": [
    "amadeus/spaces/default/memory/org.md",
    "amadeus/spaces/default/memory/team.md",
    "amadeus/spaces/default/memory/project.md",
    "amadeus/spaces/default/memory/phases/ideation.md"
  ],
  "sensors_applicable": [
    "required-sections",
    "upstream-coverage"
  ],
  "stage_file": ".claude/amadeus-common/stages/ideat…
```

`run-stage` directive の読み方は次のとおりである。
`stage` と `phase` が、今回の一手そのものを名指す。
`lead_agent`（と `support_agents` があればそれも）が、作業に載せるペルソナを示す。
`mode: inline` は、skill が現在のセッション内で stage の本体を実行することを意味し、subagent へ委譲しない。
`gate: true` は、この stage が人間承認の gate で終わることを意味し、自動で先へ進む stage ではない。
`memory_path` は、stage が観察日誌を残す場所である。
`consumes` と `produces` は、stage が宣言する入力と出力である（この Intent の最初の stage は、まだ何も consume しない）。
`rules_in_context` は、この stage で読み込む steering 文書の一覧である。
`sensors_applicable` は、この stage の gate に適用する決定論的な検査の名前である。
`stage_file` は、skill が stage の本体を実行するために読む stage 定義への path である。

## 現在地を確認する

いつでも、次の directive の代わりに状態の要約をエンジンに尋ねられる。

```sh
bun .agents/amadeus/tools/amadeus-utility.ts status
```

```
AI-DLC Workflow Status
==============================
Project:        Add a hello command to my CLI
Scope:          poc
Phase:          IDEATION
Current Stage:  Intent Capture & Framing (1.1)
Status:         Running
Active Agent:   amadeus-product-agent
Completion:     3/7 stages (43%)

Phase Progress:
  INITIALIZATION   ███ 3/3
  IDEATION         ▒ 0/1
  INCEPTION        ░ 0/1
  CONSTRUCTION     ░░ 0/2

Last Completed: state-init
Next Stage:     reverse-engineering
```

これは poc scope がコンパイルした 7 stage の計画である。
Initialization の 3 stage は birth 時に自動で実行済みであり、残る 4 stage（この scope の Ideation、Inception、Construction の該当分）がまだ先にある。
いま目の前にある作業は `Current Stage` であり、`Next Stage` は現在の stage が完了した後に続く stage を示す。
`Completion` と `Phase Progress` の bar は、同じ stage 数から導出する。
`Current Stage` と `Last Completed` は、実行の途中でも `/amadeus` がいつでも示す、同じ 1 組のフィールドである。

## Gate と監査証跡

stage を承認するのは常に人間の判断であり、エンジンや skill の判断ではない。
各 stage gate と各 Construction Bolt gate は、作業が先へ進む前に、Approve か Request Changes の明示的な判断を待つ。
gate 契約全体（stage gate、Bolt gate、PR と人間の merge が確定する phase gate）は [Lifecycle Contract Overview](../amadeus/lifecycle/overview.md) が定義する。
すべての gate 判断と stage 遷移は、発生したその場で Intent 自身の追記専用 `audit/` ログへ書き込まれる。事後の再構成では作らない。
`audit/` と、エンジンが `next` を呼ぶたびに読む状態ファイルの両方の record 構造は、[State Reference](../amadeus/lifecycle/state.md) が定義する。

## 成果物の置き場所

この Intent が生む成果物はすべて、自分の record である `amadeus/spaces/default/intents/260706-hello-command/` の配下に置かれる。
phase ごとに 1 ディレクトリ（`ideation/`、`inception/`、`construction/` など）を持ち、その下に stage ごとの subdirectory を持つ。
これに加えて、record 直下の `audit/` ログと、現在の stage と gate の状態を示す状態ファイルを持つ。
stage ごとの成果物名まで含む record 全体の配置は [Lifecycle Contract Overview](../amadeus/lifecycle/overview.md#成果物配置) が定義する。本章では複製しない。

## 次に読むもの

本章では、Intent の最初の数手を command level で扱った。birth、最初のエンジン directive、状態と成果物の置き場所である。残りの stage を完了まで進める作業は、conductor loop（`/amadeus`）が gate ごとに担う。
本ガイドは、この導入の一連より先へ続く。公開済みの章と全体の一覧は[ガイドの目次](index.ja.md)を参照する。
導入済みの workspace をステアリングまたは拡張する場合（新しい scope、独自 stage、エンジン変更など）は、[拡張ガイド](../amadeus/extension-guide.ja.md)を参照する。
