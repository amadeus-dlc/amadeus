# Evidence — 260725-kimi-harness

## スキャン代替の根拠(practices-discovery:c1)

同日(2026-07-25)に完了した reverse-engineering の codekb(code-structure / technology-stack / dependencies / code-quality-assessment / architecture / business-overview)が証跡スキャン面(CI・テスト・コードスタイル・セキュリティ・ブランチ戦略)をカバーしているため、Step 2 の4エージェント並列スキャンは実施せず codekb に代替した。消費した codekb 成果物は上記6件。

## 参照した affirm 済み内容

`amadeus/spaces/default/memory/team.md` の5セクション managed block(`practices-promote:BEGIN/END`)を確認。4セクション(Way of Working / Testing Posture / Deployment / Code Style)は現行内容が本 intent にも妥当で変更不要と判定(live 温存)。

## 推論と質問

- **推論(証拠確定)**: Walking Skeleton の現行 block は過去 intent 固有の記述(「既存Markdownのbranch hygieneであり…skeleton は設けない」)で陳腐化。本 intent は新配布経路を含む greenfield 要素を持ち、org.md(greenfield scope は常に skeleton 最初)と project.md(greenfield 要素 intent は最初の Bolt を小さな E2E スライス + ゲート)の既定が適用される
- **質問(1問)**: スライスの具体形をユーザーに確認 → A「M1 + `package.ts kimi` + `--check` 通過までを最初のスライス」と回答(2026-07-25, Guide me)

## 結論

変更は Walking Skeleton セクションのみ。新たな Mandated/Forbidden 規則の発見なし。
