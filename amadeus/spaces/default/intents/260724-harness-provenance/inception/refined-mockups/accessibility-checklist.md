# Accessibility Checklist — 260724-harness-provenance

上流入力(consumes 全数): wireframes.md, user-flow.md, stories.md, requirements.md, team-practices.md

## N/A

非UIのためアクセシビリティチェックリスト(WCAG等)は N/A。CLI/ログ出力のみで画面要素を持たない。

## 根拠

代わりに使う内部証拠: stories.md の利用シナリオ本文(「実行中のハーネス種別が `amadeus-state.md` に自動記録されてほしい」)が示すとおり、本機能の相互作用は CLI/ファイル記録のみで画面・スクリーンリーダー・キーボードナビゲーションの対象要素を持たない。team-practices.md の Way of Working(`packages/framework/core/` 編集・`dist/` 再生成)も UI アクセシビリティに関与しない開発フローである。mockups.md も出力契約表のみで視覚要素を含まない。
