# stage-contract コード生成計画

## 対象と成功条件

- 対象ユニットは U01 `stage-contract` のみとする。
- `validateStageFrontmatter`、`normalizeUnitKind`、`requiredArtifactsForUnit` を共有契約の公開シームとし、同じ制約を表す第二のスキーマや独立した判定ロジックを作らない。
- プラグイン由来 frontmatter を厳格に検証し、未知のキー・ユニット種別・不正な条件式を fail-closed で拒否する。
- ユニット種別別の成果物枝刈りを directive、coverage、artifact guard で同一規則により適用する。種別情報が欠落・不正な場合は既存の全成果物行列にフォールバックし、過少生成を防ぐ。
- 既定ステージの生成物は変更前とバイト同一に保つ。
- 正準ジェネレーターで package 6 surface と self-install 4 surface を更新し、生成物を手編集しない。

## トレーサビリティ

User Stories ステージは SKIP のため、捕捉済み intent の FR-2 項目 7、FR-6 項目 18、および機能設計の BR-U01-01〜BR-U01-15 を受入根拠とする。非機能面は性能・信頼性・セキュリティ設計に従い、線形時間の検証、既定互換、fail-closed、同一判定関数の再利用を確認する。

## テスト戦略（Comprehensive）

既存の Bun test、`tests/unit`、`tests/integration`、`tsconfig.tests.json` をそのまま使用し、新しいテスト基盤は追加しない。

- Unit: 適用する。frontmatter の新規キー、`when` の厳密形状、`required_sections`、`produces_kinds`、未知値、重複値、unit kind 正規化、種別別成果物選択を表形式で検証する。
- Integration: 適用する。parse/emit、graph compile、Bolt DAG/runtime projection、per-unit directive、coverage、artifact guard、既定ステージの互換性を実際のファイル境界で検証する。
- E2E: 非適用とする。U01 は UI・ネットワーク・新しい利用者ジャーニーを追加せず、ユーザー可視の CLI 境界は既存の integration テストが直接覆うため、別 E2E は同一経路の重複になる。

## 実装手順

1. [x] RED: 公開契約と厳格な不正入力拒否を unit test で固定する。（t248-stage-contract.test.ts 実在・green）
2. [x] RED: graph/runtime/directive/coverage/guard と既定互換を integration test で固定する。（t248-stage-contract-routing.test.ts 実在・green）
3. [x] GREEN: 共通型・frontmatter parser/emitter/schema validator を最小変更で実装する。（amadeus-stage-schema.ts の validateStageFrontmatter/normalizeUnitKind）
4. [x] GREEN: graph projection、Bolt DAG の unit kind、成果物選択を共有契約へ接続する。（amadeus-graph.ts の requiredArtifactsForUnit）
5. [x] GREEN: directive、coverage、artifact guard に同じ成果物選択規則を接続し、空集合を vacuous success とする。（amadeus-orchestrate.ts 4 参照）
6. [x] GREEN: 4 つの既定ステージと active unit DAG に正準の種別マッピングを追加する。（graph.ts の produces_kinds）
7. [x] 正準ジェネレーターで package/self-install surface を再生成する。（6 ハーネスの dist stage-schema が core とバイト同一・dist:check/promote:self:check green）
8. [x] 検証: focused test、typecheck、lint、complexity gate、`dist:check`、`promote:self:check` を実行する。（全 exit 0、complexity gate は script 不在で N/A）
9. [x] 変更・検証・既知の制約を `code-summary.md` に記録する。

## 変更方針

- 既存の既定値・出力順・エラー結果形式を維持する。
- 新規情報が存在するときだけ投影し、kindless DAG と旧 frontmatter の動作を変えない。
- 生成対象ファイルはソース変更後にジェネレーターのみで更新する。
- コミット、push、他ユニットの実装は行わない。
