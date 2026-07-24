# NFR Requirements Questions — mirror-distribution-docs

## 判定

`business-logic-model.md`と`business-rules.md`は6 surface、byte digest、self-install、CLI fixture、日英文書semantic marker、validation matrixを確定している。`requirements.md`のNFR-3／4と`technology-stack.md`のpackage／promote toolsから測定条件を導出できるため追加質問はない。

## 確定済み回答

### Q1. 配布生成物を正本にするか

[Answer]: しない。core／manifest／docs sourceだけを正本とし、dist／self-installはdeterministic generatorで再生成・検査する。

### Q2. 日英文書の一致をどう測るか

[Answer]: prose byte一致ではなく、topic markerと`MIRROR_USER_CONTRACT`由来canonical semantic fieldsを照合する。

## 曖昧性分析

- runtime SLOとbuild-time check時間を分離した。
- Kiro／Kiro IDEのself-install不存在をmissing failureにしない。
- 両localeが同じ誤記でもruntime contractとの差分として検出する。
