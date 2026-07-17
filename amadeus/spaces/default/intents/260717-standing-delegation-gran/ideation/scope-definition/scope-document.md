# Scope Document — standing-delegation-grant(Issue #1125)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`(成功基準1〜7・Out of Scope)、`../feasibility/feasibility-assessment.md`(GO・seam 実測)、`../feasibility/constraint-register.md`(C-1〜C-10)

## In Scope(MoSCoW)

| 優先 | 項目 | 由来 |
|---|---|---|
| Must | grant 発行 verb(leader セッション限定・実 HUMAN_TURN 接地・fail-closed)+ GRANT_ISSUED 監査行 | 成功基準1/6、IC Q1 裁定 |
| Must | revoke verb + GRANT_REVOKED 監査行 | 成功基準6、#1125 提案4項 |
| Must | 受理側第2経路: humanActedSinceGate/verifyDelegatedProvenance 同族の全条件 AND 検証(発行行実在・根拠 HUMAN_TURN 実在・scope 適合・TTL 内・未撤回・チームモード)| 成功基準1/7、C-1/C-2 |
| Must | 既定除外の構造実装(phase-boundary・walking-skeleton。PR マージは verb 不在の構造外)| 成功基準2、C-3 |
| Must | 落ちる実証4種(scope 外拒否・TTL 切れ拒否・撤回後拒否・ソロモード発行/受理拒否)+白側 sweep(#671 退行ゼロ)| 成功基準3/4/7 |
| Must | TTL(named const 様式+数値 parse。型不正入力の落ちる実証含む)| C-6、FQ3 裁定 |
| Should | doctor での有効グラント可視化(scope・残 TTL・発行根拠)| 成功基準5 |
| Should | audit-format.md への GRANT_ISSUED/GRANT_REVOKED taxonomy 追記(docs 同期)| D-2 |
| Could | grant 状態の status 表示(doctor と別面)| 派生(design 判断)|

## Out of Scope(intent-statement から継承+scope 段の確定)

- PR マージ承認の自動化(no-AI-merge 不変 — engine に verb 不在の構造外)
- human-presence 本質ゲート(walking-skeleton 等)のグラント化
- ノルム(memory 層)側の文言改廃・PushNotification エスカレーション(leader ノルム事項)
- ソロモードへの機構提供(発行・受理とも team モード限定 — ユーザー指示)
- 過去 delegate 運用の遡及変更・履歴書き換え

## 互換性の位置づけ(Forbidden 照合)

既存 per-gate delegate フロー(#671)の**併存は「要求されない後方互換レイヤー」に該当しない** — グラント不在時・除外ゲート・撤回後のフォールバック経路として requirements(成功基準1/2/4)に明示根拠を持つ必須経路であり、二重実装ではなく単一検証器の分岐(全条件 AND の一部)として実装する。

## 境界の判定原則

- グラントが「効く/効かない」の判定はすべて受理側検証器の決定的条件(C-1 の AND)で表現し、prose 運用判断を挟まない
- 除外集合の変更はユーザーエスカレーション事項(standing-approval-scope-limit)
