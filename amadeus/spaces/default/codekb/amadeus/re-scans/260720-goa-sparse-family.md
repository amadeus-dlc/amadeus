# re-scan 記録 — 260720-goa-sparse-family

## 実行メタデータ

- Date: 2026-07-20(Asia/Tokyo)
- Intent: `260720-goa-sparse-family`
- Issue: [#1254](https://github.com/amadeus-dlc/amadeus/issues/1254)(parseGoaLine が team.md のサブ問別スパース GoA 表記を読めない)/ [#1255](https://github.com/amadeus-dlc/amadeus/issues/1255)(GoaLineCode 単節制約の撤去)/ [#1257](https://github.com/amadeus-dlc/amadeus/issues/1257)(ECODE_RE 複節整合)
- Scope / project type: `bugfix` / Brownfield
- Repository / stage: `amadeus` / `reverse-engineering`(2.1)
- Base commit: `a326f47bc0146a3b4285552f42b92fd61fb343a7`
- Observed commit: `71f67f4873210975823801b4603580ed99e248a8`(現 HEAD、`git rev-parse HEAD` 実測一致)
- Base selection: 全 `re-scans/*.md` の Observed のうち HEAD 祖先で距離最小を採用(`git merge-base --is-ancestor a326f47bc HEAD` **exit 0**、`git rev-list --count a326f47bc..HEAD`=**28**)。直近 re-scan(`260720-ballot-received-at`)の Observed `37f8cf5e6…` は `git merge-base --is-ancestor 37f8cf5e6 HEAD` **exit 1**(非祖先 = 並行 worktree の squash tip)で除外(rescan-base-ancestry 準拠)。よって前 intent `260719-tally-choice-ruling` と同一 base=`a326f47bc`。
- 測定 ref: 特記なき件数・file:line は Observed=HEAD `71f67f487` のワークツリー実ファイル直読(measurement-ref-in-artifacts 準拠)。
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。区間 `a326f47bc..HEAD`(28コミット)には #1256 / #1268 / #1273 / #1277 の着地を含む。
- Focus: GoA 行スキーマの三連課題を対象に、#1256(head regex 複節許容)着地**後**の実残欠陥を確定 —(1)`amadeus-norm-metrics.ts` の GoA parse(`GOA_HEAD_RE`/`GOA_TOKEN_RE`/bin 段/`parseGoaLine`)がスパース表記へ届くか、(2)`ECODE_RE` の複節整合(#1257)、(3)`amadeus-election-record.ts` の `GoaLineCode` 単節制約(#1255)、(4)team.md 実 corpus の occurrence 単位 parse 対照、(5)選挙 store 圧縮形との後方互換材料、(6)テスト blast radius。
- 実施体制: Developer code scan → Architect synthesis(codekb 合成・timestamp 反映は後続)。

## 結論

**#1256(head regex 複節許容、`aaea9f636`)が既に着地しており、GoA 行の HEADFAIL は corpus 全17 occurrence で解消済み(headFail=0)。しかし本 intent の一次課題である #1254 は未解決** — team.md の実 GoA 行はすべてサブ問別スパース表記(`c1 1x2 2x1 / c2 …`)であり、`parseGoaLine` は canonical 8-bin 形しか受理しないため、17 occurrence が全て **bin 段(`amadeus-norm-metrics.ts:697` `tokens.length !== 8`)で BINFAIL** に落ちる。実測: `parseGoaLine` 直呼びで **pass=0 / headFail=0 / binFail=17**。

前 re-scan(`260719-goa-multiseg-ecode.md`)時点(#1256 未着地)は pass=0/headFail=8/binFail=1 だった。#1256 着地で HEADFAIL の8行が全て BINFAIL 側へ移り、**「head を直しても bin 段でスパース表記が落ちる」という #1256 の RE 予測(regex-only では不十分)がそのまま実現**した状態。原因の所在は #1112(GoA 行スキーマ導入 Bolt 2)の**設計** — スキーマを canonical 8-bin・非スパースに固定し、team.md の実様式(サブ問別スパース)と照合しなかった点。#1256 は必要条件(head 複節)を満たしたが十分条件(スパース bin)には未到達。

付随2課題:
1. **#1257(ECODE_RE 複節不整合)は実在の潜在欠陥**。`ECODE_RE = /\bE-[A-Z0-9]+/g`(:131)は複節コードを第1節で切り詰める(`E-SDE-CG4` → `E-SDE`)。#1256 で `GOA_HEAD_RE`/`PM_CID_RE` は複節許容へ揃えられたが、ECODE_RE は取り残された非対称(symmetric-pair-review クラス)。現状 `ecodeCount`(:393 総数カウント)としての**数値は偶然正しい**(切詰トークンに `E-` が残らず二重計上しない)が、captured token が truncate されており、distinct-code 列挙等へ転用すれば破綻する。
2. **#1255(GoaLineCode 単節制約)は #1254 の裁定に連動**。`amadeus-election-record.ts:34` の `GOA_LINE_CODE_RE=/^E-[A-Z0-9]+$/` は複節 code を write 段で拒否し、コメント(:28-31)で「compressed alnum 形を渡す運用=#1226 gap」と明記。#1254 が parseGoaLine を複節+スパース対応へ根治すると、この single-segment compression workaround の存在理由が消える。t238:97-98 が現制約をピン留めしている。

## consumer / 配布経路(対称棚卸し)

| 面 | 経路(file:line、verbatim) | 観測結果 |
| --- | --- | --- |
| head schema | `amadeus-norm-metrics.ts:162` `GOA_HEAD_RE = /^GoA\[(E-[A-Z0-9]+(?:-[A-Z0-9]+)*)\]:\s*(.+)$/` | #1256 で複節許容済み。head は corpus 全通過 |
| bin token | `:163` `GOA_TOKEN_RE = /^([1-8])x(\d+)$/` | 単一 bin トークン。サブ問ラベル `c1`/`/` は非対応 |
| bin 段判定 | `:697` `if (tokens.length !== 8) return { ok: false, error: ... got ${tokens.length} }` | **スパース表記の落ち口**。空白 split 後の要素数が8でないと fail |
| parse 関数 | `:693-706` `parseGoaLine` / `:709-713` `parsePmCidLine` | export 純関数。fail-closed(never estimates) |
| スキーマコメント | `:159-161`「team.md real corpus also carries a sparse per-subquestion form (`c1 1x2 2x1 / c2 ...`) that this parse does NOT cover … tracked separately as its own Issue」 | **#1254 を名指ししていない**(「its own Issue」の総称表現)。修正時に #1254 明記が必要 |
| ECODE_RE | `:131` `const ECODE_RE = /\bE-[A-Z0-9]+/g;` | **複節非整合(#1257)**。`E-SDE-CG4`→`E-SDE` に truncate |
| ECODE_RE 消費 | `:393` `state.ecodeCount += countMatches(text, ECODE_RE);`(`countMatches` :254-257 = `text.match(re)?.length ?? 0`) | 総数カウント。数値は偶然正しいが token は切詰 |
| GoaLineCode 制約 | `amadeus-election-record.ts:34` `const GOA_LINE_CODE_RE = /^E-[A-Z0-9]+$/;` / コンパニオン `:36-41`(`parse` fail-closed) | 複節 code を write 段で拒否(#1255 対象) |
| GoaLineCode コメント | `:28-31`「Multi-segment codes like `E-SDE-CG4` are rejected here … the hyphenated-corpus gap is Issue #1226」 | #1226 参照のまま(#1255 未反映) |
| renderGoaLine | `:77-80` `const bins = freq.map((n, i) => `${i + 1}x${n}`).join(" "); return `GoA[${code}]: ${bins}`;` | 常に **8-bin canonical 形**(0 含む全 bin 列挙、BR-R1) |
| GoaLineCode 消費側 | `amadeus-election.ts:241` `const code = GoaLineCode.parse(parsed.value.electionId);`(handleOpen)/ `:374` `const code = GoaLineCode.parse(electionId);`(handleRender) | electionId を code 制約へ通す。fail 時 `:242` `open: electionId is not a valid GoA-line code (^E-[A-Z0-9]+$)` |
| live consumer | `amadeus-norm-metrics.ts` の `parseGoaLine`/`parsePmCidLine` は `collectMetrics`/`distillCandidates` から内部呼び出し**なし**(前 re-scan 実測、区間内 aggregation 未実装のまま) | 週次蒸留は parse-only。GoA 集計は NOT COLLECTED |
| 配布 | 正本1 + `find dist .claude .codex .cursor .opencode -name amadeus-norm-metrics.ts`=**10**(dist6 + self-install4)= 計11コピー。`scripts/amadeus-election*.ts` は配布**0**(repo-local dev tool、gh-scripts-boundary) | norm-metrics 修正は正本編集→`bun scripts/package.ts`+`bun run promote:self` で同期。election scripts 修正は dist 再生成不要 |

## team.md 実 GoA 行 occurrence 単位対照(全17)

`grep -oE 'GoA\[E-[A-Z0-9-]+\]' amadeus/spaces/default/memory/team.md | sort | uniq -c`=distinct 17、`… | wc -l`=17。occurrence 単位で本文の GoA 行を切り出し、現行 `parseGoaLine` を bun で直呼びした3値対照(書式説明トークン `GoA[E-<code>]` は本文に不在のため全て実データ):

| # | E-code | 表記(verbatim 抜粋) | 様式 | parse(実測) |
| --- | --- | --- | --- | --- |
| 1 | `E-TCRCGS13` | `1x1 2x2` | スパース単節(ラベルなし) | BINFAIL `got 2` |
| 2 | `E-BFACG` | `1x1 2x2` | スパース単節 | BINFAIL `got 2` |
| 3 | `E-SDE-CG4` | `c1 1x2 2x1 / c2 1x2 2x1` | サブ問スパース(複節 code) | BINFAIL `got 7` |
| 4 | `E-SDE-FD` | `c1 1x1 2x2` | サブ問スパース | BINFAIL `got 3` |
| 5 | `E-BFAADS13` | `2x2` | スパース単節 | BINFAIL `got 1` |
| 6 | `E-SMF-AD13` | `c1 1x2 2x1 / c2 1x3` | サブ問スパース | BINFAIL `got 6` |
| 7 | `E-MTR-CG` | `C1 1x2 2x1 / C2 1x1 2x2` | サブ問スパース(大文字 C) | BINFAIL `got 7` |
| 8 | `E-SMF-ND` | `c1 2x3` | サブ問スパース | BINFAIL `got 2` |
| 9 | `E-APG-CG13` | `C1 1x2 2x1 / C2 1x2 2x1` | サブ問スパース | BINFAIL `got 11`(後続本文が同行) |
| 10 | `E-TPR-RE` | `C1 1x3` | サブ問スパース | BINFAIL `got 2` |
| 11 | `E-GMECG` | `1x3` | スパース単節 | BINFAIL `got 1` |
| 12 | `E-SDE-NR` | `c1 2x3` | サブ問スパース | BINFAIL `got 2` |
| 13 | `E-PM10A` | `1x4` | スパース単節(1行に PM10A/B/C/D 併記) | BINFAIL `got 2` |
| 14 | `E-PM10B` | `1x1 2x3` | スパース単節 | BINFAIL `got 3` |
| 15 | `E-PM10C` | `2x4` | スパース単節 | BINFAIL `got 2` |
| 16 | `E-PM10D` | `1x3 2x1` | スパース単節 | BINFAIL `got 2` |
| 17 | `E-PM9` | `C1 1x3 / C2 1x3 / … / C7 1x1 2x1 3x1` | サブ問スパース(7サブ問) | BINFAIL `got 23` |

- 集計: **pass=0 / headFail=0 / binFail=17**(#1256 着地後、head は全通過)。canonical 8-bin(0 含む全 bin 列挙)は team.md に**0行**。
- スパース様式の実分類:
  - **サブ問ラベル形**(`c<N>`/`C<N>` + `/` 区切り + 各サブ問内スパース bin):#3,4,6,7,8,9,10,12,17 の9行。ラベルは小文字 `c` と大文字 `C` が混在。
  - **ラベルなしスパース形**(サブ問1つ、非0 bin のみ列挙):#1,2,5,11,13〜16 の8行。
  - **1行複数 code 形**:#13〜16(`GoA[E-PM10A]: 1x4 / GoA[E-PM10B]: … / …`)は `/` が**サブ問区切りではなく別 code 区切り**。パーサ設計上、この行は「複数の独立 GoA 行が `/` で連結」= 行分割前提の曖昧性がある(#1254 設計時の注意点)。

## 選挙 store 圧縮形 GoA 行(読み側後方互換材料)

`grep -rlE 'GoA\[' amadeus/spaces/default/elections/*/record.md`=**55ファイル**。`renderGoaLine` 機械生成のため全て canonical 8-bin。verbatim 数件:

```
GoA[E-BFABT]: 1x2 2x0 3x0 4x0 5x0 6x0 7x0 8x0
GoA[E-BFACG]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
GoA[E-BFAADS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
GoA[E-BFARA1]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
```

- **対比の要点**: 機械経路(store record.md)は canonical 8-bin で round-trip 済み、手書き経路(team.md)はスパース。#1254 の parse 拡張は**両様式を受理する後方互換設計**が要る — canonical 8-bin(0 含む)は現行テスト・store 全55ファイルが依存するため、スパース対応で 8-bin 受理を壊してはならない。
- 注意: `E-BFACG`/`E-BFAADS13` は team.md 側(スパース)と store 側(canonical)で**同一 E-code が両様式で実在** — parse 拡張は同一 code で両形を許容する必要がある。

## テスト blast radius(修正時の必須調整)

| ファイル:line | 現行 assertion(verbatim) | #1254/#1255 での帰結 |
| --- | --- | --- |
| `t-norm-metrics.test.ts:670-671` | `test("parseGoaLine rejects the sparse per-subquestion form", () => { expect(parseGoaLine("GoA[E-SMF-BT]: c1 2x2 7x1 / c2 1x3").ok).toBe(false); });` | **#1254 の直接ピン**。スパース対応でこの assertion は `true` へ反転 = 書き換え必須。コメント :666-669 が「NOT covered … Tracked separately as its own Issue」と現状を固定 |
| `t-norm-metrics.test.ts:626-652` | `describe("PhaseBSchemas multi-segment E-codes (Issue #1226)")` 群(:627 複節許容、:636 他複節、:645 単節後方互換) | #1256 で追加済み。**canonical 8-bin の複節ケースは維持**。スパース対応時も緑を保つ後方互換基準 |
| `t-norm-metrics.test.ts:583-597` | `parseGoaLine("GoA[E-PM1]: 1x4 2x0 3x1 4x0 5x0 6x2 7x0 8x0")` 成功 / `:594` `too few bins`(`1x4 2x0 3x1` を fail) | **`too few bins`(3トークン)を fail し続ける**要求とスパース許容の境界設計が必要(スパース `c1 …` はラベルで判別可能) |
| `t238-election-record.test.ts:96-103` | `test("BR-R1: GoaLineCode is fail-closed on multi-segment hyphen codes")` — `:97` `GoaLineCode.parse("E-SDE-CG4").ok===false` / `:98` `E-TPR-RE`===false / `:103` `E-SDECG4`===true | **#1255 の直接ピン**。GoaLineCode 単節制約を撤去すると :97-98 が反転 = 書き換え必須 |
| `t238-election-record.test.ts:104-109` | `:107` `parseGoaLine("GoA[E-SDE-CG4]: 1x1 2x0 … 8x0")` の `.ok===true` / `.ecode==="E-SDE-CG4"` | #1256 着地で既に `true`(前 re-scan 時点の `false` ピンから反転済み)。canonical 8-bin+複節は維持 |
| ECODE_RE テスト(#1257) | `grep -nE 'ECODE_RE\|ecodeCount' tests/` = **norm-metrics 層に ECODE_RE 複節テスト不在** | #1257 修正時に複節 token 捕捉の回帰テスト新設が必要 |

## requirements-analysis 向け未決点

- **#1254 の parse 契約(方式選択)**:
  - **(a) 集約受理**: スパースをサブ問横断で 8-bin へ集約(サブ問の情報を捨てる)。既存 `GoaBreakdown.votes:[8]` 型を変えないが、サブ問別内訳を失う。
  - **(b) サブ問保持**: `GoaBreakdown` にサブ問別内訳を持つ新型(`{ecode, subquestions: {label, votes}[]}`)。型変更 = 消費側(現状 live 消費なしだが将来の aggregation)への波及。
  - **(c) 別関数**: canonical 8-bin は `parseGoaLine` 維持、スパースは `parseSparseGoaLine` を別立て。t670 ピンは「スパースも parse する別 API」に置換。
  - 材料: 現行 `GoaBreakdown`(:673-677 `ok/ecode/votes:[8]`)、消費側は現状 election.ts の checkGoaLine(canonical のみ round-trip)のみ、aggregation 未実装。
- **C-2 後方互換(canonical 8-bin 保持)**: store 55ファイル + t-norm-metrics 複節群 + t238:104-109 が canonical 8-bin(0 含む)を parse 成功で依存。スパース対応は 8-bin 受理を**壊さない加算**でなければならない(inception.md「後方互換レイヤーは既定スコープ外」だが、これは新旧二重実装ではなく**同一パーサの入力ドメイン拡張** — 判断は requirements で明示)。
- **1行複数 code 形(#13〜16 の PM10A/B/C/D)**: `/` がサブ問区切りか別 code 区切りかの曖昧性。parse は行単位入力を前提とするか、`GoA[` 境界で pre-split するかを requirements で固定。
- **#1257 の是正範囲**: ECODE_RE を `/\bE-[A-Z0-9]+(?:-[A-Z0-9]+)*/g` へ揃える(#1256 と同パターン)。数値影響は現状なしだが symmetric-pair-review の対称是正 + token 正確性。#1254 と同一 PR で同時是正するか独立かは判断事項。
- **#1255 の連動**: GoaLineCode 単節制約撤去は #1254(parseGoaLine 複節+スパース対応)の後でなければ、write した複節 code を read で拒否する非対称を作る。**#1254 → #1255 の順序依存**、または同一 intent で両立実装。GoaLineCode コメント(:28-31)と norm-metrics スキーマコメント(:159-161)の #1226→#1254 参照更新も同伴。

## 実測と独立再照合

| # | 主張 | 検証コマンド | 結果 |
| --- | --- | --- | --- |
| 1 | observed=HEAD | `git rev-parse HEAD` | `71f67f487…` 一致 |
| 2 | base は祖先 | `git merge-base --is-ancestor a326f47bc HEAD` | exit **0** |
| 3 | base 距離 | `git rev-list --count a326f47bc..HEAD` | **28** |
| 4 | 直近 re-scan observed の除外 | `git merge-base --is-ancestor 37f8cf5e6 HEAD` | exit **1**(非祖先 → 除外) |
| 5 | GOA_HEAD_RE 実文(複節許容) | `sed -n 162p amadeus-norm-metrics.ts` | `/^GoA\[(E-[A-Z0-9]+(?:-[A-Z0-9]+)*)\]:\s*(.+)$/` |
| 6 | bin 段落ち口 | `sed -n 697p` | `if (tokens.length !== 8) … got ${tokens.length}` |
| 7 | team.md GoA 全数 parse | `parseGoaLine` 直呼び(17 occurrence) | **pass=0 / headFail=0 / binFail=17** |
| 8 | distinct/total occurrence | `grep -oE 'GoA\[E-…\]' team.md \| sort \| uniq -c` / `wc -l` | distinct 17 / total 17 |
| 9 | ECODE_RE 複節切詰 | `bun -e` で `"E-SDE-CG4".match(/\bE-[A-Z0-9]+/g)` | `["E-SDE"]`(#1257 実在) |
| 10 | store canonical 形 | `grep -rlE 'GoA\[' elections/*/record.md \| wc -l` | 55ファイル、全 8-bin |
| 11 | t670 スパース拒否ピン | `sed -n 670,671p t-norm-metrics.test.ts` | `expect(parseGoaLine("… c1 2x2 7x1 / c2 1x3").ok).toBe(false)` |
| 12 | t238 GoaLineCode 単節ピン | `sed -n 97,98p t238-election-record.test.ts` | `GoaLineCode.parse("E-SDE-CG4").ok===false` |
| 13 | フォーカス区間変更 | `git log a326f47bc..HEAD --oneline -- <5 focus files>` | **4件**(#1256 / #1268 / #1273 / #1277) |
| 14 | 配布ツリー | `find dist .claude .codex .cursor .opencode -name amadeus-norm-metrics.ts \| wc -l` | 10(+正本1=11)。election scripts 配布0 |

## CodeKB 反映判断(Architect 向け申し送り)

- 一次原因(スパース bin 段落ち)は確定。**#1256 は head を直したが #1254 の実様式には未到達**(head 複節は前提条件、スパース bin が本丸)。
- codekb body 9成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment / practices)は**全点温存**が妥当 — 実質の新規知識は「#1256 着地後も parseGoaLine がスパース表記を bin 段で全拒否(17/17)+ ECODE_RE の複節非整合(#1257)+ GoaLineCode 単節制約の #1254 連動(#1255)」の1クラスタのみ。bugfix の挙動欠陥であり構造・API・依存・技術スタックの変化を伴わず、フォーカス正本の区間変更は #1256 の head fix 1件(スパース面は未変更)。詳細は本 per-intent record に集約。
- 修正の実価値: (i) 手書き team.md corpus を蒸留 aggregation の入力に載せられるようにする(将来の GoA-variance 集計の正しさ担保)、(ii) t670 ピンと GoaLineCode compression workaround の解消。要件はこの実影響範囲(現状 live 集計は未実装 = latent)を明記すべき。

## 補遺(2026-07-20 RA reviewer C-1 是正)

初回スキャンの corpus 測定は team.md 単独 grep で、同一スキーマの project.md 4 occurrence(全スパース・binFail — parseGoaLine 直呼び実測)を見落としていた(E-SDE-FD 追補「対象語彙の repo 全域 grep」の違反実例、PM 回付)。正準抽出 grep -o 'GoA\[E-[A-Z0-9-]*\]:' による全域再測定: team.md 17+project.md 4 = **21 occurrence**(phases/ 0、record/docs 面は引用のみ)。
