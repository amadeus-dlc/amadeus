# U4 ci-integration コード生成サマリー

## 結果

U4 のローカル実装と検証を完了した。通常の push / pull request 経路を変更せず、手動 dispatch 専用の独立した `formal-model-check` job を既存 CI に統合した。旧 `.github/workflows/formal-verification.yml` は削除し、formal verification の実行入口を `.github/workflows/ci.yml` に一本化した。

実 GitHub Actions の dispatch と失敗回復を実施した。診断実行 `30071213275` では固定digest Dockerによる完全探索が168,319.3693 msで完走し、5,203,730 generated states、529,692 distinct states、探索深度9、queue 0、`NOT_DETECTED`、container残留0を記録した。この一次証拠とユーザー判断に基づき、BR-U4-7のspawn上限を180秒へ改訂した。計画 Step 15 は正式な1+5回受入が完走するまで未完了のまま維持する。

## 主な変更

- `workflow_dispatch` 時だけ `changes` job を空差分として正常収束させる分岐を追加した。push / pull request の既存判定は baseline 投影と一時 Git repository の E2E で無回帰を確認した。
- `formal-model-check` job を既存 job graph から独立させ、`contents: read`、30 分 timeout、secret / write token / OIDC / privileged container 不使用を固定した。
- Actions を次の commit SHA に固定した。
  - `actions/checkout` v4: `11d5960a326750d5838078e36cf38b85af677262`
  - `oven-sh/setup-bun` v2: `0c5077e51419868618aeaa5fe8019c62421857d6`
  - `actions/upload-artifact` v4: `ea165f8d65b6e75b540449e92b4886f43607fa02`
- U3 の canonical Docker image と TLA+ jar descriptor を import し、U4 内で固定値を再定義しない受入 runner を追加した。
- warm-up 1 回と計測 5 回を逐次実行し、CLI 180 秒未満、Docker spawn 180 秒未満、全回 exit 0 / `NOT_DETECTED` を要求する証跡モデルを追加した。
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

ローカル検証では Docker daemon を起動していない。Docker 境界は注入可能な command port と fake executable による deterministic test で検証し、実 Docker の一次証拠は GitHub Actions artifact として回収した。

## 実環境診断

- Run: `https://github.com/amadeus-dlc/amadeus/actions/runs/30071213275`
- Commit: `d60c99ac325cdc65dbda9ad7c5dda109e50fe12a`
- Profile: `non-acceptance-diagnostic`、1回、300,000 ms上限、固定image/JAR/JVM/TLC argv、1 worker。
- 結果: `NOT_DETECTED`、Docker/TLC 168,319.3693 ms、TLC内部159,592 ms、5,203,730 generated states、529,692 distinct states、探索深度9、queue 0。
- Cleanup: exact container名を検査し、残留0、forced cleanupなし。
- 判定: CLI 180秒未満とspawn 180秒未満の成立可能性を確認した。診断は1+5回受入の代替ではないため、U4は正式受入完了まで未完了。

## 正式受入の失敗回復

- Run: `https://github.com/amadeus-dlc/amadeus/actions/runs/30074187032`
- Commit: `e6e96f4ad5f17f90afdefe4225e33ec6b6df56ca`
- warm-up結果: TLC内部161,085 ms、Docker spawn約161.67秒、5,203,730 generated states、529,692 distinct states、探索深度9、queue 0で完全探索を終了した。
- 失敗原因: TLCは標準モジュールをrealpath済みscratch root直下から読み込んだと報告したが、planned runtimeは`<scratch>/.tlc-stdlib`だけを許可していたため、正常終了ログを`GRAMMAR`へ誤分類した。
- 修正: 実行argv、Docker隔離、JVM一時ディレクトリは変更せず、出力正規化の標準モジュール期待パスだけをprepared scratch rootへ束縛した。実runと同じパス形状・状態数・深度を使うintegration testで`COMPLETE`を固定した。

## 未完了事項と設計上の注意

1. 計画 Step 15 の1 warm-up + 5 measured受入はまだ完走していない。標準モジュールパス束縛の修正commitで実 `workflow_dispatch` を再実行し、artifactを回収する必要がある。
2. Iteration 1で指摘された空stderr契約の衝突は解消済みである。ファイル実在、manifestのbytes / SHA-256一致、16 MiB上限を維持したまま、`tlc-stderr.bin`だけ0 byteを許容する。
3. 診断commit `d60c99ac3` はpush済みで、GitHub workflow dispatch `30071213275` のartifactを回収済みである。

## 決定

- 診断実測に基づき、BR-U4-7のspawn閾値を180秒未満へ改訂する。
- 診断スクリプトは手動調査用として残すが、正式CI経路からは外す。
- 180秒契約でStep 15の正式受入を再実行し、一次証拠で完了可否を判定する。
