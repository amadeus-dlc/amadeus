# Tech Stack Decisions — plugin-projection

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。既存packager/promoterへplugin inputを統合し、新技術を追加しない。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime/Language | Bun 1.3.13 / TypeScript ESM | 既存packaging、filesystem、testsと一致。 |
| Public seam | 正準4関数 | E-OC1再裁定どおり公開面を限定。 |
| Self-install | 内部helper + closed 4 harness | 第5 public APIや対象拡張を防ぐ。 |
| Validation | C1 Stage Contractの既存result | 第二manifest parserを作らない。 |
| Projection | HarnessManifest + `scripts/package.ts` | 6面の既存host変換を再利用。 |
| Promotion | `scripts/promote-self.ts` | 4面self-install境界を維持。 |
| Testing | `bun:test`、temp filesystem integration、golden | no-partial、drift、byte parityを実境界で検証。 |

## 追加しない技術

新runtime dependency、network registry/fetch、credential、database、service、UI、marketplace、lockfile、別schema/parser、別public API、audit event、retention/SLOを追加しない。

## Source・test ownership

U09はprojection/driftだけを所有する。compose/doctor/dropはU10、test-pro source/E2E/guideはU11、ledger closureはU12へ残す。source→temp build→6 package→4 self-install checkをintegration-firstで検証する。

push前local lcov patch未カバー0を確認し、spawn blind spotは実測後のin-process seam、waiverは既決証拠条件を満たす残余行だけに限定する。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U09-01〜21、`business-logic-model.md`のPublic seam/Ownership、`requirements.md`のNFR-3〜8、`technology-stack.md`のruntime・test・distribution構成に対応する。
