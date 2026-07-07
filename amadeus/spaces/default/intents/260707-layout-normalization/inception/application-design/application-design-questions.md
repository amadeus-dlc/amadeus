# Application Design Questions

## 質問生成の判断

追加質問は生成しない。`requirements`、`architecture`、`component-inventory`、`team-practices` により、設計に必要な component boundary、integration approach、validation guard が揃っているためである。

## 判断済み事項

- UI component structure: この intent は UI を含まない。
- AWS/service mapping: この intent は cloud service や deployment environment を含まない。
- Service communication pattern: runtime service 間通信ではなく、repository-local CLI と generated distribution contract が対象である。
- Data ownership: `core/`, `harness/`, `dist/`, `.claude/.codex/.agents`, `packages/setup` の ownership を設計対象とする。

## 未回答質問

現時点で設計を止める未回答質問はない。承認 gate では、推奨 decision を採用するか、full normalization 方向へ変更するかを確認する。
