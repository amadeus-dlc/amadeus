# Business Rules — ledger-pr-docs

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## ルール

| ID | ルール | 出典 |
|---|---|---|
| BR-1 | 既存の見出し・語彙・粒度に合わせて追記し、既存節の記述は変更しない | 生成前チェック規約、N1 |
| BR-2 | #464 で係争中の論点を確定事実として書かない | R004 |
| BR-3 | 変更は state.md 1 ファイルに限る（エンジン・validator・hooks・skills・テンプレート新設なし） | N1、スコープ外 |
| BR-4 | 日本語で japanese-tech-writing の規範に従う | N2 |

## 検証の分担

BR-3 は diff レビューと `npm run test:all`（AC3）で、BR-1 / BR-2 / BR-4 は reviewer と PR レビューで担保する。
