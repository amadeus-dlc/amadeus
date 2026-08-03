# Security Test Instructions — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): code-generation-plan.md(全6 unit — 各 Bolt の実装方針・TDD・検証計画)、code-summary.md(全6 unit — 着地 PR・実装内容・テスト・実測ゲート・逸脱裁定)

## 選定範囲

承認済み NFR と実在境界へ trace できる範囲に限る(cid:build-and-test:bt-proportional-selection)。本 intent の security 面は **入力検証コントロールの退行検出**の1点で、認証・暗号・秘密管理は対象境界を持たない。

## 対象境界(code-summary.md より)

| 境界 | 検証内容 |
|---|---|
| election 読取 | 破損した台帳(重複 internalNo / 重複 voter / 空 choices / 壊れた JSON / 未知 state)が `Store.load` / `Store.setState` の両読み口で `err("corrupt")` により棄却される(fail-closed)。**この検証は配布物(dist 7面)に乗り、ユーザー環境でも破損記録をその場で棄却する** |
| state 構造フィールド | `parseMirrorBoundaryReceipts` の5棄却分岐(重複 phase / 不正 JSON / 非オブジェクト / 未知 phase / 不正 status)が退行していないこと。重複 phase の受理は last-write-wins によるゲート状態のサイレント上書きを許すため、security 上の意味を持つ |
| 台帳の読み側 | cast-guard の `parseAllowlist` が不正形(配列 sites / 非整数 count)を **ALLOWLIST_UNREADABLE で fail-closed 棄却**すること。空台帳として受理すると台帳故障をソース退行と誤報する(#1980 Bolt 5 のレビュー実測) |

## 実行

```bash
bun test tests/integration/t417-election-store-failclosed.pbt.test.ts   # election 棄却
bun test tests/unit/t418-state-receipts-codec.pbt.test.ts               # state 5分岐
bun test tests/integration/t420-unchecked-cast-guard-cli.test.ts        # 台帳 fail-closed
bun tests/unchecked-cast-guard.ts --check                               # 非経由経路の残存検出
```

## 依存監査の分界

対象変更の security regression と repository 全体の dependency audit は別判定とする(cid:build-and-test:c1-doctor-seam)。本 intent は新規外部依存ゼロ(fast-check / typescript とも既存 devDependency)であり、範囲外の依存更新は別作業とする。

## 生成しなかった検査と理由

- 認証・認可検査 — 本 intent の変更面に認証境界がない
- 秘密スキャン — scope-ledger unit で文書への秘密様パターン grep(0件)を実施済み。コード面は新規の秘密取扱いがない
