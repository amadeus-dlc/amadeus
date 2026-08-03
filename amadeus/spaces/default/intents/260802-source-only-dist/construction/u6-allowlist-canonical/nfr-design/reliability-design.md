# Reliability Design — u6-allowlist-canonical

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## fail-closed契約

- 重複区分、無効path、期待集合差は非0
- `.gitattributes`は本Unitで実file突合し、不一致を非0
- `.gitignore`実file突合は対象節が成立するu8まで実行せず、ここでは期待純関数のfalling proofだけを行う
- preserved viewはimport導出のみで別fallback一覧を持たない

## 復旧

正本dataを修正して再検査する。`.gitignore`や`.gitattributes`だけを修正して正本との乖離を隠さない。u5統合時は先行差分を再接地する。
