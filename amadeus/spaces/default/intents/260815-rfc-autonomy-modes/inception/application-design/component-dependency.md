# Component Dependency — intent 260815-rfc-autonomy-modes

## 依存行列(→ = 依存する)

| from \ to | C1 型 | C2 梯子 | C3 対話性 | C4 waiting | C5 権限 | C6 投影 | C7 config | C8 可視化 | C9 レポート | C10 §13 | C11 委任 | C12 grant |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C2 梯子 | → | — | → | →(非対話時) | | | | | | | | |
| C4 waiting | →(ペイロード) | | → | — | | | | | | | | |
| C5 権限 | | | | →(park guard 廃棄が先行) | — | | →(trigger 導出) | | | | | |
| C6 投影 | | | | | →(semi 意味論) | — | | | | | | |
| C8 可視化 | | | → | | → | → | → | — | | | | |
| C9 レポート | | →(AUTO_DECIDED 行) | | | | | | | — | | | |
| C10 §13 | →(0件=unique相当) | → | | | | | | | | — | | |

- C13 presence-closure: 依存は C3(対話性/presence の一次信号面を共有)のみ。循環なし(C1 は葉、C8/C9 は読取専用の合成)

## 実装順(dependency-first — scope-definition の裁定)

1. **C1**(基盤型・依存ゼロ)
2. **C3**(対話性 — 既存再利用、依存ゼロ)
3. **C4**(waiting + park guard 廃棄。C1/C3 に依存)
4. **C2**(梯子・ゲート・Stop hook carveout。C1/C3/C4 に依存)
5. **C5 + C6 + C13**(semi 権限 + 投影 3 面同時 + presence 封鎖 — C4 先行済みが前提。C13 は C5 と同じ interaction 面に触れるため同段で直列)
6. **C7 + C8**(config 軸 + 可視化)
7. **C9 / C10 / C11 / C12**(独立小物 — 並行可)
8. 文書・ノルム 3 レイヤー + RFC frontmatter(全確定後)
9. D6 調査(FR-13)は独立 — いつでも

## データフロー

- 裁定点 → C2 導出 → C1 outcome → (unique) AUTO_DECIDED 監査 → C9 が集計
- (contested/none) → C3 判定 → 対話: 提示 / 非対話: C4 waiting(payload = presentationOf(outcome))→ resume 時に同 payload 再提示
- C7 実効値・C6 投影・C3 判定 → C8 → --status / statusline(表示は実効関数直結 — 別ソース禁止)

## 共有資源

- amadeus-state.md(状態フィールド)— C4/C5/C6 が書く。既存 withAuditLock 直列化を踏襲
- 監査シャード — append-only。新イベント 2 種は audit-format.md + event-registry へ同一変更で登録(event-count pin 系テストの更新を同梱)
