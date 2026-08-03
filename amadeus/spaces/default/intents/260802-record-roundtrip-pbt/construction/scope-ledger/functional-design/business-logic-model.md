# Business Logic Model — scope-ledger (U6 / FR-6a)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: 本書の repo 内 file:line はすべて **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`**(`git rev-parse HEAD`)の実測。Issue #1980 本文の行番号は `gh issue view 1980 --json title,body`(取得 2026-08-03)の出力に対する行番号であり、リモート本文の改稿で変動しうるため、引用は必ず verbatim 断片を併記する。

## 1. 本 unit の位置づけ

本 unit は **文書1本を生成するだけの unit** であり、実行可能な振る舞い(プロダクションコード・テスト・CI)を一切持たない。

- components.md `## U6: 軽量台帳(文書)`(`:52-56`)— 所在は `amadeus/spaces/default/intents/260802-record-roundtrip-pbt/bug-scope-ledger.md`(`:54` 実文 `- **所在**: \`amadeus/spaces/default/intents/260802-record-roundtrip-pbt/bug-scope-ledger.md\`(requirements.md FR-6a が指定するパス)。`)、責務は `:55` 実文 `- **責務**: 直接根拠9件の Issue 番号 + 各件の射程判定1行。`、推定規模は `:56` 実文 `- **推定規模**: **40〜60 行**。依存なし。`。
- unit-of-work.md `:15` 実文 `| **scope-ledger** | AD U6(\`bug-scope-ledger.md\` — 9件+射程判定) | FR-6a | doc 40〜60行 |` — 対応 FR は FR-6a のみ。
- component-methods.md は **U6 の節を持たない**(不在主張の反証確認: `grep -c "U6" .../application-design/component-methods.md` → `0`、測定 ref = HEAD `c8702be09`)。同書 `:9` が設計対象を「(1) コーデック正本の 8 ファイル中 **3 ファイル** … (2) テスト側 10 パスへの新規追加、(3) 静的ガード 1 本」と限定しているとおり、本 unit には関数シグネチャ水準の設計面が存在しない。したがって本書が固定するのは **関数の振る舞いではなく文書の構造と生成手順**である。
- decisions.md の ADR-1〜4(`:272-275` の裁定サマリ表)はいずれも import 流儀・静的ガード述語・CI ジョブ配置・election 読み側パーサという**コード面の裁定**であり、本 unit に実装制約を課さない。ただし ADR-4(`:275` 実文 `| ADR-4 | election の読み側検証は **store 内 private \`parseElectionFile\`** に置き、\`Store.load\` と \`Store.setState\` の2読み口が経由する。汎用 \`readJson\` は変更しない。 |`)が election 境界を本 intent の実装対象として確定していることは、台帳の #1459 行が「射程内」である判定と整合する(§4 の整合検査 C-3)。

## 2. 対象境界と出典(正本の所在)

台帳の内容はすべて **既存の確定物からの転記**であり、本 unit で新しい分類判断を行わない。出典は3系統に固定する。

| 情報 | 正本の所在 | verbatim 断片(引用の実在) |
| --- | --- | --- |
| 対象 9 件の Issue 番号と順序 | requirements.md `:47`(FR-6a) | `直接根拠9件(#1904 #1878 #1946 #1953 #1906 #1860 #1459 #1547 #1871)+射程判定(射程内/部分/射程外→分担先)を` |
| 各件の1行要約 | Issue #1980 本文 `## 背景・実測` の箇条 9 行(取得本文 `:16-24`) | `- #1459（CLOSED 2026-07-26）Election.parse が重複 internalNo/重複 voter/空 choices を無音受理し tally 汚染` |
| 各件の射程判定 | Issue #1980 本文 `## 関連` の分類行(取得本文 `:72`) | `- 根拠バグ: 上記9件（射程内: #1547 #1459 / 部分: #1871 #1946 / 射程外→分担: #1904 #1878 #1953 #1860 #1906）` |
| 射程外の分担先 | Issue #1980 本文 `## 非目標と分担`(取得本文 `:65`)/ requirements.md `:80`(Out of scope) | `#1878（戻り値破棄=無音化）→ #1979 no-silent-drop 静的ゲート / #1860（状態機械の到達可能性）→ #1981 形式検証 CI / #1906（並行性 → 主に #1981。テスト側の無音成功検出という面では #1982 とも同族）/ #1953（意味論的鮮度）→ 個別修正` |

**射程判定の正本は Issue #1980 本文 `:72` の分類**である(1次)。requirements.md `:80` と Issue 本文 `:65` は射程外 4 件の分担先のみを与える(2次、`:72` と矛盾しない部分集合)。

## 3. 処理フロー(文書生成の手順 — ASCII)

```
[S0] 未着手
      | 出典3系統を実読(requirements.md:47 / #1980 本文 :16-24, :65, :72)
      v
[S1] 出典確定       — 9件の番号・要約・判定・分担先を転記元から採取(推測・記憶からの補完は禁止)
      | 判定写像 M を適用(§4)
      v
[S2] 行集合確定     — 9行(1 Issue = 1行)、過不足なし
      | 文書書出(パスは components.md:54 の指定に厳密一致)
      v
[S3] 生成済み       — bug-scope-ledger.md が実在
      | 合否検査 A1〜A3(§5)を機械実行
      v
[S4] 受入可 / 不可  — A1〜A3 全通過で受入可。1つでも不通過なら S1 へ戻す(部分受理を作らない)
```

状態は上記 S0〜S4 の5値で、後戻りは S4(不可)→ S1 のみ。中間状態 S2 で止めた文書(行が欠けた台帳)を成果物として提出しない — 本 intent 全体の主題である fail-closed の姿勢を、文書生成側でも同じ形で守る。

## 4. 判定写像 M(Issue 番号 → 射程判定)

出典 `:72` を機械的に写した固定表である。FD 段でこの表を固定し、実装(執筆)段では**判定を再導出しない**。

| # | Issue | 射程判定 | 分担先 |
| --- | --- | --- | --- |
| 1 | #1904 | 射程外 | 出典に明記なし(§BR-SL-5 に従い「未割当」と書く) |
| 2 | #1878 | 射程外 | #1979 |
| 3 | #1946 | 部分 | — |
| 4 | #1953 | 射程外 | 個別修正(Issue 番号の指定なし) |
| 5 | #1906 | 射程外 | #1981(主)/ #1982(同族) |
| 6 | #1860 | 射程外 | #1981 |
| 7 | #1459 | 射程内 | — |
| 8 | #1547 | 射程内 | — |
| 9 | #1871 | 部分 | — |

行の並び順は requirements.md `:47` の列挙順(#1904 → #1871)に一致させる。件数の機械再計算: 射程内 2(#1459 #1547)+ 部分 2(#1946 #1871)+ 射程外 5(#1904 #1878 #1953 #1906 #1860)= **9**(出典 `:72` の3群の要素数の和と一致)。

#1904 の分担先が出典に無いことは実測である — Issue 本文 `:65` と requirements.md `:80` の射程外分担列挙はいずれも **4 件**(#1878 / #1860 / #1906 / #1953)で #1904 を含まない。#1980 本文 `:51` は #1904 を `**#1904 は round-trip の射程外（env 述語の非対称・直列化を伴わない）につき候補から除外**` と射程外に置くのみで、行き先を定めていない。推測で番号を補わない(BR-SL-5)。

## 5. 不変量と合否(FR-6a の逐語)

requirements.md `:47` 末尾 実文: `合否 = 当該パスの実在+9件全 Issue 番号の記載+各件の射程判定1行。`

| ID | 不変量 | 検査(機械) |
| --- | --- | --- |
| A1 | 指定パスに文書が実在する | `test -f amadeus/spaces/default/intents/260802-record-roundtrip-pbt/bug-scope-ledger.md` |
| A2 | 9 件の Issue 番号がすべて記載されている | 9 番号それぞれの `grep -c` が 1 以上、かつ番号の異なり数が 9 |
| A3 | 各件に射程判定が1行ある | 台帳表の行数が 9、各行の判定列が語彙 3 値のいずれか(BR-SL-2) |
| A4 | 対象外の Issue を足していない | 表の行数 = 9(44 件全量の分類は #1979 の担当 — requirements.md `:47` `44件全量は #1979 へ` / `:81` `44件全量の分類台帳化(#1979 へ)`) |
| A5 | 判定が出典と一致する | §4 の写像表と台帳の判定列が全 9 行で一致 |

A1〜A3 は FR-6a の逐語、A4・A5 は出典逸脱を防ぐための派生検査であり、FR-6a の合否を緩めない(追加のみ)。

## 6. 依存と並行性

- unit-of-work-dependency.md の YAML edge block(`:13-14` 実文 `  - name: scope-ledger` / `    depends_on: []`)のとおり **依存なし**。
- 同書 `:40` 実文 `- **batch 2(並行可)**: state-pbt / scope-ledger / mirror-property(Could) — 相互にファイル非交差(state-pbt は tests/unit+helpers、scope-ledger は record 直下、mirror-property は t274+helpers。helpers 内は別ファイル)。` — 本 unit の書込面は record 直下 1 ファイルのみで、他 unit と交差しない。
- unit-of-work.md `:23` 実文 `- **state-pbt / scope-ledger / mirror-property**: 相互にファイル非交差・依存なしで独立実装可能。`
- 本 unit は `packages/framework/core/` を触らないため、unit-of-work.md `:29` が election-readpath に課す投影条件(dist 7 ハーネス再生成・`dist:check` / `promote:self:check`)は**適用されない**。NFR-1〜NFR-5(requirements.md `:55-59`)のうち本 unit に掛かるのは NFR-5(既存ブロッキング集合の全緑維持 = 文書追加で壊さないこと)のみである。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段5(根拠9件の射程判定固定と姉妹施策分担の追跡可能化)に対応する。
- services.md との関係: 本 unit は文書のみで S1/S2 に非関与(CI 面・CLI 面を持たない)。この境界確認自体を services.md のサービス面定義(S1/S2 の2面のみ)から導出した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T18:26:05Z
- **Iteration:** 1
- **Scope decision:** none

FR-6a↔BR 整合・出典一本化・#1904 未割当判断は妥当だが、BR-SL-5 の機械検査述語の許容集合に #1860 行の実値 #1981(単独)が欠落し、正しい転記を誤判定する Major 1件で REVISE(GoA 5)。Minor 1件(Assignee 型の複合値表現)。

### Findings

- [Major] business-rules.md BR-SL-5 — 許容集合 {#1979, #1981(主)/#1982(同族), 個別修正, 未割当} に #1981 単独(#1860 行の実値)が欠落 — 写像表と数え合わず false negative を生む
- [Minor] domain-entities.md Assignee 型 — 複合値 #1981(主)/#1982(同族) を型として表現できていない

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T18:27:16Z
- **Iteration:** 2
- **Scope decision:** none

是正2件とも閉包確認(GoA 2)。BR-SL-5 許容集合+写像表+実値写像の3面が9行で完全一致、CompositeRef 追加で複合値表現可。是正 diff に新規誤りなし。

### Findings

- None
