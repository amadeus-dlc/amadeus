# Domain Entities — U4 ci-integration

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## エンティティ(宣言的成果物中心 — TS 型は最小)

- `ci.yml`(宣言物)— 追加要素: `on.workflow_dispatch`(空 object)、job `formal-model-check`(runs-on: ubuntu-latest / timeout-minutes: 30 / if: `github.event_name == 'workflow_dispatch'`)
- `FormalJobConfig`(テスト用の読み取りモデル)— `{ readonly trigger: "workflow_dispatch"; readonly ifCondition: string; readonly imageRef: string; readonly jarUrl: string; readonly jarSha256: string; readonly timeoutMinutes: number }`。YAML parse 経由のスマートコンストラクタで検証(digest 形式・チェックサム形式は正規形のみ受理)
- `WorkflowStructureAssertion`(integration テスト述語)— 「許容3変更(dispatch トリガー / formal ジョブ / changes の BASE_SHA 空検知分岐 — ユーザー裁定 A)を除いたファイル全体の base 一致」+ 退役ファイル不在 + formal ジョブ設定値の verbatim 照合 + changes 分岐が dispatch 時のみ作用すること(push/PR 回帰)

## 不変条件

- FormalJobConfig.imageRef は `@sha256:` digest 形式のみ表現可能(U3 の DockerPlannerConfig と同一検証を import — canonical 共有)
- ifCondition は verbatim `github.event_name == 'workflow_dispatch'`(表記ゆれを許さない — テストで固定)

## frontend-components.md について

本 Unit は CI 宣言物のみで UI を持たないため optional の frontend-components.md は生成しない(CONDITIONAL 非該当 — 全候補列挙 assert で不在確認)。
