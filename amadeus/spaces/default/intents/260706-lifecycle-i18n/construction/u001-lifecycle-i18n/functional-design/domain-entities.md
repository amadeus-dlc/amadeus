# Domain Entities — u001-lifecycle-i18n（260706-lifecycle-i18n）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

本 Intent はコードのエンティティを持たない。訳語対応表（glossary）を成果物として定義する。

## 訳語対応表（正）

機械可読ラベル・固有名は翻訳しない（FR-1.3）: stage slug、イベント名（`STAGE_COMPLETED` など）、checkbox 語彙、path、コマンド、ファイル名、`Amadeus DLC` / `AI-DLC v2` / `Intent` / `Space` / `Bolt` / `Unit` / `scope` / `depth` / `gate` / `record` / `codekb` / `walking skeleton` などの canonical name（CONTEXT.md と本文中の既存英語表記）。

日本語の説明語の英訳は次を正とする。

出典は §12a 反復 1 の指摘を受けて全行を実 grep で再点検し、反復 2 の指摘（single entry point / human gate の既訳見落とし 2 行）を追加補正した（「本 Intent で確立」= repo 全体 grep で既存英訳が見つからないことを確認済みの語）。

| 日本語 | 英語 | 出典（実測済み） |
|---|---|---|
| 成果物 | artifact | #561 記法定義（overview.md 218 行）、上流 v2 frontmatter |
| 供給元 | Source | #561 記法定義（overview.md 220 行） |
| 必須 / 任意 / 条件付き（条件名）/ 必須（<ステージ名> 実行時） | Required / Optional / Conditional (condition) / Required (when <stage> runs) | #561 記法定義（overview.md 219 行） |
| 縮退（scope の） | reduction / reduced | 本 Intent で確立（scopes.md は本 Intent の翻訳対象で既訳なし） |
| 縮退時の入力代替 | input substitution on reduction | 本 Intent で確立 |
| 実行条件 | execution condition | 上流 v2（ALWAYS / CONDITIONAL は stage frontmatter の実ラベル） |
| 承認 / 却下 | approve / reject | 上流 v2 state machine（エンジン verb と同一） |
| 遡及承認 | retroactive approval | 本 Intent で確立 |
| 正準台帳 | canonical ledger | steering.md 45 行（#563 既訳）「Intent registry (the canonical ledger)」 |
| 索引 | index | steering.md 45 行（#563 既訳）「the `intents.md` index」 |
| 廃止した / 退役した（GD009） | retired (GD009) | steering.md 45 行（#563 既訳）「the `intents.md` index is retired — GD009」、同 41〜42 行「adopted or retired」 |
| 追記専用 | append-only | stage-protocol-recovery.md 23 行（engine 既訳）「append-only source of truth」 |
| 単一入口 | single entry point | steering.md 24・61 行（#563 既訳）「the single entry point `amadeus`」 |
| 補助入口 | auxiliary entry | 本 Intent で確立 |
| 質問プロトコル | question protocol | 上流 v2 |
| 人間 merge | human merge | aidlc-v2-operation-phase-boundary.md 29 行（#563 既訳）「the human merge of phase PRs and Bolt PRs」 |
| 人間ゲート | human gate | aidlc-v2-reviewer-mapping.md 25・58 行（#563 既訳）「the human gate」、aidlc-v2-sensor-learn-mapping.md 65 行 |
| 意味論互換 | semantic compatibility | 本 Intent で確立（CONTEXT.md は日本語専用文書で既訳の出典にならない） |
| 上書きする（memory 階層） | override | steering.md 33〜34 行（#563 既訳）「overrides `org.md`」 |
| 働き方（team.md の） | working conventions | steering.md 33 行（#563 既訳）「Team working conventions」。overview.md 151 行の訳に使う |
| 判断基準 | judgment criteria | steering.md 34 行（#563 既訳）「Project-specific judgment criteria」 |

表にない語は、#563 / #536 の既訳（docs/amadeus 直下 10 文書 + 2 文書）→ 上流 v2 の用語 → 一般的な技術英語の順で選び、選んだ訳と出典（または「本 Intent で確立」）を code-generation の対訳記録に追記して一貫させる。

## 文体規範（英語版）

- 既存英語文書（language-policy.md、extension-guide.md、#563 の steering.md）の文体に合わせる: 平叙・現在形、一文一行は英語版では強制しない（前例は段落内複文）。
- 見出しは sentence case（前例: `## Scaling principle`、`## Canonical and translation`）。
- 日本語版は現行本文を無改変で維持し、日本語規範（一文一行）を保つ。
