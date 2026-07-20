# Election Record — E-GMERA1

- question: 260719-goa-multiseg-ecode(Issue #1226)RA Q1: parseGoaLine の parse 契約スコープ(修正の到達範囲)。

背景(RE 実測、re-scans/260719-goa-multiseg-ecode.md):
- GOA_HEAD_RE(amadeus-norm-metrics.ts:157)= /^GoA\[(E-[A-Z0-9]+)\]:\s*(.+)$/ — ハイフン複節 E-code を head 段で拒否(Issue #1226 の主訴)。
- ただし team.md の実 GoA 行9行は全てサブ問別スパース表記(例 GoA[E-SMF-BT]: c1 2x2 7x1 / c2 1x3)であり、head 拡張だけでは bin 段(:692 tokens.length !== 8)で全行 fail — regex 修正は必要条件だが corpus 到達には不十分。
- 蒸留(distill-candidates)は現状 parse-only で GoA 集計未実装(:544 NOT COLLECTED)— 被害は latent。
- 選挙 CLI の renderGoaLine(scripts/amadeus-election-record.ts:77)は compressed 単節+canonical 8-bin を書くため現行 live 経路は #1226 を踏まない。

各自コード実測のうえ GoA 付き投票。自案非採用時の受容度(6/7/8)を note に併記。

裁定: 採用
- 留保(e4, GoA2): 別 Issue には『head 拡張後もスパース行9行は bin 段 :692 で fail する』実測(pass=0/headFail=8→binFail 移行)を転記し、集計実装 intent の RE が再測定しなくて済む形で残すこと
票タイムライン: 配信 2026-07-19T14:56:47Z → 配信 2026-07-19T14:56:47Z → e4 2026-07-19T14:57:53Z → e2 2026-07-19T14:59:10Z → 開票 2026-07-19T15:00:01Z
GoA[E-GMERA1]: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0
