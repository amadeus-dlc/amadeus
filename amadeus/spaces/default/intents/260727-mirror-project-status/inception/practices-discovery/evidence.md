# Evidence — practices-discovery(mirror-project-status)

上流入力(consumes 全数): code-structure.md, technology-stack.md, dependencies.md, code-quality-assessment.md, architecture.md, business-overview.md

## 証跡の出所(practices-discovery:c1 — RE codekb 代用)

| スキャン面 | 代用した codekb 証跡(いずれも observed cd937c991) |
|---|---|
| アーキテクチャ | architecture.md「mirror スタックの canonical 統一・answer consume 機構と plugin walking skeleton」節(設計分岐点4点: MirrorOperation 3値5面連動 / phase seam は lifecycleSnapshot のみ / Parked 未読 / GraphQL 実装ゼロ) |
| コード構造 | code-structure.md(mirror 16ファイル/9,208行の現在地図、区間配置変化14行) |
| コンポーネント / 台帳 | component-inventory.md(閉じた台帳4種: MIRROR_TOOL_FILES 16 ↔ t285 toHaveLength(15) の二重手書き) |
| テスト / 品質 | code-quality-assessment.md(t300 regression 288行新設、mirror.ts 縮小 +73/-303、t299/t300 番号重複の新規発見) |
| 依存・スタック | technology-stack.md(依存宣言 0 行変更+GraphQL 不在の実測確定)、dependencies.md(新規外部依存なし+内部エッジ3本) |
| 価値面 | business-overview.md(mirror 2件は信頼性回復、本 intent は Project ボード面への拡張) |

## 差分ギャップ判定の実測

- affirmed 済み team.md・project.md(2026-07-24 の mirror 系 Mandated/Forbidden 群、2026-07-25 の認可系、Testing Posture、Way of Working)と本 intent の作業面(gateway GraphQL 拡張・config/state 拡張・lifecycle 統合・repair 診断・配布同期)を突き合わせ、未カバーで新規成文が必要な慣行は **0 件**。
- 検討の唯一の残余は「auto-mirror standing consent の対象操作列に Project 同期を含めるか」— これは memory 層の practice でなくユーザー可視契約(requirements)の定義事項と判定(team-practices.md § ギャップ検討)。判定根拠: 同意対象の列挙は project.md Mandated の affirmed 文言(create/sync/close)に既在で、その解釈の確定は仕様変更の裁定権限(正準リスト(4))に属する。
