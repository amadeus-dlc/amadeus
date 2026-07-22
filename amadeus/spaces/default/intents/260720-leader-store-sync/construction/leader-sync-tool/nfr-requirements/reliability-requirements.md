# Reliability Requirements — leader-sync-tool(U1)

上流入力(consumes 全数): requirements, business-logic-model, business-rules, technology-stack — 失敗分類は business-logic-model.md のエラー経路、fail-closed は requirements.md NFR-3、除外保証は business-rules.md BR-2 に依拠。

## 要求

- R-1: fail-closed — clone-id 不在・git/gh 失敗・除外違反残存はすべて loud exit 1(無音 fail-open 分岐ゼロ。business-logic-model.md「判定不能を成功扱いする分岐は存在しない」の要件化)。
- R-2: 冪等 — create の再実行は新ブランチ(seq 増分)で安全(部分失敗のブランチはローカル破棄可能、main/store へ副作用なし — BR-9)。
- R-3: 落ちる実証(BR-6)と corpus sweep(BR-7)が信頼性検証の両側(赤くなる/赤くならない)を固定。

## 検証

integration テストで R-1 の各 loud 経路(clone-id 欠落・fake runner 失敗注入)と R-2 の再実行を固定(t232 帯様式)。
