# Application Design — 明確化質問(260717-standing-delegation-gran)

<!-- E-OC1 判定証跡(eoc1-evidence-in-questions-header):
判定: 全2問 選挙不要(既決導出)— 各問の根拠種別は下記1問1行。
申告: e4 → leader(agmsg 送信 2026-07-17T03:4xZ — agmsg 一次記録)
leader 承認: 2026-07-17T03:38:47Z(agmsg 一次記録 — agmsg-git-evidence-split に基づく出典明示)
回答の記入は leader 承認受領後にのみ行う。 -->

上流入力(consumes 全数): `../requirements-analysis/requirements.md`、`../../ideation/feasibility/constraint-register.md`、codekb `code-structure.md`・`architecture.md`・`component-inventory.md`、`../practices-discovery/team-practices.md`(変更 0 件)

## DQ1: グラント発見の走査域は?

- A: 全 intent シャード走査(findActiveStandingGrant — Q1=A「issuer シャード」の機械的帰結: standing 権限は宛先 intent を持たない)
- B: 発行時に受理側へ座標を配る(delegate 同型)
- X: その他

[Answer]: A — 既決導出(leader 承認 2026-07-17T03:38:47Z)
根拠種別: 既決導出 — E-SDG-RA Q1=A の裁定文(issuer シャード方式)からの機械的帰結。B は per-intent 発行に戻り裁定の趣旨(per-grant 1回配送)に反する

## DQ2: TTL の env override は設けるか?

- A: 設けない — 常任権限の期限を env で無音延長できる面を作らない(standing-approval-scope-limit — セキュリティ境界の定数に env 緩和面を作らない)。「DEFAULT_LOCK_STALE_MS の env 併設様式とは意図的相違: あちらはロック鮮度でセキュリティ境界でない — citation-semantics-check の明文照合」(ADR-4 本文からの同一文字列転記)
- B: 設ける(既習様式どおり)
- X: その他

[Answer]: A — 既決導出(leader 承認 2026-07-17T03:38:47Z)
根拠種別: 既決導出 — citation-semantics-check(引用元のエラー分岐・方針が自要件と一致するかの明文照合)の適用。セキュリティ境界の定数に env 緩和面を作らないのは P4/standing-approval-scope-limit の既決
