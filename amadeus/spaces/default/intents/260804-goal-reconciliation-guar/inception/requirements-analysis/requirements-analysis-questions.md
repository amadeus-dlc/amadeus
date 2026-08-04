# Requirements Analysis Questions — Goal Reconciliation Guard

## 上流コンテキスト

- Issue: [#2163](https://github.com/amadeus-dlc/amadeus/issues/2163)
- Scope: `self-fix`、Depth Minimal、Test Strategy Comprehensive
- Reverse Engineering: `complete-workflow`、terminal `finalize`、gated/non-gated report、already-completed recoveryが共通のGoal Ownership invariantを持たない。
- 制約: `Revision Count`はstage revisionでありgoal revisionに流用しない。Goal reconciliationはmirror settlementと分離する。
- Mode: Grill me（Minimal、最大4問）

## Q1. reconciliation receiptを持たない既存Completed Intentをどう扱いますか？

A. 既存のCompleted表示と監査履歴は書き換えないが、`next` / `report` / `complete-workflow` / terminal `finalize`が完了を再確定または書き換えるときは`UNVERIFIED`として停止し、明示的な人間裁定または検証済みmigration receiptを必須にする（推奨）
B. 既存のCompleted Intentを全て即時`UNVERIFIED`へ変更し、registryのstatusも一括変更する
C. 既存のartifactとphase-checkから`ACHIEVED`を自動バックフィルする
D. 既存Completed Intentはrecoveryも含め永続的に新guardの適用外とする
X. Other (please specify)

[Answer]: A. 既存のCompleted表示と監査履歴は書き換えないが、`next` / `report` / `complete-workflow` / terminal `finalize`が完了を再確定または書き換えるときは`UNVERIFIED`として停止し、明示的な人間裁定または検証済みmigration receiptを必須にする。

## Q2. 機械判定できないsuccess metricの`ACHIEVED`を、誰がどの証拠で確定できますか？

A. 機械検証可能なmetricは決定的チェックで判定し、意味的なmetricは証拠参照付きの人間明示裁定だけが`ACHIEVED`を確定できる。LLM単独は候補verdictと不足証拠の整理に限定する（推奨）
B. 人間は証拠参照なしでも、明示操作だけで`ACHIEVED`を確定できる
C. LLMがartifact全体を読み、確信度が高ければ人間承認なしで`ACHIEVED`にできる
D. 決定的に検証できないmetricを含むIntentは常に`UNVERIFIED`とし、完了不可にする
X. Other (please specify)

[Answer]: A. 機械検証可能なmetricは決定的チェックで判定し、意味的なmetricは証拠参照付きの人間明示裁定だけが`ACHIEVED`を確定できる。LLM単独は候補verdictと不足証拠の整理に限定する。

## Q3. 逸脱を正式なgoal revisionとして承認し、current goalを切り替える契約はどれにしますか？

A. parent goal ID/revision、変更前後、理由、影響するsuccess metrics、未達項目、証拠を持つrevision artifactを作り、人間承認時だけcurrent approved revision pointerを原子的に切り替える。user-visibleな仕様逸脱は原則として実装前に承認し、事後発見時は承認まで`DEVIATED`のままとする（推奨）
B. stage成果物の承認を、そのstageで発生したgoal revisionの承認とみなす
C. requirementsやdesign artifactの書き換えを検出したら、自動的にcurrent goalを更新する
D. goal revision自体を許可せず、original goalから逸脱したIntentは完了不可にする
X. Other (please specify)

[Answer]: X. これやっぱり難しい。ゴールがまるっと簡単に変わるとそれはそれでやばいよね？
リカバリーできればいいけど、ゴールをかってに帰るのは無理かな。ゴールって人間のものでは？

## Q4. ゴールの変更権限を人間専有とする次の契約で確定しますか？

A. current approved goalは不変とする。AIは逸脱検出とchange proposalの作成までに限定し、専用ゲートに対する人間の明示操作だけが新revisionを有効化できる。通常のstage承認や一括委任はrevision承認にならない。承認しない場合は、実装をcurrent goalへ戻す、Intentを未完了で停止する、または中止するリカバリーを選ぶ（推奨）
B. goal revisionは強いゲートがあっても同一Intent内では禁止し、新しいゴールは常に別Intentとして開始する
C. 人間が事前にstanding delegationを付与した場合に限り、AIにgoal revisionの有効化を許可する
X. Other (please specify)

[Answer]: A. current approved goalは不変とする。AIは逸脱検出とchange proposalの作成までに限定し、専用ゲートに対する人間の明示操作だけが新revisionを有効化できる。通常のstage承認や一括委任はrevision承認にならない。承認しない場合は、実装をcurrent goalへ戻す、Intentを未完了で停止する、または中止するリカバリーを選ぶ。

## 合意内容の確認

A. はい、この内容でrequirementsを生成する（推奨）
B. いいえ、回答を修正する
X. Other (please specify)

[Answer]: A. はい、この内容でrequirementsを生成する。

- **leader 承認**: 2026-08-04T03:54:38Z — HUMAN_TURNにより4件の合意内容を確定した。
