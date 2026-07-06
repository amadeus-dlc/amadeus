# フロントエンドコンポーネント — unit: skill-quality-repair

## 適用判断

本成果物は CONDITIONAL（unit が frontend / UI を含む場合だけ作成する）である。

本 unit（skill-quality-repair）は、amadeus skill 群の監査・補修、Grilling Decision Trail 生成規約の整備、GitHub Issue 短縮参照の入力契約追記を扱う（requirements.md R001〜R006）。変更対象は skill の Markdown、references、検査スクリプトであり、frontend / UI コンポーネントを含まない。

## 判断根拠

- requirements.md の機能要求 R001〜R006 に UI に関する要求がない。
- business-logic-model.md の WF1〜WF5 のいずれも、画面、コンポーネント階層、フォームを扱わない。
- 対象成果物（SKILL.md、references、TS 検査スクリプト）はすべて非 UI 資産である。

したがって、本 unit にフロントエンドコンポーネント設計は不適用である。
