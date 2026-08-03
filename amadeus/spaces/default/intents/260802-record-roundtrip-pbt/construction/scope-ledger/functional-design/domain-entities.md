# Domain Entities — scope-ledger (U6 / FR-6a)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: repo 内 file:line は **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`** の実測。Issue #1980 本文の行番号は `gh issue view 1980 --json title,body`(取得 2026-08-03)の出力に対するもの。

## 0. 型の所在についての前提

本 unit が扱う「型」は **Markdown 文書の構造**であり、TypeScript の型やスキーマではない。component-methods.md は U6 の節を持たず(`grep -c "U6"` → `0`、測定 ref = HEAD `c8702be09`)、同書 `:9` が設計対象を「コーデック正本 3 ファイル / テスト側 10 パス / 静的ガード 1 本」に限定しているとおり、本 unit にランタイム型は存在しない。したがって以下は**文書スキーマの記述**であり、実行時の検証コードを新設しない(components.md `:9` の「新規プロダクションコンポーネントはゼロ」と整合)。

他 unit の型を参照しない — 参照が生じないため cross-unit-type-verbatim-check の照合対象はない(election の `ElectionFile` / `StoreError` 等は decisions.md ADR-4 `:275` の所有であり、本 unit は触れない)。

## 1. エンティティ: ScopeLedger(台帳文書 1 件)

| 属性 | 値 | 所有 |
| --- | --- | --- |
| path | `amadeus/spaces/default/intents/260802-record-roundtrip-pbt/bug-scope-ledger.md`(固定) | components.md `:54` / requirements.md `:47` |
| measurementRef | 出典取得コマンド(`gh issue view 1980 --json title,body`)+ 取得日 | 本 unit(BR-SL-10) |
| rows | `LedgerRow` の**ちょうど 9 件**、requirements.md `:47` の列挙順 | 本 unit(BR-SL-3 / BR-SL-9) |
| notes | 出典間の相違・未割当の明示など、行に収まらない注記 | 本 unit(BR-SL-5 / BR-SL-8) |

同一性: intent record 内に台帳は **1 件のみ**存在する(unit-of-work.md `:15` が本 unit の成果物を1文書と定める)。

## 2. 値: LedgerRow(1 Issue = 1 行)

```
LedgerRow = {
  issue:      IssueRef        // 例: #1459
  summary:    string          // 1行要約(出典からの転記)
  verdict:    ScopeVerdict    // 射程内 | 部分 | 射程外
  assignee:   Assignee        // 射程外のみ実質値、他は EM DASH
  source:     SourceCite      // 判定と要約の出典
}
```

- `issue`: `#` + 数字の Issue 参照。取りうる値は 9 個の閉集合 {#1904, #1878, #1946, #1953, #1906, #1860, #1459, #1547, #1871}(requirements.md `:47` 実文 `直接根拠9件(#1904 #1878 #1946 #1953 #1906 #1860 #1459 #1547 #1871)`)。この集合外の番号は台帳に現れない(BR-SL-3)。
- `summary`: Issue #1980 本文 `## 背景・実測` の該当箇条(取得本文 `:16-24`)の転記。9 箇条は 9 Issue と 1:1 で、順序も requirements.md `:47` と一致する(実測: `:16` が #1904、`:24` が #1871)。
- `verdict`: 下記 `ScopeVerdict`。
- `assignee`: 下記 `Assignee`。
- `source`: 出典の識別子(`#1980 本文 :72` 等)。台帳では列ではなく行末括弧または脚注で表現してよいが、行ごとに解決可能であること(BR-SL-4 の5列要件は「情報として揃っていること」を意味し、レイアウトを1つに強制しない)。

## 3. 語彙(閉集合)

### 3.1 ScopeVerdict — 射程判定

```
ScopeVerdict = "射程内" | "部分" | "射程外"
```

正本は Issue #1980 本文 `:72` 実文 `- 根拠バグ: 上記9件（射程内: #1547 #1459 / 部分: #1871 #1946 / 射程外→分担: #1904 #1878 #1953 #1860 #1906）`。requirements.md `:47` 実文 `射程判定(射程内/部分/射程外→分担先)` が同じ 3 値を要求する。

分布(機械再計算 — `:72` の3群の要素数): 射程内 **2** / 部分 **2** / 射程外 **5** = **9**。

### 3.2 Assignee — 分担先

```
Assignee =
  | IssueRef                      // #1979 / #1981 など、出典に明記された Issue
  | CompositeRef                  // 複合参照 — #1906 行の実値 `#1981(主)/#1982(同族)` のように複数 Issue+役割注記を1文字列で保持(検査述語 BR-SL-5 はこの複合値をリテラルとして個別列挙する)
  | "個別修正"                     // 出典が Issue 番号でなく措置を指定した場合
  | "未割当(出典に記載なし)"        // 出典が行き先を定めていない場合
  | "—"                           // 射程内 / 部分(本 intent が担う)
```

実値の写像(出典: Issue #1980 本文 `:65` 実文 `#1878（戻り値破棄=無音化）→ #1979 no-silent-drop 静的ゲート / #1860（状態機械の到達可能性）→ #1981 形式検証 CI / #1906（並行性 → 主に #1981。テスト側の無音成功検出という面では #1982 とも同族）/ #1953（意味論的鮮度）→ 個別修正`、および requirements.md `:80` の同旨):

| Issue | verdict | assignee |
| --- | --- | --- |
| #1904 | 射程外 | 未割当(出典に記載なし) |
| #1878 | 射程外 | #1979 |
| #1946 | 部分 | — |
| #1953 | 射程外 | 個別修正 |
| #1906 | 射程外 | #1981(主)/ #1982(同族) |
| #1860 | 射程外 | #1981 |
| #1459 | 射程内 | — |
| #1547 | 射程内 | — |
| #1871 | 部分 | — |

`未割当(出典に記載なし)` は実測に基づく — Issue 本文 `:65` と requirements.md `:80` の射程外分担列挙はともに **4 件**(#1878 / #1860 / #1906 / #1953)で #1904 を含まず、`:51` 実文 `**#1904 は round-trip の射程外（env 述語の非対称・直列化を伴わない）につき候補から除外**` も行き先を定めていない。推測での補完は BR-SL-5 が禁じる。

### 3.3 SourceCite — 出典

```
SourceCite = { origin: "requirements.md" | "#1980本文", locator: string, retrievedAt?: ISO日付 }
```

`#1980本文` を origin とする引用は `retrievedAt` を必須とする(リモート本文は改稿されうる — BR-SL-10)。repo 内成果物を origin とする引用は測定 ref(HEAD SHA)で代替する。

## 4. 正規化と検証の所有

| 関心 | 所有 | 備考 |
| --- | --- | --- |
| Issue 集合の確定(9件) | requirements.md `:47`(FR-6a) | 本 unit は転記のみ。増減しない |
| 射程判定の確定 | Issue #1980 本文 `:72` | 本 unit は再判定しない(BR-SL-8) |
| 分担先の確定 | Issue #1980 本文 `:65` / requirements.md `:80` | 明記なき件は補完しない(BR-SL-5) |
| 語彙の正規化(3値・EM DASH) | 本 unit(BR-SL-2 / BR-SL-4) | 同義語を作らない |
| 行順の正規化 | 本 unit(BR-SL-9) | requirements.md `:47` の列挙順 |
| 合否検査 | 本 unit(business-logic-model.md §5 の A1〜A5) | 実行主体は執筆者 + reviewer |

**検証コードは新設しない**。台帳は機械が消費するデータではなく人間が読む記録であり、検査は §5 の grep / 行数照合という決定的手順で足りる。ここに専用の検査ツールを足すことは、components.md `:9`(新規コンポーネントゼロ)と decisions.md ADR-2 `:102`(静的ガードは **1 本**に限定 — `本 ADR は述語の中身を確定するだけで、ガードの本数や配置を棚卸しから増やさない`)の方針に反する。

## 5. 非対象の型(明示)

- `ElectionFile` / `StoreError` / `Election`(decisions.md ADR-4 `:275` の所有、U1)— 本 unit は参照も再定義もしない。
- `Census` / allowlist の `Record<file, Record<kind, count>>`(decisions.md ADR-2 `:94`、U4)— 同上。
- state の receipts / フィールド型(requirements.md `:23-24` FR-2a/2b、U3)— 同上。
- unit-of-work-dependency.md `:13-14`(`- name: scope-ledger` / `depends_on: []`)のとおり本 unit は他 unit の成果に依存せず、型の共有も生じない。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段5(根拠9件の射程判定固定と姉妹施策分担の追跡可能化)に対応する。
- services.md との関係: 本 unit は文書のみで S1/S2 に非関与(CI 面・CLI 面を持たない)。この境界確認自体を services.md のサービス面定義(S1/S2 の2面のみ)から導出した。
