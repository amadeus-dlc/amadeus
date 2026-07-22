# Story Map — 260720-leader-store-sync

上流入力(consumes 全数): requirements, components, component-methods, services, component-dependency, decisions, unit-of-work — ジャーニー各段は components.md の C5/C1・C2/C3・C4 と component-methods.md の M7/M1・M3/M5・M6 に写像し、verb 契約は services.md、PR 経路は decisions.md ADR-1、契機は requirements.md FR-2 に依拠(依存の一枚図は component-dependency.md)

## leader の利用ジャーニー(単一 unit へ写像)

1. **状況把握**: `bun scripts/amadeus-leader-sync.ts status` → 未同期選挙数・シャード差分・norm 差分(警告のみ)を1画面で得る(C5/M7 — FR-2 の N 超過判定)。
2. **計画確認**: `plan` → 抽出対象(2クラス)と除外判定のドライラン一覧(C1/C2 — 実行前の可視化、R-1 緩和)。
3. **同期実行**: `create` → main 起点ブランチ+自己検査レポート付き PR(C3/C4 — AC-3c/3d)。マージは従来どおり人間承認(C-4)。

## 写像の完全性

全ジャーニーが U1 単独で完結(story→unit 写像 1:1)。契機側(いつ 1. を走らせるか)は FR-2 ノルム(leader 執行)が規定 — 本 map の対象外。
