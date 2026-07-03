# Construction Traceability

## 要求から実装と検証への対応

| 要求 | 設計 | 実装 | 検証 |
|---|---|---|---|
| R001（aidlc/spaces 構造、.amadeus 削除） | business-logic-model L4、domain-entities（Space） | `dev-scripts/migrate-workspace-to-aidlc.ts`、自 workspace 移行、`amadeus-steering` の Space 契約、`.gitignore` | `test:it:migrate-workspace`（移行後 validator pass）、`test:it:amadeus-validator`（W1、W3）、`npm run test:all` |
| R002（Initialization 0.1〜0.3） | business-logic-model L1 | `skills/amadeus/SKILL.md`（Initialization 節）、`references/stage-catalog.md`（0.1〜0.3 行）、`lifecycle-v2.ts` の stageCatalog | `test:it:aidlc-state`（32 slug）、examples 再生成（real provider の Birth が Initialization として動作） |
| R003（aidlc-state.md が状態の持ち主、state.json 退役） | business-logic-model L2、L3 | `aidlc-state-contract.ts`、`lifecycle-v2.ts`、`AmadeusValidator.ts`、22 ステージ skill の状態記述、record の `aidlc-state.md` | `test:it:aidlc-state`、`test:it:amadeus-validator`（V1〜V8。V8 が state.json 残存を fail にする） |
| R004（intents.json、YYMMDD record） | domain-entities（Intents Registry、Intent Record） | `AmadeusValidator.checkIntentsRegistry`、`IndexGenerate.ts`、移行スクリプトの uuid v7 採番、record 改名 | `test:it:amadeus-validator`（V9、V10）、`test:it:index-generate`、`test:it:migrate-workspace` |
| R005（v2 実ファイル名） | business-logic-model L5 | stageCatalog の requiredArtifacts、22 ステージ skill と templates の改名、`intent-statement.md`、stage `memory.md`、移行スクリプトの改名適用 | `test:it:amadeus-templates`、`test:it:amadeus-validator`（V6）、`test:examples` の invariants |
| R006（全検証 green、意味論保存、examples 再生成） | business-rules INV001、business-logic-model 出力 | examples-contract / generator / wrapper の追従、examples 4 snapshot の real provider 再生成 | `npm run test:all` exit 0、`test:examples`（workspace 4、Intent 4、provenance、invariants 4、generation plan） |
| R007（#369 判断 3・4 の上書き記録） | business-rules（業務ルール 1） | `docs/amadeus/lifecycle/state.md` の補足、`docs/adr/0003` のステータス | 文書レビュー（本 PR） |

## Grilling 判断の反映

| 判断 | 反映 |
|---|---|
| GD001（機械可読は v2 構造と英語ラベル、記述系は日本語） | `aidlc-state.md` と `intents.json` と audit イベントは英語ラベル、SKILL.md と契約文書は日本語規範 |
| GD002（Space 名 default） | `aidlc/spaces/default/`、validator の active-space 解決の既定値 |
| GD003（完全移行、.amadeus 削除、YYMMDD 改名） | 移行スクリプトの `--delete-old`、record `260703-aidlc-v2-full-compliance` への移設 |
