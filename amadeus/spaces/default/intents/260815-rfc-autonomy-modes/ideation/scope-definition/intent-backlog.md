# Intent Backlog — proto-Units(intent 260815-rfc-autonomy-modes)

> MoSCoW: 全能力 SETTLED(RFC approved)のため全項 **Must**。優先順位は dependency-first の位相順。proto-Unit は units-generation 段で正式な Unit 境界(source/test ownership 同界)へ精緻化する。

| 順 | proto-Unit | 含む能力(scope-document #) | 依存 |
|---|---|---|---|
| 1 | recommendation-outcome-core | #1(判別ユニオン + 梯子全段適用 + contested UX) | なし(基盤) |
| 2 | session-presence-detection | #2(対話/非対話検出) | なし |
| 3 | non-interactive-interruption | #3(park guard 廃棄 + 一級待ち状態)+ #9 の非対話側 + Q7/Q8/Q14 裁定 | 1, 2 |
| 4 | ladder-ruling-order | #6(D4 置換)+ #9 の対話側(Q11) | 1, 2 |
| 5 | semi-redefinition | #10(権限差し替え + Bolt 自律化 3 面)+ #11(advisory 自動化、Q4) | 3 |
| 6 | projection-truthfulness | #5(乖離 loud fail 全 mode 化)+ #12(常時可視) | 5(投影 3 面と同時) |
| 7 | config-axis-separation | #4(キー廃止 + consent 軸再分類、Q18) | 6 |
| 8 | norms-and-docs | #14(ノルム 3 レイヤー)+ #15(frontmatter)+ #13 の文書面(Q5/Q6 裁定反映) | 1〜7 の確定 |
| 9 | investigation-d6 | #7(空振り承認の原因調査 — 欠陥なら別 Issue 分離) | 独立(いつでも) |

- 検証横断: 各 Unit に落ちる実証つきテスト(TDD 既定)。付録 B クラス(172 件・79 件)の構造的消滅は build-and-test で述語化
- Q9(degrade スコープの WS)・Q10(§13 機械化)は requirements 段で裁定し、着地 Unit を確定する
