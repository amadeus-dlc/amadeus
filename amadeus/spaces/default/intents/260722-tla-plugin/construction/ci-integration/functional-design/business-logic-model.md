# Business Logic Model — U4 ci-integration

上流入力(consumes 全数): unit-of-work(U4 定義)、unit-of-work-story-map(体験ステップ5)、requirements(FR-5.1〜5.4)、components(C-7)、component-methods(C-7 steps)、services(CI 実行単位・30分 timeout)

## 中核フロー: ci.yml への formal ジョブ統合

1. **トリガー追加**: ci.yml の `on:` に `workflow_dispatch:` を追加(既存 push/pull_request は不変)。dispatch input は設けない(formal ジョブの実行有無は event 名のみで決まる単純規則 — 誤操作面を最小化)
2. **formal ジョブ**: `formal-model-check` ジョブを追加。`if: github.event_name == 'workflow_dispatch'` により dispatch 以外では job レベルで skip(step レベル分岐にしない — job 一覧で skip が可視)
3. **ジョブ steps**(component-methods C-7 どおり): checkout → tla2tools.jar を版固定 URL からダウンロード → `sha256sum -c` 検証 → docker 可用性確認(`docker info` 相当の存在・起動確認**のみ** — digest 一致・jar sha256 の検証責務は U3 の `DockerSpawnPlanner.verifyEnvironment` が所有し、CI ステップは重複実装しない。iteration 1 Info 3 是正)→ `bun scripts/formal-verif/run-model-check.ts --model specs/tla/FormalElection.tla --cfg specs/tla/FormalElection.cfg --out out/ --provider docker`(イメージは eclipse-temurin@sha256 digest 固定を設定)→ out/ を artifact upload(if-no-files-found: error)
4. **U3引継ぎ受入**: warm cacheを準備後、Docker実containerでwarm-up 1回+計測5回を実行する。各計測のspawn/CLI時間、outcome、manifest/receipt digest検証結果をartifactへ保存し、1回でもexit非0、spawn 120秒以上、CLI 180秒以上、artifact不整合ならformal jobを失敗させる。
4. **既存ジョブの保護**(iteration 1 Major 1 是正 — grep 実測): 既存ジョブは **7個**(changes / check / coverage-head / coverage-base / coverage / metrics-snapshot / ci-success)であり、**全7ジョブ+既存トリガー・env を含むファイル全体**に一切触れない。保護テストは「新規追加ブロック(`workflow_dispatch:` トリガー行+`formal-model-check:` ジョブブロック)を除いたファイル全体が base と diff ゼロ」を assert する(4ジョブ限定の述語にしない — ci-success.needs への誤追加等も検出)
5. **dispatch 時の既存ジョブ挙動**(iteration 2 反証→ユーザー裁定 A 2026-07-22): workflow_dispatch では `BASE_SHA`(ci.yml:47)が空になり、`^0+$` 分岐(:53)にマッチせず `git diff "" HEAD` が **exit 128 でハード失敗**(レビュアー bash 再現)→ `ci-success`(:391-419、needs: [changes, check, coverage])が連鎖失敗し実行全体が赤表示になる。対処(裁定 A): `changes` ジョブに「BASE_SHA 空検知 → ci=false(既存バンド skip)」の**申告済み最小分岐**を追加する。push/PR 経路の挙動は不変(BASE_SHA 空は push/PR では発生しない)。formal ジョブは changes 非依存の独立ジョブのまま。A2 実測時に dispatch 1回で changes=skip 収束・formal green・全体表示 success を確認する
5. **退役**: `.github/workflows/formal-verification.yml` を削除(git 履歴に残る。復活させない — FR-5.3)

## 検証(workflow は spawn 不能な宣言物 — 静的検証で担保)

- workflow YAML の構造テスト(integration): `on.workflow_dispatch` の実在、formal ジョブの `if` 条件の verbatim 一致、許容3変更(dispatch トリガー / formal ジョブ / changes 最小分岐)除去後のファイル全体 base 一致(退役ファイルの不在も assert — BR-U4-3 の述語と同一)
- dispatch 実測(A2: Linux 完走時間)は本 Unit の着地後、実 dispatch 1回で確認(deployment 相当の外部操作のためユーザー承認後 — P4)

## エラー経路

- jar チェックサム不一致 → sha256sum -c が非0で job 赤(loud)
- docker/イメージ取得失敗・TLC HARNESS_ERROR → run-model-check の exit 2+ で job 赤。すべて artifact(out/)にエビデンス保存
- deterministic planner/falling proofだけではU3 Step 11を完了にしない。Docker実containerの6回実行証跡が欠ける場合もjobを赤にする。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-22T13:56:07Z
- **Iteration:** 2
- **Scope decision:** none

Major1/Info3はCLOSED。Minor2の是正が実機再現で反証され新Major化(dispatch時changesハード失敗→全体赤表示、BR-U4-3と衝突)。設計判断が必要と差戻し → ユーザー裁定A(changesへBASE_SHA空検知の最小分岐を申告追加)を取得し、conductorがFR-5.4改訂+FD3ファイルへ反映済み。受理はゲートの人間裁定に付す。

### Findings

- None
