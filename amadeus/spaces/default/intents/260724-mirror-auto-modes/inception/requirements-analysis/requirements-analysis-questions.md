# Requirements Analysis — Questions

> 上流入力（consumes 全数）: `intent-statement.md`、`scope-document.md`、`business-overview.md`、`architecture.md`、`code-structure.md`、`team-practices.md`

## Interaction Mode

約3件の未確定なライフサイクル挙動を、どの方法で回答しますか。

- A. Guide me — 質問を順番に対話形式で進める
- B. Grill me — 推奨案と根拠を添えて、一問ずつ深掘りする
- C. I'll edit the file — 質問ファイルを自分で編集する
- D. Chat — 自由に議論し、会話から決定事項を抽出する
- X. Other (please specify)

[Answer]: A — Guide me
[Answered At]: 2026-07-24T02:56:23Z
[Mode]: guided

## Q1. 既存Intentへの追いつき作成

Intent Captureがすでに承認済みで、Mirror Issueがまだ存在しないIntentに対して、`auto-mirror`を`prompt`または`auto`へ設定した場合、いつcreateを評価しますか。

- A. 次の適格なライフサイクル境界で追いつきcreateを評価する（推奨: 既存Intentも機能を利用でき、`prompt`は確認、`auto`は自動実行する）
- B. Intent Capture承認直後だけを対象とし、既存Intentは手動createのみとする
- C. `auto`だけ追いつきcreateし、`prompt`では手動createのみとする
- D. 設定変更直後に、ステージ境界を待たずcreateを評価する
- X. Other (please specify)

[Answer]: A — 次の適格なライフサイクル境界で追いつきcreateを評価する
[Answered At]: 2026-07-24T02:57:04Z
[Mode]: guided

## Q2. `off`切替時の未同期状態

GitHub障害などにより未同期・retry待ちの操作がある状態で、設定を`off`へ切り替えた場合、どう扱いますか。

- A. 未同期状態と警告は保持するが、`off`中はGitHub操作もretryも実行しない。`prompt`または`auto`へ戻した次の適格境界で再評価する（推奨）
- B. `off`へ切り替えた時点で未同期状態と警告を破棄する
- C. 既にpendingになった操作だけは`off`でも完遂する
- D. 未同期状態がある間は`off`への変更を設定エラーにする
- X. Other (please specify)

[Answer]: A — 未同期状態と警告は保持し、`off`中はGitHub操作とretryを実行しない
[Answered At]: 2026-07-24T02:57:34Z
[Mode]: guided

## Q3. `prompt`でskipした操作の扱い

`prompt`モードで利用者がcreate・sync・closeをskipした場合、その判断の効力をどうしますか。

- A. そのライフサイクルイベントだけを明示的に辞退したものとし、失敗retryには数えない。次の別イベントでは通常どおり再評価する。workflow完了時のcloseをskipした場合はIssueを開いたままにし、後から手動closeできる（推奨）
- B. Intent終了まで同種操作をすべてskipし、再度質問しない
- C. skipも未同期失敗として保存し、次の境界で必ず同じ操作を再提示する
- D. createだけ次の境界で再提示し、syncとcloseのskipは永続化する
- X. Other (please specify)

[Answer]: A — skipはそのライフサイクルイベントだけに有効で、次の別イベントでは再評価する
[Answered At]: 2026-07-24T02:58:02Z
[Mode]: guided

## E-OC1 証跡

3件の回答は2026-07-24T02:58:43Zにユーザーが統合確認した。曖昧語・回答間の矛盾・未回答は0件である。

[Answer]: E-OC1 — Confirm
[Answered At]: 2026-07-24T02:58:43Z
[Mode]: guided

Product Lead iteration 1で指摘された再発見、completion chain、event identity、安全検査順序、failure分類は、既承認の「重複なし」「外部Issueを操作しない」「GitHub障害でworkflowを止めない」「skipは当該イベントだけ」という上位制約を安全側へ機械展開した。新しい価値判断やスコープ変更を導入せず、`requirements.md`の決定表として一意化した。
