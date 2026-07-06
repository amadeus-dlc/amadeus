# Requirements — 260706-lifecycle-i18n（Issue #515+#516+#517+#518+#519+#520）

上流入力: [business-overview.md](../../../../../codekb/amadeus/business-overview.md)、[architecture.md](../../../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../../../codekb/amadeus/code-structure.md)（codekb 採用 = reverse-engineering）、Intake の decision 転記 2 件、record の audit shard にある user project description

## 前提実測

1. 対象 6 文書は docs/amadeus/lifecycle/（overview 293 行、ideation 329、inception 398、construction 360、scopes 131、state 162。計 1,673 行）。すべて #561（Inputs 整合）merge 後の 8265f2cb 断面である。
2. language-policy.md（英語正）は次を規定する: `<name>.md` = 英語正 / `<name>.ja.md` = 日本語訳、乖離時は英語が正、PR は両言語を含む、リンクは en→en / ja→ja（対訳が無ければ ja→en）。
3. 対訳ペアの前例様式（PR #536 = extension-guide / language-policy）: 英語版は素の見出し、日本語版は H1（文書タイトル）だけを `# Extension Guide（拡張ガイド）` のように英語名 + 括弧書き日本語名にし、H2 以下は素の日本語見出しにする（実物で確認: `## スケール原理` など）。本文は意味論一致の対訳。
4. lifecycle 文書への流入参照は、repo 全体の grep（Intent record と codekb の履歴的記録を除く現行文書）で 16 ファイル・30 箇所である（§12a 反復 1 の指摘で再実測、反復 2 の指摘で amadeus/spaces/default/memory/development.md の 2 箇所の転記漏れを補正。初回の「12 件」は探索範囲が狭く、反復 1 後の「15 ファイル・28 箇所」は grep 出力から列挙への転記漏れがあった）。内訳: README.md（6）、README.ja.md（6）、docs/amadeus/steering.md（2）、docs/amadeus/aidlc-v2-sensor-learn-mapping.md / aidlc-v2-operation-phase-boundary.md / aidlc-v2-build-and-test-failure-handling.md（各 1）、CONTEXT.md（1）、AMADEUS.md（1）、amadeus/spaces/default/memory/phases/operation.md（1）、amadeus/spaces/default/memory/development.md（2）、skills/amadeus/SKILL.md と昇格先（各 1）、skills/amadeus-validator/references/artifacts.md と昇格先（各 2）、同 domain-model.md と昇格先（各 1）。いずれも `<name>.md`（ファイル名不変）宛のため英語化後も壊れない。README.ja.md などの docs/amadeus/ 外の日本語文書から ja 版へのリンク切り替えは、language-policy.md の適用範囲（docs/amadeus/*.md）の外であり本 Intent の対象外とする。
5. 対訳パリティの機械検査（language-pair checker）は dev-scripts / lints に存在しない。パリティ検証は前例どおり reviewer 突き合わせで担保する。
6. #561 の I/O 記法定義は英語化後ラベル（Artifact / Required / Source、必須値の英訳 4 値）を既定済みであり、Inputs 表の英訳の正として使う。

## 機能要求

### FR-1: 対訳ペア化（#515〜520、6 文書）

- FR-1.1: 現行の日本語本文を `<name>.ja.md` へ移す。内容は無改変とする（リンク調整と見出しの対訳形式だけを許す）。
- FR-1.2: `<name>.md` を英語で書き直す。意味論は日本語版と一致させ、用語は CONTEXT.md の canonical name と、#561 の記法定義が既定した英語化後ラベルを使う。
- FR-1.3: 機械可読ラベル（イベント名、checkbox 語彙、path、コマンド）は両言語で同一に保つ。
- FR-1.4: 見出しの対訳併記（英語名 + 括弧書き日本語名）は日本語版の H1 だけに適用し、H2 以下は日本語版 = 素の日本語見出し、英語版 = 素の英語見出しとする（前提実測 3 の前例様式）。

### FR-2: リンク規約（language-policy.md）

- FR-2.1: `<name>.md` からのリンクは `<name>.md`（英語）宛にする。
- FR-2.2: `<name>.ja.md` からのリンクは、対訳が存在する場合は `<name>.ja.md` 宛、存在しない場合は `<name>.md` 宛にする。lifecycle 6 文書間の相互リンクは本 Intent で全対訳が揃うため ja→ja にする。
- FR-2.3: 他文書からの既存流入リンク（前提実測 4 の 16 ファイル・30 箇所、すべて `<name>.md` 宛）を壊さない。
- FR-2.4: #563 merge（2026-07-06T07:36:09Z）により docs/amadeus 直下 10 文書の対訳が存在するため、lifecycle の `<name>.ja.md` から直下文書への参照（steering、aidlc-v2 系。執筆時に全数を実測）は `<name>.ja.md` 宛にする（制約節の「#563 が先に merge された場合」の分岐が成立済み）。

### FR-3: 陳腐化の扱い

- FR-3.1: 英語化中に翻訳元の陳腐化（実在しない機構・path への言及など）を発見した場合は、言及行に限定して現行実体へ外科修正し、英日両版へ同時適用のうえ修正一覧を実測裏取り付きで記録する。節構成は変えない。一次根拠は merge 済みの同型実例 2 件（PR #561 の GD009 残存 18 箇所補正、PR #563 = #521〜523 の外科修正カーブアウト。#563 は 2026-07-06T07:36:09Z に merge 済み、merge commit 3366cd69）とする。
- FR-3.2: 修正には実測裏取りを付ける。判断に迷う場合は忠実対訳 + Issue 起案へフォールバックする。

### FR-4: 検証

- FR-4.1: 対訳パリティは (a) 執筆時の節単位突き合わせ、(b) §12a reviewer の対訳照合、(c) reviewer（Codex）初見レビュー 1 回で検証する。
- FR-4.2: PR 作成前に validator（Intent 指定）と `npm run test:all` を実行し記録する。
- FR-4.3: 流入参照（前提実測 4 の 16 ファイル・30 箇所の列挙を検証対象リストとする）と 6 文書間の相互リンクの解決を機械的に確認する（grep で対象 path の実在照合）。

## 制約

- 変更対象は docs/amadeus/lifecycle/ の 6 文書 + 新規 `<name>.ja.md` 6 ファイルのみとする。エンジン・skill・validator は変更しない。
- engineer5 の #563（docs/amadeus 直下 8 文書）とはファイル非接触。#563 が先に merge された場合は、lifecycle 側から直下文書への参照リンクの整合（ja→ja 化の要否）だけを確認する。
- Bolt 分割は functional-design で確定する（文書間の語彙一貫性を保てる単位にする）。

## 受け入れ条件（Issue 対応）

| Issue | 対象 | 受け入れ条件 |
|---|---|---|
| #515 | overview.md | 英日併置、意味論一致、既存リンク無破壊 |
| #516 | ideation.md | 同上 |
| #517 | inception.md | 同上 |
| #518 | construction.md | 同上 |
| #519 | scopes.md | 同上 |
| #520 | state.md | 同上 |
