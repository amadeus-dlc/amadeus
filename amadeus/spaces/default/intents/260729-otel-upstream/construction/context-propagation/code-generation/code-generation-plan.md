# Code Generation Plan — context-propagation

上流入力（consumes 全数）: functional-design（business-logic-model.md、business-rules.md、domain-entities.md）、nfr-requirements 5件、nfr-design 5件、unit-of-work.md、requirements.md（すべて参照済み）

## 対象要件

FR-TRC-4, FR-TRC-5（unit-of-work-story-map.md の写像どおり）

## 実施方針

- 承認済み functional-design／nfr-design の seam をそのまま実装（逸脱なし）
- テストは実装と同一コミットで red-green（TDD。team-practices ## Testing Posture）
- 正本は packages/framework/core/。生成面は bun scripts/package.ts と promote:self で再生成し、両 drift guard を通す
- 成果は PR #1705 として review・CI 後に merge

## 検証計画

- unit テスト（実装と同一コミット）＋関連既存 suite の回帰確認
- typecheck・lint・package.ts --check・promote:self:check
- patch coverage gate（追加行のカバレッジ、allowlist は理由＋期限付きのみ）
