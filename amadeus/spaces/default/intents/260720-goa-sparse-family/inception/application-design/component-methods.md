# Component Methods — 260720-goa-sparse-family

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## amadeus-norm-metrics.ts

### parseGoaLine(line: string): GoaBreakdown | ParseFailure(シグネチャ不変)

- canonical 行(現行 8-bin): 現行挙動を1ビットも変えない(votes のみ・segments なし)
- スパース行(`<label> <bin>x<n>...` を `/` 区切り): 各セグメントを GOA_TOKEN_RE で検証し、votes = ビン別合計、segments = [{label, votes}] を付与
- 拒否(ADR-2 の4クラス): ParseFailure(error にクラス名を含む loud 文言)
- 型: `GoaBreakdown = { ok: true; ecode: string; votes: [8]; segments?: {label: string; votes: [8]}[] }`(optional 追加のみ)

### ECODE_RE(:131)

- `\bE-[A-Z0-9]+(?:-[A-Z0-9]+)*` へ — 消費 :393(countMatches)は無変更。count 不変対照テストで固定(FR-3)

## amadeus-norm-metrics.ts(追加)

### extractGoaRecords(text: string): string[](新設 — ADR-4)

- 全文から `GoA\[E-[A-Z0-9-]+\]:` 境界で occurrence 分割したレコード文字列列を返す(1物理行複数レコード対応)。corpus sweep テストと将来集計の共有 seam(canonical 1定義)

## amadeus-election-record.ts

### GoaLineCode.parse(GOA_LINE_CODE_RE :34)

- 消費者全数: handleOpen(:240-242 — メッセージ表記更新)と handleRender(:374 — メッセージに regex 非埋め込みのため無変更)の2箇所

- `^E-[A-Z0-9]+(-[A-Z0-9]+)*$` へ — parse ロジック・エラー形は不変。:28-31 コメントを「#1226 解消済み・圧縮形は後方互換受理域」へ更新

## amadeus-election.ts

### handleOpen(:241-242)

- エラーメッセージ文字列の受理形表記のみ更新(検証はテーブルどおり GoaLineCode.parse に委譲 — ロジック不変)
