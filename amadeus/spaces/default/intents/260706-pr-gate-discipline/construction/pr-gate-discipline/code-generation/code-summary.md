# Code Summary — pr-gate-discipline

上流入力:
[code-generation-plan.md](./code-generation-plan.md)、
[business-logic-model.md](../functional-design/business-logic-model.md)、
[business-rules.md](../functional-design/business-rules.md)、
[domain-entities.md](../functional-design/domain-entities.md)、
[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 実施内容

### 1. `.agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md`（新規）

英語で新設した。business-logic-model.md が定めた 6 節構成（Invariants / CI first / Wait for review bots / Respond to every comment / Escalation / Merge readiness）で、requirements.md FR-3 の 8 項目を配置した。

- §1 Invariants は business-rules.md の不変条件 4 項目をそのまま再掲し、ルール側 3 か所との「乖離時はルール側が正」という関係（domain-entities.md「関係」節）を明記した。
- §3 では、長い sleep ベースの監視間隔を作らない理由（取りこぼしによる対応遅延）を明記した（FR-3 項目 2）。
- §4 では、偽陽性の判断手順（PR の主旨・実コードとの突き合わせ）と、同一指摘の繰り返し時の中断・エスカレーションへの参照を記述した（FR-3 項目 3・4）。
- §5 は、目的外の有効な指摘のスコープアウト（起案は人間・リード側）と繰り返し指摘時のエスカレーションを扱う（FR-3 項目 5・6）。
- §6 は、検証設定を緩めない原則の再掲と merge 準備完了条件、merge は人間が行うことの再掲を扱う（FR-3 項目 7・8）。
- 固有名（Devin、CodeRabbit、Bugbot、codecov.yml）は書かず、一般化した表現（遅いボット、検証設定）に統一した（FR-4）。ユーザー向け gate 文言・エラーメッセージは含めていないため、NFR-1 の日本語カーブアウトは発動しない。

### 2. `aidlc/spaces/default/memory/team.md`「PR 監視」節（編集）

節本文を、不変条件 4 行（コメント放置・マージ禁止の核／監視とポインタ／merge は人間／検証設定を緩めない）+ 固有名の例示 1 行へ短縮した。

- 分量: 本文 4 行 + 例示 1 行（business-rules.md の分量規則「3〜4 行 + 固有名の例示」に適合）。
- ポインタ: `.agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md` を参照する 1 文を含む。
- 固有名の例: レビューボットは CodeRabbit、Bugbot、Devin（Devin は遅いが必ず待つ旨を明記）、検証設定の例は codecov.yml（変更による回避の禁止）。FR-4 の切り分け規則どおり、固有名は team.md 側にのみ残した。
- 既存の `### merge` 小節（merge は人間が行う、の詳細）は変更していない（要求仕様どおり、この小節は別扱いとして維持）。

### 3. `aidlc/spaces/default/memory/phases/construction.md`（編集）

`## Security` 節の直後、`## Corrections` 節の直前に新 H2 節 `## PR Gate` を追加した。

- 内容: 不変条件 4 行（箇条書き）。2 行目に知識文書へのポインタを統合しているため、別立てのポインタ行は設けていない（business-rules.md の「不変条件 4 行相当」の上限に適合）。
- 文体: 既存節（Code Completeness、Error Handling など）と同じ、肯定形の箇条書きに合わせた。

### 4. `.agents/amadeus/amadeus-common/protocols/stage-protocol.md`（編集）

「Construction Bolt gates (walking skeleton + ladder + halt-and-ask)」節の末尾（halt-and-ask の question ブロックの後、節区切り `---` の直前）に英語で追記した。

- 追記内容: 不変条件 1 文（未応答・マージ禁止、merge は人間が行う）+ 知識文書への参照 1 文。あわせて 2 文（プロース換算で ≤3 行）。
- 参照パス表記は、同ファイル §5「Agent Persona Loading」が既に使っている `.claude/knowledge/amadeus-shared/...` 形式に合わせた。
- 既存の walking skeleton / ladder / halt-and-ask の手順は変更していない。詳細手順を複製せず、知識文書 1 か所への参照にとどめた（business-rules.md「詳細手順はルール側へ複製しない」規則）。

### 5. `dev-scripts/data/parity-map.json`（編集）

`exceptions[]` 内の、target に `aidlc-common/protocols/stage-protocol.md` を含み reason が「Issue #504: learnings persist の cid marker...」で始まる既存エントリの `reason` 末尾へ、本 Intent の追記理由（Issue #534、Construction Bolt gates 節末尾への PR gate 不変条件の最小ポインタ追記、上流が同等規律を導入したら解除）を統合する 1 文を追加した。

- 新規エントリは作成していない（FR-5.1 どおり）。
- `engineFileExceptions`（平坦配列）は変更していない。`aidlc-common/protocols/stage-protocol.md` は同配列に宣言済みのため対応不要（business-rules.md の実測結果どおり）。
- `python3 -m json.tool` で JSON 妥当性を確認した（pass）。

## 受け入れ条件との対応

| 受け入れ条件 | 対応 |
|---|---|
| 不変条件がルール側に、監視手順・判断基準が知識文書に存在し、ルールから知識へのポインタが機能している | team.md・phases/construction.md・stage-protocol.md の 3 か所に不変条件を再掲し、いずれも `.agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md` への相対/絶対参照を持つ。参照先ファイルは本 Intent で新設済みであり実在する |
| Maintainer が個人 CLAUDE.md から重複情報を削除しても engineer の PR 監視挙動が維持される | 本ステージのスコープ外（次の PR サイクルで観察検証。requirements.md「スコープ外」節どおり）。知識文書と 3 か所のルールがすでに規律の正本を構成しているため、削除後も参照先は自己完結する |
| 言語は #509 の方針に従う | 知識文書は英語（NFR-1）、team.md と phases/construction.md は日本語、stage-protocol.md の追記は既存言語（英語）に合わせた |
| validator / test:all が pass する | `npm run parity:check` は pass（39 skills、199 engine files、基準 commit b67798c37c71855271b70882a33f47890d41f212）。validator と `npm run test:all` は本 Intent の build-and-test ステージで確認する |

## 検証結果

- `python3 -m json.tool dev-scripts/data/parity-map.json`: OK。
- `npm run parity:check`: `parity check: ok（39 skills、199 engine files、基準 commit b67798c37c71855271b70882a33f47890d41f212）`。
