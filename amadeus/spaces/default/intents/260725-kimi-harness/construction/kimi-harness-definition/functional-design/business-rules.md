上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Rules — kimi-harness-definition

requirements.md の FR-1/FR-7b/FR-10 と components.md C1、component-methods.md の宣言構造から導出する不変条件。

## 宣言の不変条件

- BR-1: manifest は `name: "kimi"`・`harnessDir: ".kimi-code"`・`rulesRename: null`・`emit: null` とする(ADR-1/ADR-2)
- BR-2: coreDirs は claude 相当(tools, amadeus-common, knowledge, rules→rules, sensors, scopes, agents, hooks)+ session skills 6本(amadeus-election / amadeus-grilling / amadeus-mirror / amadeus-outcomes-pack / amadeus-replay / amadeus-session-cost — `packages/framework/core/skills/` 実測)。session skills は coreDirs 投影で配置し、orchestrator/runners は runner-gen が生成する(役割の二重配置をしない)
- BR-3: manifest にロジックを置かない(09-porting「manifest は DATA」)。分岐・生成処理は packager 側の既存機構のみを使う
- BR-4: snippet 正本(`hooks/amadeus-hooks.snippet.toml`)は managed block の唯一のソースとし、installer・doctor・docs がこれを参照する(ADR-4)
- BR-5: authored surfaces は Kimi の検出規約に一致する: orchestrator は `.kimi-code/skills/amadeus/SKILL.md` に配置され `name`+`description` を持つ。frontmatter の未知フィールド寛容性は実測済み(ADR-2)
- BR-6: dist smoke の期待ファイル表は module-scope リテラルとし、manifest から導出しない(t149 様式 — manifest バグとの共変を防ぐ)
- BR-7: `dist/kimi/`・ルート `.kimi-code/` は生成物であり、手編集しない(project.md Forbidden)

## 適用範囲

- U1 の完了定義(unit-of-work.md)と FR 対応(unit-of-work-story-map.md の FR-1/FR-7b/FR-10 行)に適用する
- services.md の判定(常駐サービスなし・実行単位は無状態)により、rules は全て宣言物・生成物の静的な不変条件とする
