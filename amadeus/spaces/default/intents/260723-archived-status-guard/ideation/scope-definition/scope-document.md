# Scope Document — 260723-archived-status-guard

上流入力(consumes 全数): intent-statement、feasibility-assessment、constraint-register。

## In(Must — Issue #1396 提案+E-ASGIC1/2 裁定で確定)

1. **S1 語彙 enum 化**: registry status を in-flight / parked / complete / archived の4値 enum に固定し、`updateIntentStatus`(単一 chokepoint — feasibility 実測 state.ts:1904)で不正値を loud 拒否。既存 `closed` 消費側の repo grep 棚卸し込み(C8: 互換分岐は作らず置換)
2. **S2 誤再開ガード**: archived intent への cursor 設定・`next`・unpark を loud エラーで拒否。cursor は書込・読出の両側ガード(feasibility R3 — symmetric-pair)
3. **S3 archive/unarchive verb**: 対の専用 verb+human-presence 必須+両方向監査イベント(E-ASGIC1 裁定 A)
4. **S4 260713 移行**: closure-note.md を根拠に `closed` → `archived`(既存ユーザー裁定の執行)
5. **S5 落ちる実証+回帰テスト**: archived への next 拒否の falling proof を含むテスト一式(org.md Mandated)

## Out(非目標)

- registry への `parked` 書込・park/unpark の挙動変更(E-ASGIC2 裁定 A — 語彙契約のみ)
- #1309 の投影・Catalog・共通契約 interface の実装(e2 intent スコープ)
- elections 側の構造統一(同上)
- `complete` の既存意味論変更、既存 intent の一括ステータス棚卸しキャンペーン

## 依存順序(dependency-first)

S1(enum)→ S2(ガード)/ S3(verb)→ S4(移行 — verb 実在後に実行)→ S5 は S1〜S4 に随伴。S2 と S3 は S1 依存で相互独立(並行可)。

## 整合条件

- C7(feasibility): 実装前に e2 intent の status 語彙定義と4値の一致を機械確認(不一致時は実装停止→選挙)
