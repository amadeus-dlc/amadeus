# Design System Mapping — 260724-harness-provenance

上流入力(consumes 全数): wireframes.md, user-flow.md, stories.md, requirements.md, team-practices.md

## N/A

非UIのためデザインシステムへのマッピングは N/A。CLI 出力文言の書式は mockups.md の出力契約表を正とする。

## 根拠

代わりに使う内部証拠: stories.md の利用シナリオ本文「conductor として、intent を birth したとき、実行中のハーネス種別が `amadeus-state.md` に自動記録されてほしい」— これは CLI/内部記録の利用シナリオであり、視覚的なデザインシステムへのマッピングを要する画面要素を含まない。また team-practices.md の「本 intent への適用ポイント」節が引用する cid:code-generation:harness-tools-placement(harness 専用ツールの配置規約)は本機能が core 中立層の汎用検出機能であり対象外と判断しており、UI 層のデザイン規約は本 intent に関与しない。
