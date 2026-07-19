# Business Rules — election-skill(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## ルール一覧

| # | ルール | 由来 | テスト |
|---|---|---|---|
| BR-K1 | SKILL.md に禁止語彙(GoA 集計規則・閾値・シャッフル手順・開票分岐の規則文)が現れない | FR-8a | 禁止語彙 grep 検査テスト(unit — fs read のみだが SKILL.md は tracked 固定ファイルのため integration 層へ) |
| BR-K2 | 禁止語彙検査は正当な SKILL.md(転送ループのみ)で赤くならない(vacuity guard の対) | corpus-sweep-for-new-guards | 正例 green+規則文注入で赤(落ちる実証) |
| BR-K3 | SKILL は4節構造(起動/転送/人間委譲/終了)を持つ | FR-8b の構造契約 | required-sections 型の構造検査 |
| BR-K4 | hold の人間委譲が SKILL 記述に実在し、自動解決の記述がない | C-01 | 委譲文の grep 実在+自動解決語の不在 |

## 落ちる実証

BR-K1 検査述語へ規則文 fixture を注入して赤→revert。BR-K2 の vacuity guard(定型ヘッダのみの入力で検査が空文化しない)を含む(vocabulary-collision-vacuity-guard)。
