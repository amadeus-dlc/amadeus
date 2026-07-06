# Requirements — 260706-lifecycle-inputs（Issue #510+#511+#512+#513+#514）

上流入力: [business-overview.md](../../../../../codekb/amadeus/business-overview.md)、[architecture.md](../../../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../../../codekb/amadeus/code-structure.md)（codekb 採用 = reverse-engineering）、Intake の decision 転記 2 件（承認 4 項目、束ね判断）

## 前提実測（Issue 記述との差異を含む）

対象 6 文書は `docs/amadeus/lifecycle/`（overview.md、ideation.md、inception.md、construction.md、scopes.md、state.md）である。着手時の実測は次のとおり。

1. phase 別 3 文書の全ステージ（ideation 7、inception 8、construction 7）は、`### Inputs` と `### Outputs` の対を**既に持つ**（2026-07-03 の dfe8eacf = #387 で追加済み）。Issue #511〜513 の背景記述「Inputs が明示されていない」は、見出しレベルでは現状と一致しない。
2. ただし既存 Inputs 表は実測駆動になっていない。GD009 で廃止済みの「Intent のモジュールファイル」への参照が広範囲に残る（全文 grep による実測、行番号は着手時点）。
   - ideation.md: Inputs 表 5 ステージ（1.2 = 107 行、1.3 = 144 行、1.4 = 185 行、1.6 = 265 行、1.7 = 304 行）、Stage 1.1 の Outputs 表（74 行）、Purpose/Notes の散文 3 箇所（57、81、82 行）。
   - inception.md: Stage 2.3 の Inputs 表（150 行）。
   - construction.md: なし。
   - overview.md: 成果物配置と v2 差分の 4 箇所（27、169、203、217 行）。
   - scopes.md: Units Generation の縮退記述 1 箇所（111 行）。
   エンジン実態（stage frontmatter の consumes、rules_in_context、upstream-coverage sensor の参照関係）との突き合わせも行われていない。
3. overview.md には I/O 記法の定義節が**存在しない**（Issue #510 の前提は現状と一致する）。
4. scopes.md と state.md はステージ単位の文書ではなく、Inputs 欄の適用形が自明でない（Issue #514 の前提は現状と一致する）。

この実測により、#511〜513 の作業の実体は「不在の Inputs を新規追記する」ではなく「**既存 Inputs 表を #510 の記法へ揃え、エンジン実態との実測突き合わせで検証・補正する**」である。各 Issue の受け入れ条件（全ステージが Inputs と Outputs を対で持つ、記載した Inputs が実在する = 実測裏付け）はこの読み替えでそのまま満たせる。

## 機能要求

### FR-1: I/O 記法の定義（#510、B001）

- FR-1.1: overview.md に I/O 記法の定義節を追加する。ステージ契約の Inputs（読む成果物、上流ステージ、steering/memory 参照、前提）と Outputs（produces）を対で書く形式・粒度・語彙を定める。
- FR-1.2: 記法は既存 3 文書の表形式（`| Artifact | 必須 | 供給元 |`）を出発点にし、エンジン実態との対応（frontmatter の consumes/produces、rules_in_context、upstream-coverage sensor）を定義に含める。実在しない入力を書かない規律を記法の一部として明文化する。
- FR-1.3: 記法定義は英語化（#515〜520）後も成立する形にする（表の構造・列の意味を言語非依存に定義し、ラベルの対訳を固定できる形にする）。

### FR-2: phase 別 3 文書の Inputs 整合（#511〜513、B002）

- FR-2.1: ideation.md / inception.md / construction.md の全ステージの Inputs 表を、FR-1 の記法へ揃える。
- FR-2.2: 各ステージの Inputs をエンジン実態から実測する。実測源は (a) `.claude/amadeus-common/stages/<phase>/<stage>.md` の frontmatter（consumes）、(b) 対応する run-stage directive の rules_in_context、(c) upstream-coverage sensor の参照関係、(d) ステージ skill の実手順とする。
- FR-2.3: 実測と一致しない既存記載（前提実測 2 の GD009 残存を含む）は補正し、実測時の参照 path・frontmatter 抜粋と補正内容を単一の成果物「実測・補正記録」に記録する（FR-4.2 の実測記録と同一成果物）。推測で入力を追加しない。
- FR-2.4: Outputs 表と散文の全面見直しは本 Intent の対象外とする。ただし Inputs 補正の副作用で文書内の自己矛盾が生じる箇所（例: ideation.md Stage 1.1 の Outputs 表と Notes 散文が、どのステージも入力として要求しなくなるモジュールファイルを現行仕様として生成し続ける記述）は、矛盾を残さない最小範囲で Outputs・散文も補正する。overview.md と scopes.md の GD009 残存は、B001 / B003 が同じ最小補正原則で扱う。

### FR-3: scopes.md / state.md の適用可否（#514、B003）

- FR-3.1: scopes.md と state.md について、Inputs 観点（それぞれの契約が何を入力として参照するか）の適用・不適用を理由付きで確定する。
- FR-3.2: 適用する場合は FR-1 の記法（または文書性質に合わせた縮退形）で追記し、不適用の場合は理由を本 Intent の成果物に記録する。

### FR-4: 検証

- FR-4.1: PR 作成前に validator（Intent 指定）と `npm run test:all` を実行し、結果を記録する。
- FR-4.2: 記載した Inputs の実在性は、実測時に参照した path・frontmatter の抜粋を「実測・補正記録」（FR-2.3 と同一成果物）に残すことで裏付ける。

## 制約

- 変更対象は `docs/amadeus/lifecycle/` の 6 文書のみとする（進行中 Intent と非接触）。エンジン・skill・validator は変更しない。
- 言語は language-policy.md に従う。英語化（#515〜520）は本 Intent の後のため、本文は現状の日本語のまま書く。記法定義は FR-1.3 により英語化後も成立させる。
- path 表記は rename 後（`amadeus/`、`amadeus-state.md`、`.claude/amadeus-common/` など）を正とする。
- Bolt は B001（FR-1）→ B002（FR-2）→ B003（FR-3）の直列とする（#510 の記法確定が #511〜514 の上流）。

## 受け入れ条件（Issue 対応）

| Issue | 受け入れ条件 | 対応 FR |
|---|---|---|
| #510 | overview.md に I/O 記法の定義節があり、phase 別文書の Inputs が同じ記法で書ける | FR-1 |
| #511 | ideation.md の全ステージが Inputs と Outputs を対で持ち、Inputs が実在する成果物である（実測裏付け） | FR-2 |
| #512 | inception.md について同上 | FR-2 |
| #513 | construction.md について同上 | FR-2 |
| #514 | scopes.md と state.md の適用・不適用が理由付きで確定し、適用分は追記されている | FR-3 |
