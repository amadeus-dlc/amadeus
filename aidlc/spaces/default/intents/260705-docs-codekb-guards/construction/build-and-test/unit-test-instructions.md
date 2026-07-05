# Unit Test Instructions

Unit: docs-codekb-guards（Test Strategy: Minimal）

## 対象

Bolt 3 本の修正に対する要求駆動の検証は、専用 eval に集約している（1 要求 1 検査以上）。

```sh
npm run test:it:docs-codekb-guards
```

## 検査構成（24 検査）

- B001（FR-1、4 検査）: 隔離 temp workspace に実 git リポジトリ + linked worktree を作り、実 CLI（`amadeus-utility.ts codekb-path`）で repo キー解決を検査する。非 git ディレクトリのフォールバック（FR-1.3）を含む。
- B002（FR-2、16 検査）: 隔離 workspace で intent-birth から code-generation 完了試行まで実 CLI で駆動し、宣言なし拒否（FR-2.5）、evidence の形式・実在検証（FR-2.3）、宣言後の完了 + GUARD_EXEMPTED 記録（FR-2.1/2.4）、registry 不一致時の非ゼロ終了を検査する。
- B003（FR-3、4 検査）: merge 済み実 record（260705-steering-learnings）+ 実 codekb/amadeus/ を隔離 workspace へコピーし、validator の参照解決型判定の pass / fail 双方を検査する。

## TDD 証跡

全検査が RED → GREEN の順で確認済み（B002 はセッション断による実装先行のため遡及 RED 検証 = 実装 stash → FAIL 確認 → 復元 → GREEN）。詳細は code-generation の [code-summary.md](../docs-codekb-guards/code-generation/code-summary.md) を参照する。
