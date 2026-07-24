# Feasibility 質問 — 260722-tla-plugin

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: 各問ユーザー本人の HUMAN_TURN 直接回答 — Grill me)。合意サマリのユーザー承認タイムスタンプ: 2026-07-22T11:31:19Z(「はい、確定」)
> モード: Grill me(質問は1問ずつ動的に追記)
> 上流入力(consumes 全数): intent-statement(必須・読了)。competitive-analysis / market-trends / build-vs-buy は market-research SKIP のため設計どおり不在(expected)
> 自己調査済みの技術事実(質問対象外): plugin合成エンジン実在(scripts/plugin-composition.ts、4シーム語彙 produces/consumes/sensors/required_sections、no-clobber・atomic・可逆drop)、TLC実行コア実在(fs-tlc-toolchain.ts、fail-closed契約)、CI実績(macos-15 + temurin JDK 26.0.1 厳格照合、formal-verification.yml)、graph compile は plugin metadata を保持

## Q1. JDK 依存と Bun-only Forbidden の整理方針

事実: project.md Forbidden「利用者側の Bun-only 前提を変更する理由を文書化せず、配布フレームワークへ runtime dependency を追加しない」。TLC は JVM 上で動くため、formal-model-check プラグインは JDK という runtime dependency を実質的に持ち込む。実験時は formal-verification.yml(CI専用・実験扱い)だったため未整理。

- A. opt-in 例外として文書化(推奨): プラグインは compose した利用者だけが負う opt-in 依存であり、コアの Bun-only 前提は不変 — この根拠をプラグインREADME等に明文化し Forbidden の「文書化」要件を満たす。JDK 不在時は run-model-check.ts が loud エラー(fail-closed)
- B. JDK 検出の graceful degrade: JDK 不在時はステージを advisory skip として扱う
- C. コンテナ同梱: TLC 実行を Docker 等で包み JDK を配布面から隠蔽する
- X. Other (please specify)

[Answer]: A — opt-in 例外として文書化(プラグインREADMEに根拠明文化、JDK不在は loud エラー fail-closed)(2026-07-22, Grill me)

## Q2. JDK バージョンピンの方針

事実: 実験CIは temurin JDK 26 をセットアップし `openjdk version "26.0.1"` を grep 厳格照合(formal-verification.yml)。実験の決定性担保(5 measured run)のための固定運用だった。常設化後は TLC の実行決定性は fail-closed 契約(completion marker + state統計)側が担保する。

- A. メジャー版ピンに緩和(推奨): ci.yml 統合ジョブは temurin 26(メジャー)を要求し、パッチ版の厳格 grep は撤去。決定性は実行契約側で担保されるため、パッチ版ピンは供給停止時の破損リスクだけが残る
- B. 厳格ピン維持: 26.0.1 の grep 照合を常設ジョブにも持ち込む
- C. ローカル準拠: バージョン要求を設けず、JDK 実在のみ確認
- X. Other (please specify)

[Answer]: A — メジャー版ピン(temurin 26 要求、パッチ版厳格grepは撤去。決定性は fail-closed 実行契約側で担保)(2026-07-22, Grill me)

## Q3. macOS ランナーコストの許容

事実: 実験ジョブは macos-15 ランナー必須(TLC toolchain のプロセス隔離が DarwinSandboxExecProvider = sandbox-exec 依存)。GitHub Actions の macOS ランナーは Linux 比で分単価10倍。ジョブは workflow_dispatch 専用(既決)のため発火は手動時のみで、PR ごとの常時課金はない。Linux 対応には sandbox provider の追加実装(nsjail/bubblewrap 等)が必要。

- A. macOS 前提を維持(推奨): 発火が手動限定でコスト影響は小さく、実証済み構成を変えない。Linux provider は必要が生じた時の将来intentへ
- B. Linux provider を本intentで実装: 分単価とランナー待ちを恒久に下げる
- C. sandbox なし実行を許可: 隔離なしで TLC を直接実行するフォールバックを設ける
- X. Other (please specify)

[Answer]: X — ユーザー裁定: GitHub CI 側は sandbox 不要(ランナー自体が隔離環境)。CI は Linux ランナー前提とし、TLC を直接インストールするか Docker イメージを使う。macOS 前提の維持案は却下。run-model-check.ts は CI(Linux・sandbox なし)実行経路を持つこと(2026-07-22, Grill me、ユーザー原文: 「githubのCI側はsandbox関係ないだろ。githubのCIではLinuxです。tlcをインストールするか、dockerイメージを使うことを想定しろや」)

## Q4. Linux CI での TLC 供給方式

事実: TLC は tla2tools.jar(単一jar、GitHub Releases から取得可)として配布される。Docker では apalache や公式類似イメージが存在するが、jar 直接利用なら setup-java + jar ダウンロードのみで完結する。

- A. tla2tools.jar 直接取得(推奨): ubuntu ランナー + temurin JDK + tla2tools.jar を版固定 URL + チェックサム検証でダウンロードして実行。依存が最少で、既存の fs-tlc-toolchain の jar 呼び出し形と連続性がある
- B. Docker イメージ: TLC 入りイメージを pull して実行(イメージ供給元への依存が増える)
- X. Other (please specify)

[Answer]: B — Docker イメージ(CI の TLC 供給は Docker イメージ経由とする)(2026-07-22, Grill me)

## Q5. Docker イメージの供給元

事実: 選択肢は (i) 既成イメージ(tlaplus コミュニティ等)を digest 固定で pull、(ii) 本リポジトリに Dockerfile を置き自前ビルド(GHCR へ push または CI 内 build)。外部イメージは供給元の継続性・改竄リスクを digest 固定で緩和できるが、内容の統制は自前ビルドが最も強い。

- A. 自前 Dockerfile(推奨): repo に Dockerfile(temurin ベース + tla2tools.jar 版固定+チェックサム)を置き、CI 内でビルドまたは GHCR にキャッシュ。サプライチェーンの統制と再現性が最も強く、外部イメージの放置リスクがない
- B. 既成イメージを digest 固定で pull: メンテコストは最少だが供給元依存が残る
- X. Other (please specify)

[Answer]: B — 既成イメージを digest 固定で pull(具体イメージの選定は設計段で実測確認のうえ確定 — external-seam 実測ノルム準拠)(2026-07-22, Grill me)
【再裁定 2026-07-22T12:32:22Z(application-design 段の実測による前提不成立)】権威ある既成 TLC イメージは不在(ghcr.io/tlaplus/tlaplus 不在、Docker Hub は個人イメージのみ stars 0〜1)と実測確定 → ユーザー再裁定: **公式 eclipse-temurin イメージ(digest 固定)+ 公式 tla2tools.jar(GitHub Releases、版+チェックサム固定)** — 「Docker イメージを使う」(Q4)と一次供給元統制を両立する形で B を具体化。

## 回答間の整合注記(contradiction analysis)

- Q2(JDK メジャー版ピン)と Q4/Q5(CI は Docker 経由)の関係: CI ジョブ上の JDK セットアップは Docker イメージ内の JDK に置き換わるため、Q2 の裁定は「ローカル実行時の JDK 要件(temurin 26 メジャー)」および「イメージ選定時の JDK 系列要件」として適用する。矛盾ではなく適用面の分担。
- Q1(JDK 依存の opt-in 文書化)は Docker 経路でも不変 — ローカルで run-model-check.ts を使う利用者には JDK(または Docker)が必要であり、opt-in 依存の明文化義務は残る。
