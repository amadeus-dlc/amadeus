# Unit Story Map — intent 260815-rfc-autonomy-modes

> 縦 = ユーザー価値の到達段階、横 = Unit。各 Unit 単独で検証可能な価値を出荷する(walking-skeleton stance: self-feature のため最初の Construction Bolt に WS ゲート維持)。

## 価値の背骨(backbone)

1. **裁定が正直になる**(U1)— 「決められないのに進む」が構造的に不能になる。梯子・ゲートの全裁定点が unique/contested/none を正しく返す
2. **セッションの対話性が見える**(U2)— 対話/非対話の実効判定が単一ソース化
3. **止まりたいときに止まれる**(U3)— 非対話の裁定不能が理由付き waiting へ。park/waiting/REPAIR の 3 終端が分離
4. **対話なら聞いてくる**(U4)— full 対話セッションで contested が人間へ届く(#2974 の解消)
5. **semi が軽くなる**(U5)— phase 境界と WS 以外は自律進行(実測 172 件クラスの解消)。投影乖離は全 mode loud fail
6. **人間ゲートが本物になる**(U6)— presence なしの承認が通らない(D7/D8)
7. **設定が嘘をつかない**(U7)— trigger.mode 廃止・consent 軸分離・実効値の常時可視
8. **説明できる full**(U8 検収レポート / U9 §13 機械化 / U10 委任 provenance / U11 ceremony 実証 — 独立小物 4 件)
9. **文書が実装と一致する**(U12)
10. **不明機序が残らない**(U13 — D6 調査)

## Unit × FR 被覆(全数)

| FR | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Unit | U1 | U2 | U3 | U1+U3+U4 | U5 | U5 | U7 | U7 | U10 | U5 | U9 | U6 | U13 | U12 | 横断(U1/U3/U5 の無退行テスト所有) |

- 孤児 FR なし(15/15)。FR-15 は専有 Unit を持たない横断 NFR 的 FR — 各経路 Unit が prohibited-effect 到達不能テストを所有し、conductor が build-and-test で統合検証。
