# Business Rules — U2 span-attrs

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U2 の責務は unit-of-work.md U2 行(按分50行: tracer resolver 部 35+resolver arm 15)から、API 形は component-methods.md の tracer-provider 改修節から、FR 契約は requirements.md FR-SPAN-1〜3 / FR-SUB-4 から、価値は story-map 段2から、本 Unit は resolver(span attributes)のみを扱い store/Relay 面は無改変 — その境界(既存 `.amadeus-otel/` JSONL への additive・Relay 無改変)を変更しないことは services.md に依拠する。

## ルール(FR 対応)

- **BR-U2-1**(FR-SPAN-1): active intent 有りで intent.id/space 直載り・cursor 不在で省略(テスト両分岐)
- **BR-U2-2**(FR-SPAN-2): state 実在時に stage/phase 付与・不在時省略・memo リセットで再解決(テスト3分岐)
- **BR-U2-3**(FR-SUB-4): env 設定時のみ agent.type/id 付与・未設定省略(テスト両分岐)。供給経路は現行ハーネス不在を実測確定済み — 本 Unit は受け口契約のみ
- **BR-U2-4**(FR-SPAN-3): 既存 subprocess span 面の無改変(characterization green)

## 実装・検証義務

- resolver 出力は明示 setAttributes を上書きしない(merge 優先度のテスト)
- tracer-provider は U1 の currentResource 導入後の同領域に積む(DAG エッジ span-attrs→resource-core の根拠)— 着手は U1 着地後
- NFR-4: package.ts+promote:self 同一 PR
