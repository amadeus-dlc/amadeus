# NFR Design Questions: U2 applicability-hold

## 質問なしの宣言(0 件)

本 unit の nfr-design 判断は上流から一意に導出でき、新規の人間裁定事項はない — (1) nfr-requirements stage は scope 設計どおり SKIP(`security-requirements` / `tech-stack-decisions` は expected-absent)(2) U2 の NFR 面(fail-closed・決定性・承認 provenance・checkpoint 無変更)は functional-design の BR-U2-01〜25(READY 確定済)と ADR-6 改訂から導出済 (3) CLI/library の NFR 設計は常駐 service セレモニーを排し決定的 file 境界へ置換する(既定ノルム cid:nfr-design:c1)。

## 裁定の記録

- 0 件判定の承認(E-OC1 規律、nfr-design 残 5 unit の一括承認): 人間承認 2026-08-04T22:52:32Z(選択肢「5 unit とも 0 件で可(1)」)

## 上流トレーサビリティ

- `construction/applicability-hold/functional-design/`(business-logic-model.md / business-rules.md / domain-entities.md — READY 確定)
- `inception/requirements-analysis/requirements.md`(NFR-001〜NFR-003)、`inception/application-design/decisions.md` ADR-6 改訂
