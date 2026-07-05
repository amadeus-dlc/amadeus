# コード生成サマリ — unit: evaluator-vocabulary

## 変更ファイル一覧

### 分類 1（読み替え対象）として編集したファイル

- `aidlc/spaces/default/memory/team.md`：判断基準行（旧 30 行目）と Git Branching Policy「検出境界」節（旧 215 行目の段落）を verbatim ペア 1・2 のとおり読み替えた。
- `skills/amadeus-validator/SKILL.md`（source）：207・208 行目を verbatim ペア 3・4 のとおり読み替えた。
- `.agents/skills/amadeus-validator/SKILL.md`（昇格先）：`promote-skill.ts --replace` により source と同期した。
- `dev-scripts/evals/amadeus-templates/check.ts`：`textContracts` の `includes` needle を verbatim ペア 5 のとおり新文言へ更新した。
- `aidlc/spaces/default/knowledge/background.md`：R003 の repo 全体 grep で見つかった分類 1 の追加ヒット。「後段発見と横断学習」節の 2 行（旧 19・24 行目）を、team.md と同じ読み替え方針（validator = 実行時の構造検出、sensors = gate 時の決定論的検査）で読み替えた。

### Step 5 の検証通過に必要だった追加変更

- `aidlc/spaces/default/intents/260705-evaluator-vocabulary/aidlc-state.md`：`Per unit: [TBD]` を `Per unit: evaluator-vocabulary` に更新した（AmadeusValidator が `construction/[TBD]/...` を存在しない produces として fail していたため）。

### 計画書チェックボックス更新

- `aidlc/spaces/default/intents/260705-evaluator-vocabulary/construction/evaluator-vocabulary/code-generation/code-generation-plan.md`：Step 1〜Step 5 を完了に更新した。

### 新規作成

- `aidlc/spaces/default/intents/260705-evaluator-vocabulary/construction/evaluator-vocabulary/code-generation/issue-disposition.md`（Step 4）
- 本ファイル（Step 6）

## RED → GREEN 証跡（WF2）

SKILL.md 編集直後、fixture 更新前に `npm run test:it:amadeus-templates` を実行し、RED を確認した。

```
/…/skills/amadeus-validator/SKILL.md does not include "The evaluator's result is quality evaluation; keep it separate from the validator's judgment."
```

fixture（`dev-scripts/evals/amadeus-templates/check.ts`）を新文言へ更新した直後、`promote-skill.ts` 実行前に同 eval を再実行したところ、想定どおり別の fail が出た（`textContracts` が source と昇格先の双方を同一 needle で検査するため、昇格先が未反映の間は fail し続ける。functional-design の Review で iteration 1・2 とも指摘済みの非ブロッキング事項であり、計画の手順順序どおりに進めた結果として観測した）。

```
/…/.agents/skills/amadeus-validator/SKILL.md does not include "The engine sensors' result is deterministic quality checking fired at gates (recorded as `SENSOR_FIRED`); keep it separate from the validator's judgment."
```

`bun run dev-scripts/promote-skill.ts amadeus-validator --replace` を実行し、昇格先へ同期した。
その後の再実行で GREEN を確認した。

```
amadeus template eval: ok
```

`npm run test:it:promote-skill` も pass した。

```
promote skill eval: ok
```

## R003：repo 全体 `grep -rni evaluator` の 3 分類判定表

読み替え実施後に再度 grep を実行し、残存する全ヒットを次の 3 分類に判定した。

| 分類 | 対象ファイル | 判定根拠 |
|---|---|---|
| 1. 読み替え対象（実施済み） | `aidlc/spaces/default/memory/team.md`、`skills/amadeus-validator/SKILL.md`、`.agents/skills/amadeus-validator/SKILL.md`、`dev-scripts/evals/amadeus-templates/check.ts`、`aidlc/spaces/default/knowledge/background.md` | #240 が構想した未実装の独立評価機構 `evaluator` を指す規範記述。上記のとおり読み替え済み。 |
| 2. 対象外（別概念・現行契約） | `skills/amadeus-validator/references/skill-contract.md`、`skills/amadeus-grilling/references/skill-contract.md`、`.agents/skills/amadeus-validator/references/skill-contract.md`、`.agents/skills/amadeus-grilling/references/skill-contract.md`、`amadeus-contracts/catalog/skill-contract-consumer.ts`、`amadeus-contracts/catalog/skills.ts`、`amadeus-contracts/generated/skills.json` | Skill Contract の consumer role `evaluator` は #240 の廃止機構とは別の生きた契約概念であり、business-rules.md の変更禁止対象。改名要否は issue-disposition.md に別議論として記録した。 |
| 3. 対象外（歴史的記録・作業記録） | `aidlc/spaces/default/intents/260703-skill-quality-repair/inception/requirements-analysis/requirements.md`、`aidlc/spaces/default/intents/260704-v2-parity-completion/audit/j5ik2o-mac-studio-lan-5e97b7fa9d15.md`、`aidlc/spaces/default/intents/intents.json`（本 Intent 自身の slug/dirName、canonical ID として不変）、および `260705-evaluator-vocabulary` 配下の全成果物（`aidlc-state.md`、`audit/`、`inception/requirements-analysis/*`、`construction/**/functional-design/*`、`construction/functional-design/memory.md`、`code-generation-plan.md`、`verification/phase-check-inception.md`） | 過去 Intent の完了済み記録、Issue 引用を含む audit、および本 Intent 自身が改名作業そのものを記述する作業記録。書き換えない。 |

分類 1 について、team-lead から伝達された既知の対象（team.md・SKILL.md）以外の追加ヒットは `background.md` の 2 箇所のみであり、同方針で読み替えた。それ以外に分類 1 に該当する追加ヒットはなかった。

## 検証結果

- `npm run test:all`：exit 0（全件 pass）。2 回実行し、`aidlc-state.md` の `Per unit` 更新後も再確認した。
- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-evaluator-vocabulary`：`Per unit` 更新前は `construction/[TBD]/...` の produces 不在で fail（4 件）。更新後は pass（fail 0 件、警告 0 件）。

## 逸脱

- functional-design の Review（iteration 2）が非ブロッキングで指摘した「WF2 の RED/GREEN 手順順序」の論点は、計画に記載された手順順序（fixture 更新 → GREEN 確認 → promote）のまま実施した。その結果、fixture 更新直後・promote 実行前の時点で想定どおりの中間 fail が発生した。この fail は昇格先が未反映であることによる既知の挙動であり、promote 実行後の再確認で GREEN になることを確認した。次回の計画改訂では、レビューの推奨どおり「GREEN 確認」ステップを promote 直後に移すか、fixture 更新直後のステップに「(promoted 未反映のため、この時点では fail のままでよい)」という注記を加えることが望ましい。
- Step 5 の検証を pass させるため、計画書には明記されていなかった `aidlc-state.md` の `Per unit: [TBD]` → `Per unit: evaluator-vocabulary` への更新を行った（team-lead からの個別指示に基づく）。
- functional-design の business-logic-model.md 内にある「team.md 検出境界節（214 行目の段落）」という引用行番号の 1 行ずれ（実際は 215 行目）は、functional-design 成果物自体の記述であり、code-generation の変更対象外のため、本 Intent では修正しなかった。

## Review

**Verdict**: READY

**Findings**:

- **verbatim ペア 1〜5 は完全一致で適用済み（ブロッキングなし）。** `git diff` で team.md（判断基準行・検出境界節）、`skills/amadeus-validator/SKILL.md`（source、207・208 行目）、`dev-scripts/evals/amadeus-templates/check.ts` の各 hunk を確認し、business-logic-model.md の「読み替えの正」5 件と逐語一致することを確認した。各 hunk は該当行のみの変更で、周辺行への意図しない編集はない。
- **background.md の追加読み替えは同一の正に忠実で、能力の創作なし（ブロッキングなし）。** 「後段発見と横断学習」節の 2 行は、「validator = 実行時の構造検出、sensors = gate 時の接続性・品質の決定論的検査（`SENSOR_FIRED` として記録）」という team.md と同じ読み替え方針をそのまま適用しており、sensors に実挙動を超える能力（例: PR 説明や team.md 自身の検査）を書き加えていない。
- **バケット 2（skill-contract.md ×4、contracts catalog TS、生成 json）とバケット 3（過去 Intent の audit/記録）は diff なしを確認済み（ブロッキングなし）。** `git diff --stat` をそれぞれの path 集合に対して実行し、出力が空であることを確認した。
- **昇格先 SKILL.md は source とバイト同一（ブロッキングなし）。** `diff skills/amadeus-validator/SKILL.md .agents/skills/amadeus-validator/SKILL.md` が差分なしを返した。promote 経由の同期が正しく行われている。
- **[非ブロッキング・軽微] 3 分類判定表がバケット 3 の一部ファイルを明示列挙していない。** 自分で `grep -rni evaluator` を実行し、code-summary の判定表と突き合わせた結果、`construction/evaluator-vocabulary/code-generation/issue-disposition.md` と同 `code-summary.md` 自身（Issue #439 の原文引用や本 Step の記述に由来する "evaluator" 言及）が、バケット 3 の括弧内列挙（`aidlc-state.md`、`audit/`、`inception/requirements-analysis/*`、`construction/**/functional-design/*`、`construction/functional-design/memory.md`、`code-generation-plan.md`、`verification/phase-check-inception.md`）に明示されていない。「`260705-evaluator-vocabulary` 配下の全成果物」という総称には意味上含まれ、実害はないが、次回の軽微修正でこの 2 ファイルを列挙に加えることが望ましい。
- **検証結果は記録どおり再現した（ブロッキングなし）。** `AmadeusValidator . 260705-evaluator-vocabulary` は不足・矛盾なしで pass、`npm run test:it:amadeus-templates` と `npm run test:it:promote-skill` はいずれも ok を確認した。
- 上記を除けば、計画の Step 1〜6 は functional-design の読み替えの正と 3 分類方針を過不足なく実装しており、business-rules.md の変更禁止対象（sensors/validator 実装、Skill Contract、歴史的記録）にも抵触していない。
