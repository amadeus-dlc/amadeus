# Domain Entities

## 目的

内部 skill ポリシー整合 Unit で扱う Domain Entity 候補を Task 生成の根拠として記録する。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Skill Classification | Amadeus skill を公開入口、横断的補助、内部 skill に分類する。 | README、AMADEUS.md |
| DE002 | Internal Skill Policy | 内部 stage helper の暗黙起動抑制方針を表す。 | Codex metadata |
| DE003 | Codex Skill Metadata | Codex の UI 表示、既定 prompt、暗黙起動方針を保持する。 | `agents/openai.yaml` |
| DE004 | Promotion Rule | source skill から昇格先 skill へ配布対象ファイルを反映する規則を表す。 | `dev-scripts/promote-skill.ts` |
| DE005 | Follow-up Candidate | 現在の Construction slice から分離する後続作業候補を表す。 | Issue #284、Discovery 候補 ID |

## 関係

- Skill Classification は README の一覧と Internal Skill Policy の対象を決める。
- Internal Skill Policy は Codex Skill Metadata の `policy.allow_implicit_invocation` に反映する。
- Promotion Rule は Codex Skill Metadata を source skill から昇格先 skill へ反映する。
- Follow-up Candidate は現在の Task 完了条件に混ぜず、Construction の判断と検証証拠で追跡する。

## Domain Map と Context Map への反映候補

- 共有境界またはコンテキスト間依存として新たに採用する候補はない。

## 未確認事項

- `SKILL.md` 英語化後に metadata の source hash を再生成する timing は未確認である。
