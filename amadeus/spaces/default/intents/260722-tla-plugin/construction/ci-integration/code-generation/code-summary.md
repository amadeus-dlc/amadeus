# U4 ci-integration コード生成サマリー

## 結果

U4 のローカル実装と検証を完了した。通常の push / pull request 経路を変更せず、手動 dispatch 専用の独立した `formal-model-check` job を既存 CI に統合した。旧 `.github/workflows/formal-verification.yml` は削除し、formal verification の実行入口を `.github/workflows/ci.yml` に一本化した。

実 GitHub Actions の dispatch は外部状態を変更するため実行していない。計画 Step 15 は未完了のまま維持している。

## 主な変更

- `workflow_dispatch` 時だけ `changes` job を空差分として正常収束させる分岐を追加した。push / pull request の既存判定は baseline 投影と一時 Git repository の E2E で無回帰を確認した。
- `formal-model-check` job を既存 job graph から独立させ、`contents: read`、30 分 timeout、secret / write token / OIDC / privileged container 不使用を固定した。
- Actions を次の commit SHA に固定した。
  - `actions/checkout` v4: `11d5960a326750d5838078e36cf38b85af677262`
  - `oven-sh/setup-bun` v2: `0c5077e51419868618aeaa5fe8019c62421857d6`
  - `actions/upload-artifact` v4: `ea165f8d65b6e75b540449e92b4886f43607fa02`
- U3 の canonical Docker image と TLA+ jar descriptor を import し、U4 内で固定値を再定義しない受入 runner を追加した。
- warm-up 1 回と計測 5 回を逐次実行し、CLI 180 秒未満、Docker spawn 120 秒未満、全回 exit 0 / `NOT_DETECTED` を要求する証跡モデルを追加した。
- Docker の digest、`--network=none`、read-only mount、scratch write mount、非 privileged、runId 由来 container 名、cleanup を検証する trace 境界を追加した。
- U3 manifest、全 artifact の bytes / SHA-256、completion marker、EnvReceipt の exact matrix を独立再検証する verifier を追加した。U3の正常契約に合わせ、manifestへ正しく束縛された0 byteの`tlc-stderr.bin`を許容し、stdoutとstderrの16 MiB上限は引き続き強制する。
- bootstrap、model check、artifact verify、upload、`DETECTED` の複合失敗を、設計済み優先順位で最終 exit に戻す terminal step を追加した。

## テストと品質ゲート

- Iteration 2修正後のU4 focused: 27 tests、152 assertions、失敗 0。
- Iteration 2修正後のU4差分 coverage: 820 / 820 measurable added lines、未カバー 0、allowlist 0。
- Iteration 1完了時の全 CI: 510 files、7,172 assertions、失敗 0。Claude / live substrate 不在の対象だけを既定どおり skip した。Iteration 2では指定されたU4 focused suiteを再実行した。
- `bun run typecheck`: PASS。
- `bun run lint`: error 0。既存の warning 262 件、info 19 件のみ。
- complexity gate: 新規違反 0、regression 0。
- coverage registry / test-size purity: PASS。
- `bun run dist:check`: 全 harness PASS。
- `bun run promote:self:check`: PASS。
- `git diff --check`: PASS。
- workflow YAML parse と全 `run:` block の Bash 構文: PASS。

ローカル検証では Docker daemon を起動せず、実 container も実行していない。Docker 境界は注入可能な command port と fake executable による deterministic test で検証し、実 Docker の一次証拠は Step 15 の GitHub Actions dispatch で取得する。

## 未完了事項と設計上の注意

1. 計画 Step 15 の実 `workflow_dispatch`、artifact 回収、実 container の 1 warm-up + 5 measured 受入は未実行である。
2. Iteration 1で指摘された空stderr契約の衝突は解消済みである。ファイル実在、manifestのbytes / SHA-256一致、16 MiB上限を維持したまま、`tlc-stderr.bin`だけ0 byteを許容する。
3. commit、push、rebase、GitHub workflow dispatch は行っていない。

## 次の選択肢

1. **推奨: ユーザー承認後に Step 15 を実行する。** 対象 ref を確定し、1 回だけ dispatch して artifact と実 Docker の一次証拠を検証する。
2. Step 15 を保留し、U4 を「ローカル実装完了・実環境受入待ち」として引き渡す。
3. Step 15を保留したまま、修正済みU4を再レビューする。
