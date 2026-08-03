# Story Map — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): requirements.md(Intent analysis の2面価値 = 配布面の破損棄却/開発面の実装前検出 — 各 Unit の価値記述の導出元)、unit 構成は components.md の U1〜U8 帰属、順序は component-dependency.md 由来のエッジ、出力契約は services.md(S1/S2)、裁定制約は decisions.md(ADR-1〜4)、API 面は component-methods.md(プロパティ P-EL/P-ST 系)

## 価値の流れ(2人の利用者視点)

| 段 | Unit | Amadeus 利用者(配布面)が得るもの | 保守チーム(開発面)が得るもの |
|---|---|---|---|
| 1 | election-readpath | 破損した選挙台帳(重複 internalNo・空 choices 等)がユーザー環境の読取でその場棄却される(dist 7面に乗る) | #1459 級の非対称バグが round-trip + fail-closed プロパティで実装前に検出される。#1459 の shrink 最小反例がテストに固定 |
| 2 | state-pbt | (プロダクション変更なし) | state 2層(receipts / テキストフィールド)の write⇔read 非対称が PBT で常時監視される |
| 3 | cast-guard | (同上) | 「バリデータ非経由の読み戻し経路」の新設が CI で機械的にブロックされる(shrink-only ratchet) |
| 4 | pbt-deep-ci | (同上) | 手動トリガの深掘り(numRuns 50,000)で浅い探索が見逃す反例を回収でき、失敗 seed がログで再現可能 |
| 5 | scope-ledger | (同上) | 根拠9件の射程判定が record に固定され、姉妹施策(#1979/#1981)との分担が追跡可能 |
| 6 | mirror-property(Could) | (同上) | mirror render→parse の property 版で t274 の example-based を一般化 |

## 非目標の確認

mirror/audit のコーデック層の再被覆・44件全量台帳・深掘り schedule 化・crash-consistency・`setField` 意味論変更は価値に含めない(requirements.md Out of scope)。価値は「読み側 fail-closed の出荷」と「非対称バグの実装前検出」の2面で完結する。
