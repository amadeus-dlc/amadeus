# Code Summary — u001-registry-issues-field（B001）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[business-rules.md](../functional-design/business-rules.md)

## 変更内容

| ファイル | 変更 | 対応 |
|---|---|---|
| `aidlc/spaces/default/intents/intents.json` | 判別可能な 7 entry へ任意フィールド `issues`（数値配列）を追加。判別不能 3 entry は付与せず | FR-1.1、FR-1.3、BR-1〜BR-4 |
| `dev-scripts/evals/kanban-registry/check.ts` | 新規。issues 契約（型・重複・混在互換）と補完アンカー（#470）の決定論的検証 | FR-1.2、BR-1 / BR-2 / BR-5、C08（TDD） |
| `package.json` | `test:it:kanban-registry` を追加し `test:it:all` へ連結 | 検証の CI 結線 |

## TDD の記録

- RED: 補完前の registry で `check.ts` が 2 件失敗（issues を持つ entry なし、#470 アンカーなし）することを確認した。
- GREEN: 遡及補完後に全 19 検査 ok、exit 0。
- REFACTOR: なし（最小実装のまま）。

## US-1 受け入れ基準との対応

- 基準 2（既存ツールの挙動不変）: `npm run test:all` green（エンジン・validator の既存検証を含む）で確認。
- 基準 3（遡及補完済み）: check.ts のアンカー検査と code-generation-plan.md の判別根拠表で確認。
- 基準 1（board カードへの反映）: u002 の範囲（business-logic-model.md の境界宣言どおり）。
