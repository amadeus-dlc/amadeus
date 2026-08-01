# Code Generation Plan — u2-residue-deletion

上流入力(consumes 全数): unit-of-work, functional-design(business-logic-model / business-rules / domain-entities), nfr-design, bolt-plan

## 実行計画(FD D1〜D5・I1〜I5 準拠)

1. **D1**: `ls scripts/formal-verif/` 30 件機械照合 → 全削除(git rm)。
2. **D2(3値判定)**: 参照テスト・fixture・support を実装時 grep で再列挙し (i) D 専用テスト=削除 (ii) barrel 経由 A シンボル=直 import へ書換 (iii) 混在=部分外科+残部 green 個別確認。
3. **D3/D4**: 台帳 2 面から D エントリを intersect 削除+stale 検査・reason 直読照合。
4. **D5**: coverage registry 再生成(テスト宇宙変化の追従)。
5. **I2**: `test -d scripts/formal-verif` exit 1。**I4**: record 配下の成果レポートは削除対象外。

## Bolt 編成(承認系譜)

ユーザー裁定(2026-07-31)により **B1 = {u1+u2} 統合 Bolt/1 PR** — 本 Unit の実装は u1 と同一 worktree(bolt-u1-runner-relocation)で連続実行(bolt-plan 改訂2)。u2 は到達不能コードの純削除のため TDD 適用外クラス(既存スイートの前後 green で検証)。
