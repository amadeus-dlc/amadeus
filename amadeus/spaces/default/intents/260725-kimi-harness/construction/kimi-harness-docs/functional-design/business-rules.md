上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Rules — kimi-harness-docs

requirements.md の FR-8 と components.md C1(onboarding fills)から導出する不変条件。

## 執筆の不変条件

- BR-1: 前提は実測版を明記する(kimi 0.28.1+ = doctor フロアと同じ値。bun on PATH)
- BR-2: hook 配線の記述は snippet 正本を参照とし、内容を docs に転記しない(ADR-4 の単一ソース)
- BR-3: 制約を正直に書く: `[[hooks]]` はユーザーレベルの config.toml にのみ書ける(プロジェクト config なし)。hook コマンドの cwd はプロジェクト dir。hook は補助的機構(未配線でもワークフローは advisory モードで動く)
- BR-4: 言語規則を守る(docs は英語既定・ja 対訳。amadeus/** は日本語)
- BR-5: 実測に基づいて書き、未検証の動作を書かない(team.md First Principles P2「記録と検証は実測事実のみを根拠にする」)。dogfood・live journey の結果と突合する

## 適用範囲

- U7 の完了定義(unit-of-work.md)と FR 対応(unit-of-work-story-map.md の FR-8 行)に適用する
- 前提セクションの実測源は component-methods.md の C4(doctor 4チェック)と C3(マージフロー)とする
- services.md の判定(docs は実装確定後に書く)に従い、B1-B6 の着地内容を正とする
