# Scope Definition — mirror-auto-modes

> 上流入力（consumes 全数）: `intent-statement.md`、`feasibility-assessment.md`、`constraint-register.md`

## Product Outcome

`intent-statement.md`の目的に従い、`auto-mirror`という名称と実際の挙動を一致させる。利用者は`off | prompt | auto`の1設定で、Intent Mirror Issueのcreate・sync・close全体を予測可能に制御できる。`auto`ではIntent Capture承認後に共有面が早期作成され、他の開発者が重複・競合作業を認識できる。

`feasibility-assessment.md`の条件付きGOを受け、価値提供だけでなく、部分成功後の重複防止と自動closeの由来証明を必須の完成条件とする。

## Minimum Viable Scope

次の4能力をすべてMustとする。いずれかを欠くと、3モード契約、安全なライフサイクル自動化、または配布機能としての利用可能性が成立しない。

1. 3モード設定契約と安全なauto createのend-to-end walking skeleton
2. create・sync・close全体に対する`off`・`prompt`・`auto`の一貫した実行境界
3. GitHub障害時の非blockingな未同期記録、警告、冪等な再試行
4. 限定的な規範改定、全harness配布、日英文書、回帰・drift検証

期限は固定しない。安全条件を削って日程を優先することはしない。

## In Scope

### 設定契約

- `auto-mirror`を`off | prompt | auto`の文字列unionへ置換する
- 未指定時を`prompt`とする
- 旧booleanを暗黙変換せず、明示的な設定エラーにする
- Global→Space→Intentの3層優先順位を維持する

### Lifecycle Behavior

- `off`: create・sync・closeを発火しない
- `prompt`: create・sync・closeの各外部操作前に確認する
- `auto`: Intent Capture承認後にcreateし、phase完了・park・workflow完了時にsyncする
- `auto`: Amadeusが当該Intent用に作成したIssueだけを、最終syncと着地確認の成功後にcloseする

### Safety and Recovery

- Issue作成成功後にローカル記録が失敗しても、次回再試行でIssueを重複作成しない
- Amadeus作成Issueであることを永続的なprovenanceで検証する
- GitHub操作失敗時もWorkflowを継続し、未同期状態、警告、再試行予定を保持する
- record→Issueの一方向同期と、`gh` credential storeへの認証委譲を維持する

### Distribution, Governance, and Documentation

- core正本を各harness、`dist/`、self-installへ生成経路で同期する
- `auto`をIntentミラーに限定した常任同意としてteam/project ruleを最小改定する
- ユーザーガイドと開発者リファレンスの日英版を同期更新する
- mode matrix、境界、部分失敗、provenance、driftをunit/integration/e2eで検証する

## Out of Scope

- 旧booleanの互換読み替え、deprecation期間、migration shim
- GitHub以外のIssue trackerやtransport abstraction
- 各stage完了ごとのsync
- 外部作成Issueのauto close
- GitHub IssueからIntent recordへの逆同期
- Web UI、daemon、scheduler、新しいAWS/SaaS基盤
- PR merge、release、一般のGitHub Issue操作への常任同意拡張

## Value Stream Map

| 段階 | 利用者・systemの行為 | 生成される価値 | 完成条件 |
|---|---|---|---|
| 1. Configure | 利用者が3層のいずれかでmodeを選ぶ | 外部操作ポリシーが明示される | 3値だけを受理し、未指定は`prompt` |
| 2. Frame | Intent Captureを承認する | Intent内容が共有可能な状態になる | 未確定Intentではauto createしない |
| 3. Publish | policyに従いcreateする | 他の開発者がIntentを早期認識できる | provenance保存、部分失敗後も重複0件 |
| 4. Synchronize | phase完了・park・workflow完了でsyncする | Issueが現在地を示す | receiptによる冪等性、失敗の可視化 |
| 5. Complete | 最終sync・着地・ownershipを検証してcloseする | 共有面が完了状態へ収束する | 外部Issueの誤close 0件 |
| 6. Recover | 次の境界または手動statusから再試行する | GitHub障害でWorkflowを止めず整合を回復する | 未同期状態が消失せず、成功後に解消 |

## Acceptance Boundary

`constraint-register.md`のC-01〜C-12およびG-01〜G-04をすべて満たし、4つのMust能力がcore・配布物・self-install・日英文書で一致したときに限り、本Intentをcompleteとする。部分的なmode実装やsync限定の`auto`は完成とみなさない。
