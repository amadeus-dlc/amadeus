# Business Rules — scope-ledger (U6 / FR-6a)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: repo 内 file:line は **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`** の実測。Issue #1980 本文の行番号は `gh issue view 1980 --json title,body`(取得 2026-08-03)の出力に対するもの。

## 適用範囲

本書のルールは `amadeus/spaces/default/intents/260802-record-roundtrip-pbt/bug-scope-ledger.md`(components.md `:54` が指定するパス)の**記載規則**を定める。ルールはすべて機械検査可能な述語として書く — 本 unit にはコードが無く(component-methods.md に U6 節が不在: `grep -c "U6"` → `0`)、reviewer が実行できる検査だけが契約の担保になるためである。

## ルール表

| ID | ルール | 検査(テスト可能な形) | 根拠 |
| --- | --- | --- | --- |
| **BR-SL-1** | 台帳は指定パス `amadeus/spaces/default/intents/260802-record-roundtrip-pbt/bug-scope-ledger.md` に置く。別名・別ディレクトリへ置かない | `test -f <指定パス>` が真 | requirements.md `:47` `合否 = 当該パスの実在+…`、components.md `:54` |
| **BR-SL-2** | 射程判定の語彙は **`射程内` / `部分` / `射程外` の3値**に限る。「対象外」「保留」等の同義語・第4の値を作らない | 判定列の異なり値集合 ⊆ {射程内, 部分, 射程外} | requirements.md `:47` `射程判定(射程内/部分/射程外→分担先)` |
| **BR-SL-3** | 対象は **9件ちょうど**(#1904 #1878 #1946 #1953 #1906 #1860 #1459 #1547 #1871)。行の追加・削除をしない。44件全量の分類は本台帳の責務ではない | 台帳表の行数 = 9 かつ Issue 番号の異なり数 = 9 | requirements.md `:47`(`44件全量は #1979 へ`)、`:81` `44件全量の分類台帳化(#1979 へ)` |
| **BR-SL-4** | 各行は **Issue 番号 / 1行要約 / 射程判定 / 分担先 / 根拠(出典)** の5列をすべて埋める。空欄は `—` を明示的に置く(セルの省略をしない) | 全行のセル数が一定(5)、空文字セル 0 件 | requirements.md `:47` `9件全 Issue 番号の記載+各件の射程判定1行` |
| **BR-SL-5** | 判定が `射程外` の行には分担先を書く。分担先として書けるのは **出典に明記された Issue 番号または明記された措置語**のみで、明記が無い件は `未割当(出典に記載なし)` と書く。推測で Issue 番号を補わない | 射程外 5 行の分担先列が {#1979, #1981, #1981(主)/#1982(同族), 個別修正, 未割当(出典に記載なし)} のいずれか(#1981 単独は #1860 行の実値 — business-logic-model.md §4 写像表と一致)。#1904 行に Issue 番号が現れない | Issue #1980 本文 `:65`、requirements.md `:80`。両者とも射程外の分担列挙は #1878 / #1860 / #1906 / #1953 の **4件**で #1904 を含まない(実測) |
| **BR-SL-6** | 判定が `射程内` / `部分` の行の分担先は `—`(本 intent が担う)とする。姉妹 Issue 番号を書かない | 射程内2行・部分2行の分担先列がすべて `—` | Issue #1980 本文 `:72` は射程内・部分に分担先を与えていない |
| **BR-SL-7** | 1行要約は Issue #1980 本文 `## 背景・実測` の該当箇条(取得本文 `:16-24`)からの**転記**とする。要約の新規執筆・言い換えによる意味の追加をしない(記憶からの再構成は禁止) | 各行の要約に出典箇条の核心部分文字列(例 #1459 なら `重複 internalNo`)が現れる | 実測転記のみの規律。cid:requirements-analysis:numbers-from-command-output-only の列挙面、cid:requirements-analysis:mechanism-cite-verify-at-draft |
| **BR-SL-8** | 射程判定は Issue #1980 本文 `:72` の分類行を**唯一の正本**とし、台帳側で再判定しない。`:72` と `:65` / requirements.md `:80` が食い違う場合は `:72` を採り、相違を台帳の注記へ書く | 台帳の判定列が business-logic-model.md §4 の写像表と全9行一致 | Issue #1980 本文 `:72`(`射程内: #1547 #1459 / 部分: #1871 #1946 / 射程外→分担: #1904 #1878 #1953 #1860 #1906`) |
| **BR-SL-9** | 行の並び順は requirements.md `:47` の列挙順(#1904 → #1878 → #1946 → #1953 → #1906 → #1860 → #1459 → #1547 → #1871)に一致させる。判定でソートし直さない | 表の Issue 番号列が上記順序と一致 | requirements.md `:47` の列挙 |
| **BR-SL-10** | 出典引用には**取得日と取得コマンド**を台帳冒頭に明記する。Issue 本文はリモートで改稿されうるため、行番号だけの引用にしない | 台帳冒頭に `gh issue view 1980` と取得日を含む測定 ref 行が実在 | cid:reverse-engineering:measurement-ref-in-artifacts |
| **BR-SL-11** | 台帳に修正方針・設計判断・実装計画を書かない(分類台帳であり設計文書ではない)。射程内2件の実装契約は requirements.md FR-1 / FR-4d と decisions.md ADR-4 が正本 | 台帳に `## 設計` / `## 実装` 相当の節が存在しない。実装契約の記述は上流への参照1行に留まる | components.md `:55` が責務を `直接根拠9件の Issue 番号 + 各件の射程判定1行` に限定。decisions.md `:275`(ADR-4)が election 実装契約の正本 |
| **BR-SL-12** | 分量は **40〜60行**を目安とし、超過する場合は要約を削って行数を保つのではなく、余剰の散文節を落とす(9行の表と出典注記が核) | `wc -l` が 40〜60 の範囲(逸脱時は理由を1行注記) | components.md `:56` `- **推定規模**: **40〜60 行**。依存なし。`、unit-of-work.md `:15` `doc 40〜60行` |
| **BR-SL-13** | 書込面は本台帳1ファイルのみ。他 unit の面(`tests/`、`.github/workflows/`、`packages/`)へ触れない | 本 unit の Bolt の `git diff --name-only` が record 配下のみ | unit-of-work-dependency.md `:40`(batch 2 の非交差判定 `scope-ledger は record 直下`)、`:13-14`(`depends_on: []`) |

## 合否契約(受入判定)

FR-6a の逐語(requirements.md `:47`)`合否 = 当該パスの実在+9件全 Issue 番号の記載+各件の射程判定1行。` を、上表の BR-SL-1(パス実在)/ BR-SL-3(9件全数)/ BR-SL-2+BR-SL-4(各件1行の判定)がそのまま担う。他のルールはこの3条件を**緩めず**、出典逸脱と推測混入を防ぐ方向にのみ働く。

## 適用外(明示)

- decisions.md の ADR-1(import 流儀)/ ADR-2(AST 述語・allowlist 粒度)/ ADR-3(CI ジョブ配置)は、いずれもコード・CI 面の裁定であり本 unit の記載規則には作用しない(`:272-274` の裁定サマリ)。ADR-4 のみが射程内判定の整合根拠として §BR-SL-11 に現れる。
- PBT の4項規約(component-methods.md `## 全メソッド共通の規約(FR-4c)`)は本 unit に適用されない — 本 unit はテストを持たない。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段5(根拠9件の射程判定固定と姉妹施策分担の追跡可能化)に対応する。
- services.md との関係: 本 unit は文書のみで S1/S2 に非関与(CI 面・CLI 面を持たない)。この境界確認自体を services.md のサービス面定義(S1/S2 の2面のみ)から導出した。
