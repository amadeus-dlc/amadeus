# Requirements Analysis の質問

- **モード:** Guide me
- **深度:** Standard

## 上流コンテキスト

`intent-statement`、`scope-document`、`business-overview`、`architecture`、`code-structure`、`team-practices`で確定済みの事項は再質問せず、要求の検証可能性に影響する未確定点だけを確認した。

## Q1. `auto` で topology を判定できない場合

Claude で Units Generation の成果物から相互調整型か独立並列型かを機械判定できない場合、`auto` はどう振る舞うべきか。

A. **`claude-ultracode` を選択（推奨）** — 明示的な相互調整信号がない限り独立並列・反復収束型として扱い、`topology=unknown` と選択理由を表示・監査する
B. **hard error** — topology の明示または `AMADEUS_SWARM_DRIVER` の明示指定を要求する
C. **`claude-agent-teams` を選択** — 大きい Intent では相互調整を優先する
X. **Other (please specify)**

[Answer]: A — `claude-ultracode` を選択（ユーザー回答: 1）

## Q2. 旧環境変数の警告頻度

0.1.x で `AMADEUS_USE_SWARM` を受理した場合、deprecation warning をどの頻度で利用者へ表示・監査するか。

A. **解決試行ごと（推奨）** — 各 `invoke-swarm` の driver 解決時に標準エラーへ表示し、同じ execution id の監査へ記録する
B. **セッションで1回** — 利用者表示は最初の1回だけにし、監査は解決試行ごとに残す
C. **Intentで1回** — 利用者表示と監査を Intent の最初の1回に限定する
X. **Other (please specify)**

[Answer]: A — 解決試行ごと（ユーザー回答: 1）

## Q3. OS 別の保証範囲

driver 契約と native live proof のクロスプラットフォーム保証をどこまで完了条件に含めるか。

A. **契約は全対応OS、live proofは各CLIの対応ホスト（推奨）** — selector、probe、error、監査、互換テストは macOS / Linux / Windows で成立させ、4 driver の native live proof は各CLIが公式対応する認証済みホストで取得する
B. **全driverを全OSでlive proof** — 4 driver すべてを macOS / Linux / Windows の全組合せで実証する
C. **現在のmacOSのみ** — 決定的テストとlive proofの保証を現在のローカルmacOSに限定する
X. **Other (please specify)**

[Answer]: A — 契約は全対応OS、live proofは各CLIの対応ホスト（ユーザー回答: 1）。Q7により、保証対象をmacOS／GitHub Linuxへ変更。

## Q4. 能力検査の鮮度

明示 driver の実行前 hard error と `auto` の決定性を保証するため、CLI・認証・native surface の能力検査をいつ実行するか。

A. **batchごとに再検査（推奨）** — 各 `invoke-swarm` でworker作成前に1回検査し、そのbatch内だけ結果を共有する。batchを跨いでcacheしない
B. **セッション開始時に1回** — 同一Amadeusセッションでは検査結果を再利用する
C. **version変更時だけ** — CLI versionをcache keyにし、同一versionでは結果を再利用する
X. **Other (please specify)**

[Answer]: A — batchごとに再検査（ユーザー回答: 1）

## Q5. crash後の再開契約

driver選択・能力検査の完了後、native worker起動前または実行中にAmadeusが停止した場合、再開をどう扱うか。

A. **新attemptとして再検査（推奨）** — 未完了attemptを成功扱いせず、同じbatchへ紐づく新しいattempt idで能力検査から再開し、既存worktreeと確定済み収束結果だけを再利用する
B. **同じattemptを継続** — 直前の能力検査結果を再利用し、未完了workerだけを再起動する
C. **batchを破棄して作り直す** — worktreeを含めて新しいbatchとして最初から実行する
X. **Other (please specify)**

[Answer]: A — 新attemptとして再検査（ユーザー回答: 1）

## Q6. 回答の統合確認

ここまでの回答を次の要件として確定してよいか。

1. Claudeの`auto`でtopologyを判定できない場合は`claude-ultracode`を選び、`topology=unknown`と理由を表示・監査する。
2. 0.1.xで`AMADEUS_USE_SWARM`を検出した各`invoke-swarm`の解決試行ごとにdeprecation warningを表示・監査する。
3. selector、probe、error、監査、互換契約はmacOS／Linux／Windowsで保証し、native live proofは各CLIの公式対応ホストで取得する。
4. 能力検査は各batchのworker作成前に実行し、結果は同一batch内だけで共有する。
5. crash後は同じbatchに紐づく新attemptとして能力検査から再開し、既存worktreeと確定済み収束結果だけを再利用する。

A. **この内容で確定（推奨）** — requirements.mdを生成する
B. **回答を修正** — 修正する質問番号と内容を指定する
X. **Other (please specify)**

[Answer]: X — Windowsの保証範囲を修正する（ユーザー回答: 3「手元にmacOSとgithub上のLinuxしかないのでWindowsは対象外にしますかね。」）

## Q7. Windowsの扱い

利用可能な検証環境に合わせ、今回のdriver機能におけるWindowsの扱いをどう確定するか。

A. **今回の対象外にする（推奨）** — 新driver契約と完了保証はmacOSおよびGitHub上のLinuxに限定する。既存Windows経路を意図的に壊さないが、Windows対応をrelease criterionには含めず、文書で未保証と明示する
B. **模擬テストだけ対象にする** — Windows固有pathをunit testで模擬するが、実環境なしでもWindows対応を保証に含める
C. **Windows環境を確保するまで保留する** — Windows runnerまたは実機で検証できるまでIntentを完了しない
X. **Other (please specify)**

[Answer]: A — 今回の対象外にする（ユーザー回答: 1）

## Q8. 修正後の統合確認

Q7の変更を反映した次の要件で確定してよいか。

1. Claudeの`auto`でtopologyを判定できない場合は`claude-ultracode`を選び、`topology=unknown`と理由を表示・監査する。
2. 0.1.xで`AMADEUS_USE_SWARM`を検出した各`invoke-swarm`の解決試行ごとにdeprecation warningを表示・監査する。
3. 新driver契約と完了保証はmacOSおよびGitHub上のLinuxに限定する。既存Windows経路を意図的に壊さないが、Windows対応はrelease criterionに含めず未保証と明記する。
4. 能力検査は各batchのworker作成前に実行し、結果は同一batch内だけで共有する。
5. crash後は同じbatchに紐づく新attemptとして能力検査から再開し、既存worktreeと確定済み収束結果だけを再利用する。

A. **この内容で確定（推奨）** — requirements.mdを生成する
B. **回答を修正** — 修正する質問番号と内容を指定する
X. **Other (please specify)**

[Answer]: A — この内容で確定（ユーザー回答: 1）
