# Stakeholder Map — 260725-kimi-harness

## Stakeholder 一覧

| Stakeholder | 種別 | 関心 | 本intentとの関係 |
|---|---|---|---|
| プロジェクトオーナー(ユーザー本人) | 決定者 | Kimi Code 上で amadeus を実用したい。フレームワークの一貫性・品質ゲートの維持 | 全承認ゲートの承認者。要件の最終裁定者 |
| Kimi Code CLI を使う amadeus 利用者 | 顧客(外部) | 自分のハーネスで AI-DLC をフル機能(hooks 連携込み)で実行したい | 配布物(dist/kimi、npm インストーラ)の受け手 |
| 本チーム(amadeus 開発者) | 顧客かつ実行者 | dogfood による検証。移植ガイド(09-porting)の実効性確認 | 実装・検証の主体。最初のユーザー |

## 決定者と影響者

- **決定者**: プロジェクトオーナー。スコープ・成功指標・各ステージの承認を単独で行う(ソロモード)
- **影響者**: なし(外部レビュー主体を持たない自己完結プロジェクト)

## 影響を受ける領域

| 領域 | 影響 |
|---|---|
| `packages/framework/harness/kimi/`(新設) | ハーネス表層の追加 |
| `packages/framework/core/`(3箇所) | doctor arm・swarm HARNESS_VALUES・KNOWN_HARNESS_DIRS(サンクション済み編集) |
| `packages/setup/` | ハーネス列挙 + ユーザー config.toml への managed block マージ機構(新規) |
| `dist/kimi/`(新設) | 生成物。byte-parity drift guard 対象 |
| CI(`.github/workflows/ci.yml` 間接) | `dist:check` / `promote:self:check` が新 dist ツリーを自動対象化 |
| `docs/guide/harnesses/` | ユーザーガイド章の追加(英/日) |

## Communication 要件

- 本ワークフローの承認ゲート(15ゲート)を主たる合意形成の場とする
- 成果物は `<record>/` 配下に日本語で記録し、PR でレビュー可能な形にする
- ユーザー `~/.kimi-code/config.toml` への書き込みは外部境界(P4)のため、インストーラ実行時にユーザーの明示承認を必須とする
