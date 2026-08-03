# Frontend Components — scope-ledger (U6 / FR-6a)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: repo 内 file:line は **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`** の実測。

## N/A — 本 unit は UI を持たない

本 unit の成果物は Markdown 文書 1 本のみであり、画面・コンポーネント・対話要素を一切持たない。根拠は上流3点の実測である: components.md `:52-56` の U6 は種別 `doc`(`:80` 実文 `| U6 | doc | 40〜60 |`)で、責務は `:55` 実文 `- **責務**: 直接根拠9件の Issue 番号 + 各件の射程判定1行。` に限定される。unit-of-work.md `:15` 実文 `| **scope-ledger** | AD U6(\`bug-scope-ledger.md\` — 9件+射程判定) | FR-6a | doc 40〜60行 |` も同じ種別を与える。component-methods.md には U6 の節が存在せず(不在主張の反証確認: `grep -c "U6" .../component-methods.md` → `0`)、同書 `:9` は設計対象を「コーデック正本 3 ファイル / テスト側 10 パス / 静的ガード 1 本」に限定している。CLI も持たないため、CLI 文言・exit code の契約も生じない(CLI 出力契約を持つのは U4 の静的ガードであり、本 unit ではない)。decisions.md の ADR-1〜4(`:272-275`)にも UI・出力面の裁定はない。unit-of-work-dependency.md `:13-14`(`- name: scope-ledger` / `depends_on: []`)のとおり他 unit の出力面にも接続しない。

## 代替の出力契約 — 生成物の md 構造

UI の代わりに、本 unit が満たすべき利用者向けの契約は **生成する Markdown の構造**である。以下を出力契約とする(検査規則の詳細は business-rules.md の BR-SL-1〜13)。

### 節構造(H2)

| 節 | 必須 | 内容 |
| --- | --- | --- |
| `# Bug Scope Ledger — record-roundtrip-pbt (#1980)` (H1) | 必須 | 表題 |
| 測定 ref 行(見出し直下の1段落) | 必須 | 出典取得コマンド `gh issue view 1980 --json title,body` と取得日(BR-SL-10) |
| `## 射程判定` | 必須 | 9 行の表(下記の列契約)。台帳の核 |
| `## 出典` | 必須 | requirements.md `:47` / Issue #1980 本文 `:16-24` `:65` `:72` の3系統と、判定の正本が `:72` である旨(BR-SL-8) |
| `## 注記` | 条件付き必須 | 出典間の相違、`未割当(出典に記載なし)` の理由(#1904)。該当が無ければ省略可 |

required-sections センサーの H2 floor(≥2)は `## 射程判定` + `## 出典` で満たす。

### 表の列契約(`## 射程判定`)

```
| Issue | 要約 | 射程判定 | 分担先 | 出典 |
```

- 行数はヘッダ・区切りを除いて **9**(BR-SL-3)。
- 並び順は `#1904 / #1878 / #1946 / #1953 / #1906 / #1860 / #1459 / #1547 / #1871`(requirements.md `:47` の列挙順、BR-SL-9)。
- `射程判定` 列の値は `射程内` / `部分` / `射程外` の3値のみ(BR-SL-2)。
- `分担先` 列は射程外の行のみ実値、射程内・部分の行は `—`(BR-SL-5 / BR-SL-6)。
- 空セルを作らず、値が無い箇所は `—` を明示する(BR-SL-4)。

### 全体の様式

- 言語は日本語(`amadeus/**/*.md` の言語規約)。Issue 番号・コマンド・ファイルパス・コード識別子は原文のまま保持する。
- 分量は 40〜60 行を目安(components.md `:56` / unit-of-work.md `:15`、BR-SL-12)。
- 設計判断・実装計画は書かない(BR-SL-11)。読者が台帳から得るのは「どの Issue が本 intent の射程で、射程外はどこへ行くか」の一覧のみである。

### 受入(利用者から見た合否)

requirements.md `:47` 実文 `合否 = 当該パスの実在+9件全 Issue 番号の記載+各件の射程判定1行。` — 指定パスの実在、9 件全番号の記載、各件の判定 1 行。検査手順は business-logic-model.md §5 の A1〜A5。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段5(根拠9件の射程判定固定と姉妹施策分担の追跡可能化)に対応する。
- services.md との関係: 本 unit は文書のみで S1/S2 に非関与(CI 面・CLI 面を持たない)。この境界確認自体を services.md のサービス面定義(S1/S2 の2面のみ)から導出した。
