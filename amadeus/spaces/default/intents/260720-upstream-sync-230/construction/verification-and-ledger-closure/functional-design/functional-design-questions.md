# Functional Design Questions — verification-and-ledger-closure

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> E-OC1裁定: A。裁定TS=`2026-07-20T14:40:00Z`。

## 既決事項

- public seamは`traceCoverage`、`assertPhaseVerification`、`planLedgerTransition`の3関数で、`classifyDisposition`はC7内部helperである。
- 全signatureは`component-methods.md`へ完全一致させる。
- EQUIVALENTはcharacterization evidenceがupstream contract全体を満たす場合だけ認める。
- 全24 item disposition、全必須gate green、最終Amadeus比較SHAの三条件後だけ`APPLIED`を許す。
- 再実行は履歴を増殖させず、欠落条件はfail-closedで拒否する。
- U12はtest/docs/evidence集約とledger closureだけを担い、機能実装を追加しない。

[Answer]: A。leaderのE-OC1裁定（`2026-07-20T14:40:00Z`）どおり、3 public seam＋内部`classifyDisposition`で進める。新たな正本矛盾、判定順、failure policy、ledger atomicity判断が必要なら停止し、再付議する。

## E-OC1再裁定: BLOCKED/APPLIED境界

[Answer]: A。再裁定`2026-07-20T14:43:50Z`。`planLedgerTransition`は、(a)単なる未完了・三条件欠落=`APPLIED`拒否かつledger bytes不変、(b)明示的`verification-failure`または`abandon` evidence=baseline不前進・反証可能根拠付き`BLOCKED`を既存writerで冪等計画、(c)三条件成立=`APPLIED`のclosed unionとする。進行中をBLOCKEDへ誤分類せず、BLOCKED/APPLIEDとも既存atomic write境界を再利用する。

## Ambiguity analysis

- 曖昧回答、矛盾、欠落情報: なし。
- 完了条件の緩和: なし。
