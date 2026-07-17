# User Stories Assessment — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜6)、codekb の business-overview.md / component-inventory.md(RE 全数再検証済み台帳)、`../practices-discovery/team-practices.md`(既存実践)、stories.md、personas.md。

## 品質評価

- **BDD 形式**: 全 US の AC が Given/When/Then(inception ガードレール)— 実測可能(exit code / 配置検証 / grep / advisory 出力)
- **独立性**: 順序依存なし(stories.md 末尾の独立性節)— fixture 単位・テストのみ・FR-6 単位に分離
- **FR カバレッジ**: **AC 粒度**の対応表(stories.md 末尾)で orphan なし — AC-4a は US-2.3 として US 化済み(reviewer M 指摘の是正)。FR-3 AC-3b は US-1.1/1.2 の Then に内包、FR-6 AC-6d は制約(US 対象外)と明記
- **アクター・価値**: 全8 US に As/Want/So that を明記(P-1〜P-3、reviewer 指摘の是正で全数化)
- **MoSCoW / 依存 / INVEST**: stories.md「優先度・依存関係・INVEST」節に収載(ステージ契約 Step 8 の必須3項目)

## エピック→Bolt の見立て

3エピックとも同一ファイル群+同一検証列のため単一 Bolt に収まる(mob-composition の直列判断と整合)— units-generation で最終確定。

## 選挙不要判定の記録

明確化質問 0 問(E-OC1・leader 承認 2026-07-16T12:16:48Z)— ペルソナ/価値は既決、分割は c1 既決、AC はモック+FR の導出。
