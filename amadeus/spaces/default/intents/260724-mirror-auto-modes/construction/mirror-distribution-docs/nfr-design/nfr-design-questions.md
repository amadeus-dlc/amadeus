# NFR Design Questions — mirror-distribution-docs

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`でprojection registry、transaction、scan、semantic parityは確定済みである。

## 確定済み回答

### Q1. surface別listを持つか
[Answer]: 持たない。package／promoteは同じprojection manifestを読む。

### Q2. checkが自動rollbackするか
[Answer]: しない。未完journalを`recovery-required`でread-only failし、generate／明示recoverだけがrollbackする。

### Q3. 全rootを単一filesystem transactionにするか
[Answer]: しない。manifest管理fileをatomic replaceし、共通lockで準拠readerのsnapshotを守る。

## 曖昧性分析

管理外fileを置換せず、secret scanとdocs parityは全公開projectionを対象にする。
