# NFR Design Questions — docs-rollout

> ステージ: nfr-design (3.3) / Unit: docs-rollout / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

docs/メタデータ+バンプの Unit であり、NFR 要件(3.2)が検証機構(t68+dist:check/promote:self:check+grep チェックリスト)まで確定済み。構造の具体化は最小。

未解決の曖昧さ: なし。


---

## レビュー経過の記録(§12a)

- イテレーション1: NOT-READY — 1件(`repository.directory` の出典追跡不能+正値未定義)→ 出典は ideation raid-log I2 の対応欄に実在(「directory サブフィールドも実態に合わせ見直し」— literal grep では拾えない表記)。是正: 出典の明示+正値の定義(旧モノレポ残骸のためフィールド削除)+ U5 functional-design 変更対象表への伝播+バッジ行の明示
