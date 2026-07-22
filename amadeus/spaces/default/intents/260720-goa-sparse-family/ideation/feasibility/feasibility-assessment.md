# Feasibility Assessment — 260720-goa-sparse-family

上流入力(consumes 全数): intent-statement.md、stakeholder-map.md

## 判定: GO(前提条件 = 方式選挙の裁定)

内部 seam のみで外部依存なし(feasibility:c1 の適用対象は repo 内実測)。全 seam を origin/main 断面(`git show`)で実測した。

## seam 実測(2026-07-20、origin/main)

| seam | 実測 | 含意 |
|---|---|---|
| GOA_HEAD_RE(norm-metrics:162) | 複節拡張済み(#1256 着地) | #1254 の前提成立 |
| bin 段(:697 `tokens.length !== 8`) | canonical 8-bin 固定 | スパース受理は bin 段の拡張 or 様式側対応 |
| team.md 実 GoA 行 | **14 occurrence・全 binFail**(intent-capture 時点の9行から本日 persist 分で成長) | ギャップは拡大中 — 対応の時宜性が上がった |
| GOA_LINE_CODE_RE(record.ts:34) | 単節のまま(#1226 workaround) | #1255 の撤去対象。parse 側受理済みで撤去安全(E-GMERA3 前提) |
| 圧縮変換 | CLI に不存在(制約は open :241 と render 内 parse のみ) | 拡張は受理域拡大のみ — handleRender 本体無変更 |
| 既存選挙 store | 58 選挙 dir(record.md の GoA 行は圧縮形) | 読み側後方互換の論点は実 corpus 規模あり — 設計裁定必要 |
| ECODE_RE(:131)/消費 :393 | count-only 消費。複節化の count 対照 **189=189 不変**(成長 corpus で再実測) | #1257 は受理拡大のみで数値挙動不変 |
| t238:102 | 圧縮形受理を正テストでピン | 撤去時の扱いは E-GMERA3 留保どおり設計裁定 |

## 方式候補の実現可能性(#1254 — 確定は RA 選挙)

- **(a) parse 側スパース受理**: GO — bin 段をサブ問別スパース(`/` 区切り・欠落 bin=0)へ拡張。corpus 14行が即読める。ADR-4 canonical 契約の拡張を伴う。
- **(b) persist 様式側 canonical 化**: GO(条件付き)— 以後の persist を 8-bin canonical へ。既存14行は読めないまま(遡及書換は norm PR での一括是正が必要 — append-only 原則との整合裁定必要)。
- **(c) 両対応**: GO — (a)+(b)。受理は広く・書き込みは canonical。

## 判定根拠

全変更面は自チーム管理下(norm-metrics = core 正本+dist 再生成 / election 系 = scripts 配布外)。e2 #1267 と関数単位非交差合意済み。CI ゲートは既存で追加機構不要。
