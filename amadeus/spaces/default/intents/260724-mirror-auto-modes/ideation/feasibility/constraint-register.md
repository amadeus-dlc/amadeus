# Constraint Register — mirror-auto-modes

> 上流入力（consumes 全数）: `intent-statement.md`
>
> 実測基準: commit `2126ec1144a6fd0808021d7c386c1afbfdea6ae2`、2026-07-24

## Technical Constraints

| ID | 制約 | 根拠 |
|---|---|---|
| C-01 | `auto-mirror`は`off | prompt | auto`だけを受理し、旧booleanを拒否する。未指定は`prompt` | `intent-statement.md`の承認済み契約 |
| C-02 | 3層の優先順位Global→Space→Intentと、下位層によるキー単位上書きを維持する | 現行`amadeus-mirror-config.ts` |
| C-03 | `off`はcreate・sync・closeの指令も外部書込みも発生させない | `intent-statement.md`成功指標3 |
| C-04 | `prompt`はcreate・sync・closeの各操作前に確認し、明示回答なしで`gh`を実行しない | `intent-statement.md`成功指標2 |
| C-05 | `auto`のcreateはIntent Capture承認後に限る | ユーザー裁定Q3 |
| C-06 | `auto`のsync境界はphase完了・park・workflow完了に限る | ユーザー裁定Q4 |
| C-07 | `auto`のcloseはAmadeus作成Issueに限り、最終syncと既存着地確認の両方が成功した後に行う | ユーザー裁定Q5、既存`handleClose` |
| C-08 | createの部分成功を含む全失敗は重複外部書込みなしで再試行できること | ユーザー裁定Q6と現行`handleCreate`の部分成功経路 |
| C-09 | GitHub操作失敗はWorkflowを停止せず、未同期状態と警告を残して次の境界で再試行する | ユーザー裁定Q6 |
| C-10 | syncはrecord→Issueの一方向を維持し、Issue側編集を正本へ取り込まない | 既存ミラー契約 |
| C-11 | `gh`はoptional dependencyのままとし、tokenを保持・表示せずcredential storeへ委譲する | `project.md`の`gh-scripts-boundary` |
| C-12 | core正本から全harness、`dist/`、self-installを同一変更で再生成し、手編集しない | `project.md`の配布規則 |

## Organizational and Governance Constraints

| ID | 制約 | 根拠 |
|---|---|---|
| G-01 | `auto`はIntentミラーに限定した常任同意とし、他の外部操作へ流用しない | Feasibility Q1のユーザー裁定 |
| G-02 | `team.md` P4と`project.md`の`gh-scripts-boundary`を、G-01の限定条件で矛盾なく改定する | strict-additive rule chain |
| G-03 | 規範変更は通常のnorm PR、独立レビュー、人間のmerge承認を経る | `norm-changes-via-pr`、`no-ai-merge` |
| G-04 | 非互換変更を日英のユーザーガイドと開発者リファレンスへ同時に記載する | `intent-statement.md`成功指標8 |

## Regulatory and Infrastructure Constraints

| ID | 判定 | 根拠 |
|---|---|---|
| N-01 | AWSインフラ要件はN/A | 新規サービス、アカウント、ネットワーク、IAMを追加しない |
| N-02 | 新規の法令・業界規制要件はN/A | 新しいデータ分類や処理目的を導入しない |
| N-03 | GitHub上の情報可視性は既存リポジトリ設定を継承 | Issue本文は既存の最小ミラー形式を維持する |

## Scope Boundaries

- 旧booleanの互換読み替え、deprecation期間、移行shimは作らない。
- GitHub以外のtracker abstractionは作らない。
- stage完了ごとのsyncは作らない。
- 外部作成Issueを`auto` closeしない。
- AWS、SaaS、database、queueなどの新規運用基盤は作らない。
