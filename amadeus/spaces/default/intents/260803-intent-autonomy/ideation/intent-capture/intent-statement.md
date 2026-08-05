# Intent Statement — Intent-scoped Autonomy

## 問題定義

AI-DLCを非対話・長時間で実行したい利用者は、承認待ちや質問待ちによってIntentの途中で停止する。一方、品質不備を無条件に再試行すると、健全化しない修復を繰り返して時間と費用を消費する。

解決すべき問題は、実在する人間の事前認可と既存のIntent・scope・norm・外部権限境界を保ちながら、自律レベルに応じてIntentを前進させ、品質不備を健全化し、非生産的ループだけを監査可能かつ再開可能に停止することである。

正本は次の3件のIssueとする。

- [#2067](https://github.com/amadeus-dlc/amadeus/issues/2067): Intent-scopedな自律レベルと監査可能な自動裁定
- [#2095](https://github.com/amadeus-dlc/amadeus/issues/2095): 汎用Loop Monitor Core
- [#2096](https://github.com/amadeus-dlc/amadeus/issues/2096): Quality Repair Loop Plugin

## 対象利用者

- Claude Code、Codex、Cursor、OpenCode、Kimi CodeでAmadeusを利用する開発者・チーム
- grantを発行し、後から自動裁定と成果を確認する人間の承認者
- harness-neutralなCoreと監査契約を保守するAmadeusメンテナー
- first-party Quality Repair Loop Pluginの保守者
- 将来、新しいharness adapterを追加する開発者

## 成功指標

| 指標 | 成功条件 |
|---|---|
| 自律レベル | `none` / `semi` / `full`だけを提供し、既定値は`none`である |
| 暗黙昇格防止 | headless起動だけでは`semi` / `full`へ変化しない |
| Intent完遂 | `full`は認可境界内でIntent終端まで進む |
| 品質健全化 | reviewer、sensor、必須成果物、完了条件の不備を承認扱いせず修復する |
| 安全停止 | 非生産的ループを検知し、grantを失わず再開可能に停止する |
| 監査可能性 | grant行使、自動裁定、停止、再開、人間の事後確認を再生できる |
| harness parity | 現行5harnessで同じ決定論的contract testsとopt-in live smokeが成立する |
| 拡張性 | 将来のharness追加がCore forkやharness固有Loop Monitor実装を要求しない |

## Initiative Trigger

[#2067](https://github.com/amadeus-dlc/amadeus/issues/2067)の旧案には、Claude Code固有の起動方法、期限・消費型grant、代理`HUMAN_TURN`、外部integration待機が混在していた。2026-08-03のgrillingで、完全自律の第一目的をIntent終端への到達と定め、grant、質問、自動裁定、品質修復、外部権限、外部integrationの境界を整理した。

また、非生産的ループの汎用検知と品質固有ポリシーを分離し、[#2095](https://github.com/amadeus-dlc/amadeus/issues/2095)から[#2096](https://github.com/amadeus-dlc/amadeus/issues/2096)、最後に#2067統合へ進む依存順序が確定したため、実装へ移せる状態になった。

## Initial Scope Signal

- **Scope:** `self-feature`
- **Project type:** Brownfield
- **Depth:** Standard
- **Test strategy:** Comprehensive
- **Execution order:** #2095 → #2096 → #2067統合
- **Delivery shape:** 各成果を独立検証可能なBoltとする
- **Initial harnesses:** Claude Code、Codex、Cursor、OpenCode、Kimi Code
- **Boundary:** 外部runner / scheduler、GitHub review / merge / convergence、新規host / cloud / tool permissionはCore実装の対象外

## Issue Fidelity Rule

Issueに記載されたcontractを正本とする。Issueに書かれていない仕様を暗黙に補完しない。抜け漏れまたはIssue間・既存contractとの矛盾を発見した場合は、該当箇所と影響を明示し、後続stageの解決対象またはユーザー裁定として扱う。それ以外はIssueどおりに実行する。

## Intent Captureで検出した抜け漏れ・矛盾

以下は実装案ではなく、後続stageで解決すべきIssue contract上の未決事項である。

1. **grant状態の次元が曖昧:** #2096は「grantはactiveのままsuspended」とする一方、#2067のresult envelopeは`active | suspended | revoked | completed`を排他的な単一stateとして例示している。認可ライフサイクルと実行可否を別フィールドにするか、一状態に畳むかが未定である。
2. **停止理由の閉包不足:** #2067は新規権限昇格、scope外操作、waiver要求で人間へ停止すると規定するが、result envelopeのreason codeは`AWAITING_HUMAN`、`REPAIR_STALLED`、`NORM_CONFLICT`、`USER_PARKED`だけである。どのコードとresume conditionで表すかが未記載である。
3. **pluginと自律統合の責務重複:** #2095はgrant・自律レベルをCore Loop Monitorへ埋め込まないとし、#2067は自律統合を所有する。一方#2096はgrant suspensionやユーザーstatusまでpluginの受け入れ条件に含めている。pluginが返すdomain resultと、#2067側が行うgrant遷移の境界を確定する必要がある。
4. **advisory sensorの扱い:** 現行sensorはadvisoryだが、#2067/#2096はsensor failureを自動修復対象にする。全sensorをblocking obligationへ昇格するのか、明示された必須sensorだけを対象にするのかが未記載である。
5. **reviewer反復契約との接続:** 現行reviewerには`reviewer_max_iterations`があるが、#2096は通常経路に固定retry上限を置かない。既存iteration上限の後にpluginへ引き渡すのか、pluginがiterationを再発行するのかが未定である。
6. **replan自体のループ検知:** #2096の監視cycleは`quality-check -> repair`だが、閾値後の`replan`が同じevidenceで繰り返される場合の上位cycleまたは停止判定が明示されていない。
7. **plugin必須出力が未定義:** #2067はplugin提供の必須出力をstage completion conditionへ加えるが、#2096には出力名、owner、適用stage、schemaがない。
8. **過去の人間裁定の有効性:** #2067は過去裁定から機械的に一意な回答を導出できるとするが、scope一致、失効条件、新しいnormとの優先順位、相反する過去裁定の扱いが未記載である。
9. **result envelopeの`retryable`意味:** 例では常に`true`だが、`completed`、terminal failure、同一fingerprintの停止で取り得る値と意味が未定義である。

## Intent完了条件

3件のIssueに記載された受け入れ条件を満たし、上記未決事項を承認済みcontractへ解消し、現行5harnessのcontract testsとopt-in live smokeで結果を実測できた時点でIntentを完了とする。
