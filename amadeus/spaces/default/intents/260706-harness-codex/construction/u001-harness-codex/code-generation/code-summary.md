# Code Summary — u001-harness-codex（B001）

## 上流入力

[business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)（u001-harness-codex、規模 S）。

## 実施結果

| 変更 | 内容 | 結果 |
|---|---|---|
| 純正性検証（FR-1） | fresh clone + b67798c3 checkout。上流 yaml 38 件が全件同一（sha256 = a1499d95...）で guard のみ、A-1 成立。orchestrator（bare 入口 skill）は yaml なし | provenance.md に記録 |
| 写像（FR-2） | prefix 規則の機械適用 + 両側実在交差 = 38 件全件が取り込み対象。上流のみ 0 件、当方独自 4 件（amadeus / validator / grilling / domain-modeling）は対象外 | provenance.md の写像表 |
| yaml 追加（FR-3） | skills/amadeus-*/agents/openai.yaml を 38 件生成（provenance コメント 4 行 + 上流実体。guard に旧名が含まれないため内容は無変換）。skill-forge 由来の既存 2 件は不変更 | 38 件 |
| harness/codex（FR-4） | README.md と provenance.md を新設（日本語。Phase 2 正準化予定と言語再判定条件を明記） | 2 文書 |
| 検出器追従（FR-6.5） | postRenameScan.scanRoots へ "harness" を外科的 1 行挿入（+1 行のみの diff） | 1 行 |
| promote 昇格（FR-5） | 38 skill をループ実行、fail 0。.agents/skills/ へ反映（skill-forge の既存昇格物は不変更） | 38/38 |

## 検証記録（FR-6）

| 検証 | 結果 |
|---|---|
| npm run test:all | pass（exit 0） |
| npm run test:it:promote-skill | pass |
| npm run parity:check | ok（39 skills、199 engine files、基準 b67798c3）= FR-6.2 の非照合確認 |
| rename-leftovers（scanRoots へ harness 追加後） | pass。追加した検出器が provenance.md の旧名トークン 1 件を実際に検出し（バッククォート付き上流 skill 名）、allow パターン準拠の表現へ修正して解消 = 検出器が機能する実証（FR-6.4/6.5） |
| 言語方針の同期義務（FR-6.3） | 発火しない: 追加 yaml は guard のみで SKILL.md の description 由来記述を含まず、SKILL.md も不変更（skill-language-policy.md 31 行・88 行の適用規則に該当しない） |
| validator（Intent 指定込み） | pass（不足・矛盾なし） |

## 受け入れ条件との対応

requirements.md の受け入れ条件 4 行すべてに対応する成果と記録が揃った（harness/codex 2 文書 + 写像表、yaml 追加 + 昇格、照合結果の provenance 記録、検証 pass 一式）。
