# Services — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜6)、`../user-stories/stories.md`(US-1.1〜3.1)、codekb の architecture.md / component-inventory.md(RE 全数再検証済み台帳)、`../practices-discovery/team-practices.md`(既存実践)、components.md。

## サービス面(利用者可視の機能単位)

| 機能 | 変更後 | 検証 |
| --- | --- | --- |
| install --harness opencode/cursor | 完走(plan→apply→verify) | US-1.1/1.2(fixture in-process) |
| usage / invalid ガイダンス | 6値列挙 | US-1.3+契約テスト |
| wizard 選択肢 | 6値(列挙駆動の自動) | 既存テスト経路 |
| doctor otherTrees advisory | opencode/cursor を列挙 | US-3.1(advisory assert のみ) |
| npm pack 公開物 | 不変(ハーネス非同梱) | US-2.3 |

## 非変更サービス

upgrade / 既インストール検出 / バージョン解決は列挙駆動で自動追随 — サービス契約の変更なし。
