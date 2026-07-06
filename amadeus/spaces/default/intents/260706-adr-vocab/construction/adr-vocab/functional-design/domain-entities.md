# Domain Entities — adr-vocab

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更対象の実体と変更種別

| 実体 | path | 変更種別 | 対応 FR |
|---|---|---|---|
| ADR 0001 | `docs/adr/0001-lifecycle-binding-profile.md` | 判断の要旨を extension-guide へ移設して削除 | FR-1.1 / FR-1.4 |
| ADR 0002 | `docs/adr/0002-intent-phase-directory-layout.md` | phase ディレクトリ構成判断の要旨を lifecycle/overview.md「成果物配置」節へ移設して削除 | FR-1.1 / FR-1.4 |
| ADR 0003 / README | `docs/adr/0003-*.md`、`docs/adr/README.md` | 上書き済み / 同期ルールの一般規範を rules へ統合して削除 | FR-1.2 / FR-1.4 |
| 移設先 1 | `docs/amadeus/extension-guide.md` + `.ja.md` | 「設計判断の由来」を追記（Lifecycle Binding / Profile の要旨 + git 履歴参照） | FR-1.1 |
| 移設先 2 | `docs/amadeus/lifecycle/overview.md` + `overview.ja.md` | 「Artifact layout」/「成果物配置」節へ phase ディレクトリ構成判断の要旨 + 経緯参照を両言語で追記（見出し不変） | FR-1.1 |
| 語彙規範 | `.agents/rules/context.md` | 正準・抜粋の境界、同期規約（一般規範の統合）を追記 | FR-1.2 / FR-2.4 |
| 正準 | `CONTEXT.md` | ADR 定義の現行化、Glossary 定義の「抜粋」化、GD009 補正、Aidlc State 5 箇所改名、棚卸し語彙の追記 | FR-2.1 / FR-3 |
| 抜粋 | `amadeus/spaces/default/knowledge/glossary.md` | 冒頭に抜粋宣言 + CONTEXT.md 参照、旧名 2 行 3 件補正 | FR-2.1 / FR-3.3 |
| skill | `skills/amadeus-domain-modeling/SKILL.md`（8 / 21 / 209 行）→ 昇格先 | docs/adr 言及の除去と glossary 位置づけ（抜粋）の更新。promote-skill.ts 経由 | FR-1.3 / FR-2.3 |
| skill eval 文書 | `skills/amadeus-domain-modeling/evals/README.md` | docs/adr 言及の更新 | FR-1.3 |
| README | `README.md` 155 行 + `README.ja.md` 155 行 | ADR リンク行を判断記録の現行の置き場（Intent record の decision、steering、CONTEXT.md）への説明に置換。**編集前に engineer5 とピア確認（先勝ち + 追従）** | FR-1.3 |

## 実体間の関係（変更後の姿）

- CONTEXT.md（唯一の定義元）→ glossary.md（workspace 運用語彙の抜粋 + 参照）。一方向・手動。
- `.agents/rules/context.md`（規範の単一の置き場）が、旧 docs/adr/README 同期ルールの一般規範（逆同期・確定語彙のみ・実装優先）を吸収する。
- `amadeus-domain-modeling` skill は glossary / domain-map / context-map だけを扱い、CONTEXT.md と退役済み docs/adr には触れない（現行制約の維持 + 記述の現行化）。
- 判断記録の現行の置き場 = Intent record の decision + grilling trail + steering 根拠表 + CONTEXT.md（語彙）。ADR はこの体系に吸収されて退役する。
