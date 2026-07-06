# Business Logic Model — docs-lang-guide

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 成果物文書の構成

### B001（#509）: language-policy

`docs/amadeus/language-policy.md`（英語、正）+ `docs/amadeus/language-policy.ja.md`（日本語）。両者は対訳。

| H2 節（英語版のアンカー） | 内容 | 対応要求 |
|---|---|---|
| Scope | 方針の対象 = docs/amadeus 配下の文書。aidlc/**、テンプレート由来 Markdown、gate 文言は対象外 | FR-1.1、A-2 |
| Canonical and translation | `*.md` = 英語（正）、`*.ja.md` = 日本語版の併置 | FR-1.1(a) |
| Synchronization rules | 乖離時は英語が正。更新 PR は原則両方を含める。片方だけの更新は理由と追随予定を PR に記す | FR-1.1(b)、FR-1.4 |
| Cross-linking rules | `*.md` → `*.md`。`*.ja.md` → `*.ja.md` 優先、対応 ja がなければ `*.md` | FR-1.1(c)、FR-1.4 |
| Relation to skill-language-policy | 責務分担（skill の言語 / docs/amadeus の言語）と相互参照 | FR-1.3 |

あわせて編集する既存文書: `AMADEUS.md` 作業言語節（既存 2 箇条からの明示カーブアウト 1 文 + language-policy.md 参照 = FR-1.2）、`docs/amadeus/skill-language-policy.md`（相互参照 1 文 = FR-1.3）。

### B002（#532）: extension-guide

`docs/amadeus/extension-guide.md`（英語、正）+ `docs/amadeus/extension-guide.ja.md`（日本語）。両者は対訳。language-policy に従う（B001 確定後に執筆 = C-1 の直列根拠）。

| H2 節（英語版のアンカー） | 内容 | 対応要求 |
|---|---|---|
| Scaling principle | stage 定義 = 「何をやるか」、memory = 「どうやるか」。run-stage directive の rules_in_context に org/team/project + phases/<phase>.md が焼き込まれる構造 | FR-2.2(1)、FR-2.3 |
| Extension points | 使い分け表（domain-entities.md の 9 拡張ポイント。Amadeus 独自の pdm scope と docs-only 宣言を含む）。Amadeus 独自要素には #524 への pending-note | FR-2.2(2)、FR-2.4 |
| Human editing discipline | memory は Maintainer の指示チャネル（直接編集可）+ 規律 2 点（観察済み実例根拠、Corrections の learned 形式 + cid marker 新形式）。knowledge/ は domain-modeling skill 経由が安全（#527 pending-note） | FR-2.2(3)、FR-2.4 |
| Sources | 実測アンカーの明記（amadeus-graph.ts、stage-protocol.md template resolution、本 record の実 directive、.agents/rules/amadeus-artifacts-and-examples.md、steering.md） | FR-2.2(4)、FR-2.3、NFR-3 |

あわせて編集する既存文書: `docs/amadeus/steering.md` と `README.md` に extension-guide への参照を追加（FR-2.5）。

## code-generation 向け実行方針

1. 成果物は workspace（docs/amadeus/、AMADEUS.md、README.md）へ直接書く。record 内には code-generation-plan.md / code-summary.md（ステージ既定 produces）だけを置く。
2. workspace_requires ガードは docs/ への書き込みが「source work」として数えられるため自然に満たす（requirements C-3 の実測訂正参照）。declare-docs-only は使わない。
3. 執筆順序: B001（language-policy 一式 + AMADEUS.md / skill-language-policy 編集）→ B002（extension-guide 一式 + steering.md / README 参照追加）。B002 の英語版は B001 の Cross-linking rules に従い `*.md` を参照する。
4. FR-2.3 の実測は執筆前に行い、証跡（実装ファイルと行、実 directive の rules_in_context 抜粋）を code-summary.md に残す（NFR-3）。
