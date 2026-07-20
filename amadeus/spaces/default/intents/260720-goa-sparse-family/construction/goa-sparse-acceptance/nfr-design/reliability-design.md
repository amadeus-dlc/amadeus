# Reliability Design — goa-sparse-acceptance

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Reliabilityモデル

availability SLA、RTO/RPO、replication、failover、health endpoint、retry/circuit breakerは常駐service・databaseがないためN/Aである。本Unitのreliabilityはpure変換の決定論、failure atomicity、後方互換、正本と生成物のbyte同期で構成する。

## 決定論と原子性

- `scanGoaHeads`は呼出しごとにscan stateを初期化し、同じ文字列へ同じoffset列・`execCalls`を返す。
- `extractGoaRecords`はscan resultだけを消費し、global regexの残留`lastIndex`や呼出し順に依存しない。
- `parseGoaLine`は外部stateを持たず、全segment成功時だけ`GoaBreakdown`を返す。失敗時に部分`votes`や前回値を返さない。
- canonical 8-binは`segments`を持たず、既存votes/errorを保存する。sparse成功時だけ入力順のsegmentsを持つ。
- `GoaLineCode.parse`は旧圧縮形と複節自然形を受理し、render/store/timeline/hold-resolutionを変更しない。
- core `ECODE_RE`は複節IDを1 occurrenceのまま全長matchし、旧/new regexの同一corpus `matchAll`件数と`countMatches`由来`ecodeOccurrences`を不変にする。切詰め解消とcount不変を別assertに分離する。

## 配布と回帰

core正本`amadeus-norm-metrics.ts`変更後は既存generatorでdist 6面+self-installを再生成する。コピーは手編集せず、`dist:check`、`promote:self:check`、byte comparisonを通す。配布外の`amadeus-election-record.ts`と`amadeus-election.ts`はscripts面だけを変更する。

落ちる実証はfix commit後、testが読む面だけをpre-fixへ切替え、失敗を確認してからfix SHAで復元する。pre-fix/fix SHA、失敗数、復元byte identity、最終greenをcode summaryへ記録する。未実行・PENDINGをPASSと表記しない。

## 障害分類と証跡

不正入力は型付き`ParseFailure`で呼出し元へ返す回復可能data errorである。抽出漏れ、非単調offset、`execCalls`上限違反、E-code occurrence count差、dist drift、canonical regressionは実装failureとしてtest/CIをloudに失敗させる。証跡はunit/integration結果、実corpusのhead/record対応、旧/new E-code count対照、patch coverage、dist drift guard、PR diffとし、新しいruntime logging/telemetryを追加しない。
