# Requirements Analysis — 明確化質問(260720-goa-sparse-family)

<!-- E-OC1 選挙不要判定ヘッダ -->
> **判定**: Q1/Q2 は真に未決の設計判断につき**選挙依頼**(E-OC1 対象外 — always-elect)。裁定受領後に [Answer] 記入する(election-answer-after-ruling)。
> 選挙依頼: 2026-07-20T04:30Z 頃 leader へ送付 → E-GSFRA1/2 として開催 → 裁定受領 2026-07-20T04:38:53Z(agmsg、record = leader ブランチ a7cae8567)

上流入力(consumes 全数): intent-statement.md、scope-document.md、constraint-register.md(C-1/C-2)+ RE 一次資料 re-scans/260720-goa-sparse-family.md

## Q1: #1254 の対応方式はどれか?(C-1)

実測コンテキスト(中立事実のみ — 推奨なし):
- team.md 実 GoA 行 17(全行スパース表記・binFail 17 — RE 実測、Architect 再照合一致)。書き手は人間の §13 persist 文(手書き)。
- GoA 集計(distill)は未実装(NOT COLLECTED)— 被害は latent。
- 選挙 CLI の renderGoaLine は常時 canonical 8-bin を書く(record.ts:77-80)。
- 選択肢: (a) parse 側スパース受理(bin 段拡張 — corpus 17行が即読める・ADR-4 契約拡張) / (b) persist 様式側 canonical 化(以後の手書き persist を 8-bin へ — 既存17行は読めないまま・遡及是正は W-4 で別 norm PR 分離済み) / (c) 両対応

[Answer]: (a) parse 側スパース受理(E-GSFRA1 裁定 2-1、2026-07-20 開票 — 留保2件は requirements FR-1 へ verbatim 転記)

## Q2: t238:102 の圧縮形受理ピンと圧縮 code の扱いは?(C-2、E-GMERA3 留保の履行)

実測コンテキスト(中立事実のみ):
- GOA_LINE_CODE_RE 複節化は受理域の拡大 — 圧縮形(E-SDECG4)は拡大後も文法上有効な受理域に含まれる(E-[A-Z0-9]+ は複節 regex の部分集合)。
- 既存選挙 store 55ファイルの機械生成 tally 行は全て圧縮単節 code+canonical 8-bin(RE 実測)— 読み側は regex 拡大により構造的に後方互換。
- t238:102 は圧縮形の受理を正テストでピン(`E-SDECG4`.ok===true)。
- 選択肢: (a) 圧縮形受理ピンを維持(旧 record 互換の明示的保証としてテスト温存・新規書込のみ自然形へ) / (b) ピン削除(受理は regex 上残るがテスト保証は自然形のみ)

[Answer]: (a) 圧縮形受理ピン維持(E-GSFRA2 裁定 2-1、2026-07-20 開票)
