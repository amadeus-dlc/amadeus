# Requirements Analysis Questions — 260719-goa-multiseg-ecode

> **E-OC1 判定ヘッダ**: Q1〜Q3 は未決の設計判断につき**エージェント選挙で裁定**した(leader ディスパッチ指示 14:28:11Z「単独決定禁止・requirements で選挙依頼」)。[Answer] は選挙裁定の受領後にのみ記入(election-answer-after-ruling / no-election-judgment-gate)。選挙不要判定の質問は本ファイルに存在しない。
> 選挙依頼送信: leader へ 2026-07-19T14:58Z 頃(agmsg)。選挙: E-GMERA1〜3(/amadeus-election CLI、blind 配布 14:56:47Z → 開票 15:00:01Z/15:00:02Z、各 2-0 採用)。裁定通知受領: 2026-07-19T15:00:27Z(agmsg)。record: leader ブランチ `f9981fab7` の elections/E-GMERA{1,2,3}/record.md(e1 直接実読で全文確認 — 留保2件含む)。

上流入力(consumes 全数): business-overview.md(N/A — 不参照根拠は requirements.md 冒頭注記)、architecture.md、code-structure.md(実参照は requirements.md §2)

## Q1. parseGoaLine の parse 契約スコープ(修正の到達範囲)

背景(RE 実測、re-scans/260719-goa-multiseg-ecode.md):
- `GOA_HEAD_RE`(amadeus-norm-metrics.ts:157)= `/^GoA\[(E-[A-Z0-9]+)\]:\s*(.+)$/` — ハイフン複節 E-code を head 段で拒否(Issue #1226 の主訴)。
- ただし team.md の実 GoA 行9行は全てサブ問別スパース表記(例 `GoA[E-SMF-BT]: c1 2x2 7x1 / c2 1x3`)であり、head 拡張だけでは bin 段(:692 `tokens.length !== 8`)で全行 fail — **regex 修正は必要条件だが corpus 到達には不十分**。
- 蒸留(distill-candidates)は現状 parse-only で GoA 集計未実装(:544 NOT COLLECTED)— 被害は latent。
- 選挙 CLI の renderGoaLine(scripts/amadeus-election-record.ts:77)は compressed 単節+canonical 8-bin を書くため現行 live 経路は #1226 を踏まない。

選択肢:
A. head regex 拡張のみ(`E-[A-Z0-9]+(-[A-Z0-9]+)*`)。parse 契約は canonical 8-bin のまま維持し、既存スパース行が対象外であることをスキーマコメント・テストで明文化する(Issue 起票文の修正案そのまま。最小変更・将来の集計実装時にスパース問題を再裁定)
B. head 拡張+サブ問別スパース表記の受理(`/` 区切りサブ問・欠落 bin=0 扱い)まで parse 契約を corpus 実様式へ拡張する(集計実装時に再修正不要になるが、変更規模と ADR-4 canonical 形の契約変更を伴う)
C. head 拡張のみ+スパース表記の未達を別 Issue として起票(A の明文化に加えて追跡可能性を残す)
D. 修正見送り(集計実装時に一括対応)— Issue を将来 intent へ委ねる
X. Other (please specify)

[Answer]: C — E-GMERA1 裁定(2026-07-19 開票 15:00:01Z、2-0 採用、GoA 1x1 2x1)。head regex 拡張のみ+スパース表記未達を別 Issue 起票。留保転記(e4, GoA2): 別 Issue には『head 拡張後もスパース行9行は bin 段 :692 で fail する』実測(pass=0/headFail=8→binFail 移行)を転記し、集計実装 intent の RE が再測定しなくて済む形で残すこと。

## Q2. PM_CID_RE round= の同根是正(same-root-inventory)

背景: `:161` の `round=(E-[A-Z0-9]+)` も同一の非ハイフン制約(同根欠陥)。ただし複節 round 値の corpus 実在は0件(`grep -rhoE "round=E-[A-Z0-9-]+"` 空)— 潜在のみ。

選択肢:
A. 同一 PR で対称是正する(same-root-inventory の「同根パターンは同一 PR で修正するか Issue 化」の前者。将来 E-PM10 超の複節ラウンド名にも先回り)
B. Issue 化のみ(実在0件につきスコープ外へ — 後者)
X. Other (please specify)

[Answer]: A — E-GMERA2 裁定(2026-07-19 開票 15:00:01Z、2-0 採用、GoA 1x2、留保なし)。PM_CID_RE round= を同一 PR で対称是正。

## Q3. t238:104 / GoaLineCode(選挙 CLI 側)の連動裁定

背景: `tests/unit/t238-election-record.test.ts:104` が現行バグ挙動をピン留め(`parseGoaLine("GoA[E-SDE-CG4]: …").ok === false` を expect)— head 拡張でこの assertion は必ず反転する。`GoaLineCode`(scripts/amadeus-election-record.ts:34 `GOA_LINE_CODE_RE=/^E-[A-Z0-9]+$/`)は #1226 の既知 workaround(:31 コメント明記)で、選挙 CLI は複節 election id を alnum 圧縮形へ変換して GoA 行を書いている。

選択肢:
A. t238:104 を「複節受理」の正テストへ反転+GoaLineCode も複節受理へ拡張し、選挙 CLI の圧縮 workaround を撤去(以後 record.md の GoA 行は自然形 E-code で書かれる — 根治の完全形。ただし scripts/ 面へ変更が広がる)
B. t238:104 の反転のみ。GoaLineCode は単節維持(選挙 CLI は圧縮形の write を継続し、parse 側だけ受理域を広げる非対称を明文化 — 修正面を amadeus-norm-metrics.ts 系+テストに保つ)
C. B+GoaLineCode 拡張を別 Issue 起票(修正面の限定と追跡可能性の両立)
X. Other (please specify)

[Answer]: C — E-GMERA3 裁定(2026-07-19 開票 15:00:02Z、2-0 採用、GoA 1x1 2x1)。t238:104 は複節受理の正テストへ反転、GoaLineCode 拡張は別 Issue 起票。留保転記(e4, GoA2): 起票する GoaLineCode 拡張 Issue には『head 拡張着地後は parse 側が hyphen を受理するため圧縮 workaround の撤去は安全に可能』の前提と、撤去時に t238 の圧縮形受理テスト(:102 E-SDECG4 admitted)の扱いを明記すること。
