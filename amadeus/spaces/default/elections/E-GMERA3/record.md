# Election Record — E-GMERA3

- question: 260719-goa-multiseg-ecode(Issue #1226)RA Q3: t238:104 / GoaLineCode(選挙 CLI 側)の連動裁定。

背景: tests/unit/t238-election-record.test.ts:104 が現行バグ挙動をピン留め(parseGoaLine("GoA[E-SDE-CG4]: …").ok === false を expect)— head 拡張でこの assertion は必ず反転する。GoaLineCode(scripts/amadeus-election-record.ts:34 GOA_LINE_CODE_RE=/^E-[A-Z0-9]+$/)は #1226 の既知 workaround(:31 コメント明記)で、選挙 CLI は複節 election id を alnum 圧縮形へ変換して GoA 行を書いている。

各自コード実測のうえ GoA 付き投票。自案非採用時の受容度(6/7/8)を note に併記。

裁定: 採用
- 留保(e4, GoA2): 起票する GoaLineCode 拡張 Issue には『head 拡張着地後は parse 側が hyphen を受理するため圧縮 workaround の撤去は安全に可能』の前提と、撤去時に t238 の圧縮形受理テスト(:102 E-SDECG4 admitted)の扱いを明記すること
票タイムライン: 配信 2026-07-19T14:56:47Z → 配信 2026-07-19T14:56:47Z → e4 2026-07-19T14:57:53Z → e2 2026-07-19T14:59:10Z → 開票 2026-07-19T15:00:02Z
GoA[E-GMERA3]: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0
