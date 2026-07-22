# Scope Document — 260720-goa-sparse-family

上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md

## Must(すべて必須 — Should/Could は置かない)

intent-statement.md の3ギャップと feasibility-assessment.md の GO 判定(前提 = 方式選挙)を前提に、公開契約を完結させる最小集合のみを Must とする(scope-definition:c2 の厳格 Won't 方式)。効力条件列は constraint-register.md C-1/C-2 の裁定従属を明示する。

| ID | Must | 効力条件 |
|---|---|---|
| M-1 | #1254: memory 層 corpus(team.md+project.md — RA reviewer C-1 是正で全域化、着手時実測を正とする)の GoA 行が読める状態にする | 方式 (a)/(b)/(c) は RA 選挙(C-1)従属 |
| M-2 | #1255: GoaLineCode 複節拡張+圧縮 workaround 撤去(record.md へ自然形 E-code) | t238:102 の扱い・読み側後方互換は RA/design 選挙(C-2)従属 |
| M-3 | #1257: ECODE_RE 複節整合(count 不変の対照テスト固定) | なし(裁定済み — count-only 消費の実測確定) |
| M-4 | 落ちる実証+corpus 全数 sweep 両側実証(C-7) | なし |
| M-5 | dist×6+self-install 再生成と drift guard green(C-4、norm-metrics 面) | なし |

## Won't(明示除外)

| ID | Won't | 根拠 |
|---|---|---|
| W-1 | e2 #1267 の hold-resolution 面(HOLD_RESOLUTIONS/handleRender 合成/rulingText/renderPersistDraft rulingOverride/t236) | 関数単位非交差合意(C-5) |
| W-2 | GoA 集計(distill の GoA-variance)実装 | NOT COLLECTED のまま — 将来 intent |
| W-3 | pd 解決順・cursor lifecycle 等のエンジン面 | e1 #1279 intent の管轄 |
| W-4 | 既存 team.md 14行の遡及書換(方式 (b) 採用時の一括是正) | 採用時も別 norm PR の人間承認事項として本 intent のコード面から分離 |
| W-5 | 選挙 CLI の amend/timeline 面 | #1273/#1277 で着地済み |
| W-6 | E-PM10D 級の敵対入力線形性実測の新規義務化 | 対象 regex は trusted repo 入力(C-7 注記どおり) |

## 境界判定規則(1基準)

「変更が GoA 行スキーマ(head/bin/code)の受理・描画・走査のいずれかに直接触るか」— 触らない変更はスコープ外(境界疑義は leader へ)。
