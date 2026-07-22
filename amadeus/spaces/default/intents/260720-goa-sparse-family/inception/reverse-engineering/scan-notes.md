# scan-notes — 260720-goa-sparse-family(Developer code scan)

diff-refresh RE スキャンの実測ログ。合成・codekb 反映は `re-scans/260720-goa-sparse-family.md` と Architect が行う。全 file:line は Observed=HEAD `71f67f487` のワークツリー直読。

## 要約(結論)

- 対象: #1254(parseGoaLine がスパース GoA 表記を読めない)/ #1255(GoaLineCode 単節制約撤去)/ #1257(ECODE_RE 複節整合)。
- #1256(head regex 複節許容、`aaea9f636`)は区間内に着地済み。→ GoA 行の HEADFAIL は解消(headFail=0)。
- **#1254 は未解決**: team.md 実 GoA 行 17 occurrence がすべてスパース表記で、`parseGoaLine` は canonical 8-bin のみ受理 → **17/17 が bin 段(:697 `tokens.length !== 8`)で BINFAIL**(pass=0 / headFail=0 / binFail=17)。
- #1257 実在: `ECODE_RE = /\bE-[A-Z0-9]+/g` が複節を第1節へ切詰め(`E-SDE-CG4`→`E-SDE`)。#1256 で揃った GOA_HEAD_RE/PM_CID_RE から取り残された非対称。総数カウント値は偶然正だが token 切詰。
- #1255 は #1254 に順序依存(#1254 根治後に GoaLineCode 単節制約を撤去。t238:97-98 がピン)。
- 選挙 store record.md 55ファイルは全て canonical 8-bin(renderGoaLine 機械生成)→ #1254 の parse 拡張は 8-bin 受理を壊さない後方互換が必須。
- フォーカス5正本の区間変更=4件(#1256 / #1268 / #1273 / #1277)。

## 実行メタデータ / 区間

```
$ git rev-parse HEAD
71f67f4873210975823801b4603580ed99e248a8
$ git merge-base --is-ancestor a326f47bc HEAD; echo exit=$?
exit=0
$ git rev-list --count a326f47bc..HEAD
28
$ git merge-base --is-ancestor 37f8cf5e6 HEAD; echo anc37=$?   # 直近 re-scan observed
anc37=1   # 非祖先(並行 worktree squash tip)→ 除外、base=a326f47bc 採用
$ git log a326f47bc..HEAD --oneline -- packages/framework/core/tools/amadeus-norm-metrics.ts \
    scripts/amadeus-election-record.ts scripts/amadeus-election.ts \
    tests/unit/t238-election-record.test.ts tests/unit/t-norm-metrics.test.ts
e1fd1826b fix(election-cli): stamp ballot receipt time and verify timeline on the receipt axis (#1277)
a6f4a4522 fix(election-cli): fail-closed ballot acceptance — invalid-timestamp validation, amend submission path, per-voter resolution (#1273)
ea6acac53 fix(election): decide tally winner from choiceInternalNo (#1268)
aaea9f636 fix(norm-metrics): accept hyphenated multi-segment E-codes in GoA and PM-cid schemas (#1256)
```

per-file 区間(どのコミットがどの正本を触ったか):
- `amadeus-norm-metrics.ts`: `aaea9f636`(#1256)のみ
- `t-norm-metrics.test.ts`: `aaea9f636`(#1256)のみ
- `t238-election-record.test.ts`: `e1fd1826b`(#1277)/ `ea6acac53`(#1268)/ `aaea9f636`(#1256)
- `amadeus-election-record.ts`: `e1fd1826b`(#1277)/ `ea6acac53`(#1268)
- `amadeus-election.ts`: `e1fd1826b`(#1277)/ `a6f4a4522`(#1273)/ `ea6acac53`(#1268)

## item 1 — amadeus-norm-metrics.ts

```
$ grep -nE 'GOA_HEAD_RE|GOA_TOKEN_RE|ECODE_RE|PM_CID_RE|tokens\.length|parseGoaLine|countMatches' packages/framework/core/tools/amadeus-norm-metrics.ts
131:const ECODE_RE = /\bE-[A-Z0-9]+/g;
157:// The ADR-4 E-code accepts hyphenated multi-segment codes (e.g. E-SDE-CG4,
159:// team.md real corpus also carries a sparse per-subquestion form
162:const GOA_HEAD_RE = /^GoA\[(E-[A-Z0-9]+(?:-[A-Z0-9]+)*)\]:\s*(.+)$/;
163:const GOA_TOKEN_RE = /^([1-8])x(\d+)$/;
166:const PM_CID_RE = /^PM-cid:\s+([a-z0-9-]+(?::[a-z0-9-]+)*)\s+incident=(.+)\s+round=(E-[A-Z0-9]+(?:-[A-Z0-9]+)*)$/;
254:function countMatches(text: string, re: RegExp): number { return text.match(re)?.length ?? 0 }
393:  state.ecodeCount += countMatches(text, ECODE_RE);
697:  if (tokens.length !== 8) return { ok: false, error: `expected 8 vote bins, got ${tokens.length}` };
```

- スキーマコメント現行文言(:159-161、verbatim):
  「Note the team.md real corpus also carries a sparse per-subquestion form (`c1 1x2 2x1 / c2 ...`) that this parse does NOT cover — it accepts the canonical 8-bin form only (tracked separately as its own Issue).」
  → **#1254 を名指ししていない**(「its own Issue」の総称)。修正時に #1254 明記が必要。
- parseGoaLine 本体(:693-706): head → `head[2].trim().split(/\s+/)` → `tokens.length !== 8` で fail → 各 bin を GOA_TOKEN_RE + 順序照合。スパースの落ち口は :697。
- GoaBreakdown(:673-677): `{ ok:true; ecode:string; votes:[number×8] }`。サブ問別内訳フィールドなし。

## item 2/3 — election-record.ts / election.ts

```
$ grep -nE 'GOA_LINE_CODE_RE|GoaLineCode|renderGoaLine|#1226' scripts/amadeus-election-record.ts
9-13:  header comment「byte-compatible with real parseGoaLine … constrained to ^E-[A-Z0-9]+$ at construction, fail-closed」
28-31: comment「Multi-segment codes like E-SDE-CG4 are rejected here … the hyphenated-corpus gap is Issue #1226」
32:    export type GoaLineCode = string & { readonly __brand: "GoaLineCode" };
34:    const GOA_LINE_CODE_RE = /^E-[A-Z0-9]+$/;
36-41: export const GoaLineCode = { parse(raw): if (!GOA_LINE_CODE_RE.test(raw)) return err("goa-code-invalid"); ... }
77-80: export function renderGoaLine(code, freq) { const bins = freq.map((n,i)=>`${i+1}x${n}`).join(" "); return `GoA[${code}]: ${bins}`; }  // 常に 8-bin canonical(BR-R1)

$ grep -nE 'GoaLineCode\.parse' scripts/amadeus-election.ts
241:  const code = GoaLineCode.parse(parsed.value.electionId);   // handleOpen
374:  const code = GoaLineCode.parse(electionId);                // handleRender
```
- handleOpen エラー行 :242(verbatim): `return fail("open: electionId is not a valid GoA-line code (^E-[A-Z0-9]+$)")`。
- handleRender の parse は :374(行番号のみ、#1267 面と非交差につき深入りせず)。

## item 4 — team.md 実 corpus 対照

```
$ grep -oE 'GoA\[E-[A-Z0-9-]+\]' amadeus/spaces/default/memory/team.md | sort | uniq -c   # distinct 17
$ grep -oE 'GoA\[E-[A-Z0-9-]+\]' amadeus/spaces/default/memory/team.md | wc -l              # total 17
```

occurrence 単位で現行 parseGoaLine を bun 直呼び(scratch: `goacheck.ts`、`GoA[` 境界で occurrence 分割):
```
occurrences= 17
pass= 0 headFail= 0 binFail= 17
BINFAIL  GoA[E-TCRCGS13]: 1x1 2x2                          :: got 2
BINFAIL  GoA[E-BFACG]: 1x1 2x2                             :: got 2
BINFAIL  GoA[E-SDE-CG4]: c1 1x2 2x1 / c2 1x2 2x1           :: got 7
BINFAIL  GoA[E-SDE-FD]: c1 1x1 2x2                         :: got 3
BINFAIL  GoA[E-BFAADS13]: 2x2                              :: got 1
BINFAIL  GoA[E-SMF-AD13]: c1 1x2 2x1 / c2 1x3             :: got 6
BINFAIL  GoA[E-MTR-CG]: C1 1x2 2x1 / C2 1x1 2x2           :: got 7
BINFAIL  GoA[E-SMF-ND]: c1 2x3                             :: got 2
BINFAIL  GoA[E-APG-CG13]: C1 1x2 2x1 / C2 1x2 2x1 …        :: got 11
BINFAIL  GoA[E-TPR-RE]: C1 1x3                             :: got 2
BINFAIL  GoA[E-GMECG]: 1x3                                 :: got 1
BINFAIL  GoA[E-SDE-NR]: c1 2x3                             :: got 2
BINFAIL  GoA[E-PM10A]: 1x4 /                               :: got 2
BINFAIL  GoA[E-PM10B]: 1x1 2x3 /                           :: got 3
BINFAIL  GoA[E-PM10C]: 2x4 /                               :: got 2
BINFAIL  GoA[E-PM10D]: 1x3 2x1                             :: got 2
BINFAIL  GoA[E-PM9]: C1 1x3 / C2 1x3 / … / C7 1x1 2x1 3x1  :: got 23
```
- スパース様式目録: サブ問ラベル形(`c<N>`/`C<N>` + `/` 区切り)9行、ラベルなしスパース形8行。canonical 8-bin は0行。`c` と `C` の大小混在。#13〜16 は1行に `GoA[E-PM10A/B/C/D]` を `/` 併記=`/` が別 code 区切り(サブ問区切りと曖昧)。

## item 5 — 選挙 store 圧縮形

```
$ grep -rlE 'GoA\[' amadeus/spaces/default/elections/*/record.md | wc -l
55
$ grep -rhnE 'GoA\[' amadeus/spaces/default/elections/*/record.md | head
GoA[E-BFABT]: 1x2 2x0 3x0 4x0 5x0 6x0 7x0 8x0
GoA[E-BFACG]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
GoA[E-BFAADS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
GoA[E-BFARA1]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
```
- 全て canonical 8-bin(0 含む)。`E-BFACG`/`E-BFAADS13` は team.md 側(スパース)と store 側(canonical)で同一 code が両様式に実在 → 後方互換で両形受理が必要。

## item 6 — テスト面

```
$ sed -n '670,671p' tests/unit/t-norm-metrics.test.ts   # #1254 直接ピン
  test("parseGoaLine rejects the sparse per-subquestion form", () => {
    expect(parseGoaLine("GoA[E-SMF-BT]: c1 2x2 7x1 / c2 1x3").ok).toBe(false);

$ sed -n '626,652p' tests/unit/t-norm-metrics.test.ts   # #1226 複節群(canonical 8-bin、維持基準)
  # :627 parseGoaLine("GoA[E-TPR-RE]: 1x3 2x0 … 8x0") ok / :636 E-SDE-CG4,E-APG-CG13 / :645 E-PM1,E-PM9 単節後方互換

$ sed -n '96,109p' tests/unit/t238-election-record.test.ts
  :97  expect(GoaLineCode.parse("E-SDE-CG4").ok).toBe(false);   # #1255 直接ピン
  :98  expect(GoaLineCode.parse("E-TPR-RE").ok).toBe(false);    # #1255 直接ピン
  :103 expect(GoaLineCode.parse("E-SDECG4").ok).toBe(true);     # compressed 形は受理
  :104-109 parseGoaLine("GoA[E-SDE-CG4]: 1x1 … 8x0").ok===true / .ecode==="E-SDE-CG4"  # #1226 で false→true に反転済み
```
- ECODE_RE 複節テストは norm-metrics 層に不在(#1257 修正時に新設要)。

## item 7 — #1257 実挙動確認

```
$ bun -e 'const R=/\bE-[A-Z0-9]+/g; for(const s of ["E-SDE-CG4","E-APG-CG13","cid E-SDE-CG4 twice E-SDE-CG4"]) console.log(s,"->",JSON.stringify(s.match(R)))'
E-SDE-CG4 -> ["E-SDE"]
E-APG-CG13 -> ["E-APG"]
cid E-SDE-CG4 twice E-SDE-CG4 -> ["E-SDE","E-SDE"]   # 二重計上せず(数値は偶然正)、token は切詰
```

## 配布フットプリント

```
$ find dist .claude .codex .cursor .opencode -name amadeus-norm-metrics.ts | wc -l
10   # dist6 + self-install4、+正本1 = 11コピー
$ find dist .claude .codex .cursor .opencode -name 'amadeus-election*.ts' | wc -l
0    # scripts/ は repo-local dev tool(gh-scripts-boundary)、配布なし
```
→ #1254(norm-metrics)修正は正本編集→`bun scripts/package.ts`+`bun run promote:self` で11コピー同期。#1255/#1257 の scripts 側修正は dist 再生成不要。

## requirements 向け未決点(要約)

- #1254 parse 契約: (a)8-bin 集約受理 / (b)サブ問別内訳を持つ新型 / (c)別関数(parseSparseGoaLine)。現行 GoaBreakdown は votes:[8] のみ、live 集計消費なし。
- C-2 後方互換: canonical 8-bin(0 含む)は store 55ファイル+複節テスト群+t238:104-109 が依存 → 8-bin 受理を壊さない入力ドメイン拡張(新旧二重実装ではない)。
- 1行複数 code 形(#13〜16): `/` がサブ問区切りか別 code 区切りかの曖昧性を要件で固定。
- #1257: ECODE_RE を `/\bE-[A-Z0-9]+(?:-[A-Z0-9]+)*/g` へ(#1256 同パターン)。#1254 と同一 PR か独立かは判断事項。
- #1255: #1254→#1255 の順序依存。GoaLineCode/norm-metrics の #1226→#1254 コメント更新も同伴。
