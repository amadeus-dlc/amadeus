# re-scan 記録 — 260719-goa-multiseg-ecode

## 実行メタデータ

- Date: 2026-07-19(Asia/Tokyo)
- Intent: `260719-goa-multiseg-ecode`
- Issue: [#1226](https://github.com/amadeus-dlc/amadeus/issues/1226)
- Scope / project type: `bugfix` / Brownfield
- Repository / stage: `amadeus` / `reverse-engineering`(2.1)
- Base commit: `6495e03a12d9e7149c2e80b59f171a90607a2d2c`
- Observed commit: `a326f47bc0146a3b4285552f42b92fd61fb343a7`(現 HEAD)
- Base selection: 全 `re-scans/*.md` の Observed のうち HEAD 祖先で距離最小を採用(`git merge-base --is-ancestor` exit 0、`git rev-list --count`=178)。他候補(`c2e4975ff` 等)は非祖先(並行 squash tip)で除外(rescan-base-ancestry 準拠)。
- 測定 ref: 特記なき件数は Observed=HEAD `a326f47bc` のワークツリー実測(measurement-ref-in-artifacts 準拠)。
- Focus: `amadeus-norm-metrics.ts` の GoA/PM-cid parse schema(`GOA_HEAD_RE`/`PM_CID_RE`/`parseGoaLine`/`parsePmCidLine`)を対象に、(1) 呼び出し元(consumer)経路、(2) team.md 実 GoA 行の様式目録、(3) 週次蒸留(distill-candidates)での実消費有無、(4) 同根 PM_CID_RE 複節 round 値の実在、(5) t238 GoaLineCode 側の整合面を対称棚卸し。
- 実施体制: Developer code scan → Architect synthesis(codekb 合成・timestamp 更新は後続)。

## 結論

バグの一次原因は `packages/framework/core/tools/amadeus-norm-metrics.ts:157` の `GOA_HEAD_RE = /^GoA\[(E-[A-Z0-9]+)\]:\s*(.+)$/` が、E-code 内の追加ハイフン(複節 E-code)を許容せず、`E-SDE-CG4` 等の多節コードを head 段で拒否することにある。

ただしスキャンで以下2点の**重要な追加事実**が確定した(Architect の要件確定材料):

1. **regex 修正だけでは team.md の実 GoA 行は依然 parse しない(必要条件だが十分条件でない)。** team.md の実 GoA 行9行はすべて canonical 8-bin 形(`1x<n> … 8x<n>`)ではなく、サブ問別スパース表記(`c1 1x2 2x1 / c2 …`)である。head の hyphen を許しても bin 段(:692 `tokens.length !== 8`)で BINFAIL に反転するだけで、9行中0行が parse する。実測: `parseGoaLine` 直呼びで pass=0 / headFail=8 / binFail=1(E-PM9 は非ハイフンだがスパース表記のため `got 23`)。hyphen 許容の模擬 head 適用でも 8行は tokens=2〜7 の BINFAIL(スパース表記)へ移るのみ。
2. **`parseGoaLine`/`parsePmCidLine` は現状どこからも集計消費されていない(週次蒸留は parse-only)。** `collectMetrics`/`distillCandidates` は GoA を一切集計せず、`:544` で `GoA-variance, violation-recurrence: NOT COLLECTED` を明示出力する(header comment :38-44「aggregation is future」)。よって「8/9 が蒸留集計から無音脱落」の実害は、(a) 集計自体が未実装、(b) 実装されても bin 形不一致で失敗、の二重で顕在化していない。現状の唯一の live consumer は `scripts/amadeus-election.ts:413 checkGoaLine` だが、これが round-trip する record.md の GoA 行は `amadeus-election-record.ts:renderGoaLine` が **compressed 非ハイフン形+canonical 8-bin** で書くため #1226 を踏まない。

base..HEAD(178 コミット)のうち、フォーカス正本 `amadeus-norm-metrics.ts`+dist+tests に触れた変更は2件のみ(`0ab3f22c4` Bolt 1 rank、`b48f89bf0` PR #1112 Bolt 2 で `parseGoaLine`/`GOA_HEAD_RE`/テスト固定を導入)。新規 regression ではなく、Bolt 2 導入時の schema が corpus 実様式と乖離していた設計時欠陥。原因所在は #1112(Bolt 2)の functional-design/実装で、GoA 行スキーマを canonical 8-bin・非ハイフンに固定し、team.md の実様式(複節 E-code+スパース表記)と照合しなかった点。

## consumer / 配布経路(対称棚卸し)

| 面 | 経路(file:line) | 観測結果 |
| --- | --- | --- |
| schema 定義 | `amadeus-norm-metrics.ts:157`(GOA_HEAD_RE)`:161`(PM_CID_RE) | `E-[A-Z0-9]+`(ハイフン非許容)、bin 段は 8-token 固定 `:692` |
| parse 関数 | `parseGoaLine :688-701` / `parsePmCidLine :704-708` | export 済み純関数。fail-closed(never estimates) |
| 蒸留内部消費 | `collectMetrics :491` / `distillCandidates :613` | **parseGoaLine/parsePmCidLine を内部呼び出しなし**(grep 0)。GoA/PM は `:544` で NOT COLLECTED 出力 |
| CLI verb | `distill-candidates :838-839` / `rank :829` | metrics→candidates。GoA 集計は経路に無い |
| live consumer(選挙) | `scripts/amadeus-election.ts:45 import` `:413 checkGoaLine` | record.md GoA 行を round-trip 検証。入力は非ハイフン compressed 形 |
| record writer | `scripts/amadeus-election-record.ts:77 renderGoaLine` | 常に 8-bin canonical 形+非ハイフン code を書く(BR-R1) |
| code 制約(workaround) | `scripts/amadeus-election-record.ts:34 GOA_LINE_CODE_RE=/^E-[A-Z0-9]+$/`(#1226 コメントは同ブロック :31) | 多節 code を write 段で拒否。コメントで「the hyphenated-corpus gap is Issue #1226」明記 |
| GoaLineCode 消費側 | `amadeus-election.ts:240,:368 GoaLineCode.parse` | electionId を code 制約へ通す |
| テスト | `t-norm-metrics.test.ts:582-597`(E-PM1 非ハイフン)/ `t238-election-record.test.ts:94-104` | 下記「テスト blast radius」参照 |
| 配布 | 正本1 + dist 6ツリー(claude/codex/cursor/opencode/kiro/kiro-ide の `dist/<h>/.<h>/tools/`)+ self-install 4ツリー(`.claude/.codex/.cursor/.opencode/tools/`)= 計11コピー | `find` 実測。修正は正本編集→`bun scripts/package.ts`+`bun run promote:self` で同期 |

## team.md 実 GoA 行 全数目録(9行 verbatim)

`grep -ohE "GoA\[E-[A-Z0-9-]+\]:[^<]*"` 実測。すべてサブ問別スパース表記(`c1`/`C1`… の `/` 区切り)であり canonical 8-bin 形は0行。

| # | E-code | 節数 | 表記(verbatim 抜粋) | 単独 parse(実測) |
| --- | --- | --- | --- | --- |
| 1 | `E-SDE-CG4` | 複節 | `c1 1x2 2x1 / c2 1x2 2x1` | HEADFAIL |
| 2 | `E-SDE-FD` | 複節 | `c1 1x1 2x2` | HEADFAIL |
| 3 | `E-SMF-AD13` | 複節 | `c1 1x2 2x1 / c2 1x3` | HEADFAIL |
| 4 | `E-MTR-CG` | 複節 | `C1 1x2 2x1 / C2 1x1 2x2` | HEADFAIL |
| 5 | `E-SMF-ND` | 複節 | `c1 2x3` | HEADFAIL |
| 6 | `E-APG-CG13` | 複節 | `C1 1x2 2x1 / C2 1x2 2x1` | HEADFAIL |
| 7 | `E-TPR-RE` | 複節 | `C1 1x3` | HEADFAIL |
| 8 | `E-SDE-NR` | 複節 | `c1 2x3` | HEADFAIL |
| 9 | `E-PM9` | 単節 | `C1 1x3 / C2 1x3 / … / C7 1x1 2x1 3x1` | BINFAIL(`got 23`) |

- 集計: distinct E-code 9(`grep -ohE "GoA\[E-[A-Z0-9-]+\]" | sort -u | wc -l`=9)、うち複節8・単節1。
- 様式分類: 全9行が「サブ問ラベル(`c<N>`/`C<N>`)+ `/` 区切り + 各サブ問内スパース bin(`<bin>x<count>` の非0のみ)」形。canonical 8-bin(0 含む全 bin 列挙)は team.md に不在。
- record corpus(intents 配下)には別様式も混在: canonical `GoA[E-FR0DEMO1]: 1x1 2x0 … 8x0`(単節・parse 可)と `GoA[E-SDE-RA]: C 1x1 2x1 + A 2x1`(複節・スパース)が実在。GoA 行を持つ intents ファイルは6。

## 同根 PM_CID_RE(same-root-inventory)

- `PM_CID_RE :161` の `round=(E-[A-Z0-9]+)` も GOA_HEAD_RE と同じ非ハイフン制約 = 同根欠陥。
- ただし複節 round 値の実在は0: `grep -rhoE "round=E-[A-Z0-9-]+" amadeus/` は PM-cid 行を検出せず(team.md の PM ラウンド記録は `round=<E-PMn>` 単節のみ、`PM-cid:` プレフィクス行の実データは corpus に未蓄積)。よって PM_CID_RE の複節 round 拒否は**現時点で顕在実害なし**だが、GoA と対称の潜在欠陥として修正時に同時是正するか Issue 化する候補(symmetric-pair-review)。

## テスト blast radius(修正時の必須調整)

- `t238-election-record.test.ts:104` が現行バグ挙動を**ピン留め**している: `expect(parseGoaLine("GoA[E-SDE-CG4]: 1x1 … 8x0").ok).toBe(false)`(コメント :103「the rejected hyphen form indeed fails the real parseGoaLine too」)。GOA_HEAD_RE を hyphen 許容へ修正すると canonical 8-bin+多節の当該入力は parse 成功へ反転し、この assertion が**破綻する**。
- `t238:96-99` の `GoaLineCode.parse("E-SDE-CG4").ok===false` 群は #1226 回避の compression workaround を固定。#1226 が根治(parseGoaLine が多節許容)されると GoaLineCode の compression 存在理由が変わるため、`amadeus-election-record.ts:28-33` のコメント/制約と併せて設計判断が必要(結合された裁定事項)。
- `t-norm-metrics.test.ts` に多節 E-code の parseGoaLine テストは不在(`grep -nE "GoA\[E-[A-Z0-9]+-"` = NONE、`parseGoaLine(.*E-…-` = NONE)。多節ケースは norm-metrics 層で未テスト = 修正時に回帰テストを新設すべき面。

## 実測と独立再照合

| # | 主張 | 検証コマンド | 結果 |
| --- | --- | --- | --- |
| 1 | observed=HEAD | `git rev-parse HEAD` | `a326f47bc…` 一致 |
| 2 | base は祖先 | `git merge-base --is-ancestor 6495e03 a326f47b` | exit 0 |
| 3 | base 距離 | `git rev-list --count 6495e03..a326f47b` | 178 |
| 4 | GOA_HEAD_RE 実文 | `sed -n 157p` | `/^GoA\[(E-[A-Z0-9]+)\]:\s*(.+)$/` |
| 5 | team.md GoA 全数 parse | `parseGoaLine` 直呼び(9行) | pass=0 / headFail=8 / binFail=1 |
| 6 | regex-only 修正の十分性 | hyphen 許容 head 模擬適用 | 8行とも tokens=2〜7 で BINFAIL(スパース) |
| 7 | 蒸留内部消費 | `grep parseGoaLine\|parsePmCidLine collectMetrics/distill` | 内部呼び出し0(NOT COLLECTED :544) |
| 8 | live consumer | `grep -rn parseGoaLine scripts/ packages/ tests/` | election.ts:413 + tests のみ |
| 9 | 複節 round 実在 | `grep -rhoE "round=E-[A-Z0-9-]+" amadeus/` | 0件(顕在実害なし) |
| 10 | フォーカス区間変更 | `git log base..HEAD -- <norm-metrics 正本+dist+tests>` | 2件(0ab3f22c4 / b48f89bf0) |
| 11 | 配布ツリー | `find dist .claude .codex .cursor .opencode -name amadeus-norm-metrics.ts` | 正本1+dist6+self-install4=11 |
| 12 | t238 ピン留め | `sed -n 94,104p t238-election-record.test.ts` | :104 が `hyphen.ok===false` を assert |

## CodeKB 反映判断(Architect 向け申し送り)

- 一次原因(GOA_HEAD_RE hyphen 拒否)は確定。**ただし修正スコープは regex 単独では team.md 実様式に届かない** — (a) 複節 E-code 許容、(b) スパースサブ問表記 vs canonical 8-bin のどちらを parse 契約とするか、(c) PM_CID_RE round= 同時是正の要否、(d) t238:104/GoaLineCode compression の連動裁定、が requirements-analysis の未決点。
- 「無音脱落」の被害面は現状 latent(蒸留集計未実装+bin 形不一致)。修正の実価値は「将来の GoA-variance 集計実装時の正しさ担保」と「t238 workaround の解消」に置かれる — 要件はこの実影響範囲を明記すべき。
