# Code Summary — metrics-publication-convergence

## 実装結果

Snapshot Publisher と Maintenance Publisher を分離した。Snapshot は完全 SHA ごとの JSON 1件だけを作成・公開し、merge 着地後に明示的な `repository_dispatch` を送る。Maintenance は固定 concurrency group と安定 branch / PR を使い、最新 `main` の landed JSON 集合から retention と `metrics/index.html` だけを再構築する。

## 作成・変更ファイル

### Application / workflow

- `.github/workflows/ci.yml`
  - `metrics-snapshot` から retention、dashboard、`git add -A metrics/`、run-attempt branch を除去
  - 完全 SHA を `metrics-publication.ts snapshot` へ渡す JSON-only Publisher に変更
  - `paths-ignore: metrics/**`、5分 timeout、`ci-success` 非依存、既存 GitHub App 権限を維持
- `.github/workflows/metrics-maintenance.yml`
  - `repository_dispatch: metrics-maintenance` 専用 workflow を追加
  - 固定 `metrics-maintenance` concurrency、5分 timeout、既存 GitHub App の `contents: write` / `pull-requests: write` だけを使用
- `scripts/metrics-publication-domain.ts`
  - API payload の fail-closed parser
  - Snapshot / Maintenance の所有権 AND 判定
  - 複合 inventory の評価順序、sticky failure、cutoff / lease retry、deadline、最終収束判定
- `scripts/metrics-publication-github.ts`
  - Git / `gh` inventory、full-SHA branch、PR create / reuse / close、remote-head lease delete / update、auto-merge、dispatch の adapter
  - Snapshot JSON-only staging と Maintenance index / retention-only staging の実 diff guard
  - branch 単位の全 PR 列挙、新規 branch の expect-absent lease、cutoff 時点の期待結果と最新 `main` の照合
- `scripts/metrics-publication.ts`
  - `snapshot` / `maintenance` の引数検証と薄い CLI

### Tests

- `tests/unit/t222-metrics-publication.test.ts`
  - Snapshot / Maintenance の状態表、所有権 AND、sticky failure、deadline、orchestration を検証
- `tests/integration/t222-metrics-publication.integration.test.ts`
  - local bare remote と fake `gh` により、同一 SHA 3回、異なる3 SHA、stable maintenance、人間所有 branch fail-closed、cutoff 後に着地した Snapshot との非競合を実証
- `tests/lib/ci-snapshot-wiring.ts`
  - 2 workflow の配線抽出へ更新
- `tests/unit/t222-ci-snapshot-wiring.test.ts`
- `tests/integration/t222-ci-snapshot-branch.integration.test.ts`
  - JSON-only Snapshot、明示 dispatch、単一 Maintenance、最小権限、非再帰、`ci-success` 非依存を固定
- `tests/fixtures/formal-verif-ci-baseline.sha256`
  - formal-model-check の独立性を守る既存 CI workflow 契約について、metrics snapshot job の意図した変更後の正規化ハッシュへ更新

## 主要判断

- 1,225行の単一 helper は責務が深すぎるため、純粋 domain / GitHub adapter / CLI の3モジュールへ分割した。互換 shim、extension point、新規 dependency は追加していない。
- 外部 API field 欠落、不正 JSON、所有権不明、lease 不一致を「候補なし」へ丸めず、変更0件または bounded retry で fail-closed とした。
- conflicting / closed / landed+stale / no-diff+stale を回復した run は、最終収束後も非0を維持する。
- auto-merge 登録を成功条件にせず、landed JSON 1件、関連 OPEN PR 0件、remote branch 0件、Maintenance dispatch 受付まで照合する。
- Maintenance は publish 前に `main` cutoff と remote branch head を再照合し、前進・lease 不一致時は生成結果を捨てて再計算する。
- Snapshot / Maintenance の新規 branch push は expect-absent lease、既存 Maintenance branch 更新は観測済み OID lease を必須とし、並行 writer を上書きしない。
- Maintenance の収束判定は開始時 cutoff の JSON 集合だけを評価する。cutoff 後に着地した新しい Snapshot JSON は現在の run を未収束へ戻さず、次の dispatch に委ねる。
- 再照合で一時生成した cutoff 時点の `metrics/` は `finally` で最新 `origin/main` へ復元し、polling と後続処理へ作業ツリー変更を漏らさない。

## 要件追跡

| 要件 | 実装・検証 |
| --- | --- |
| FR-01〜FR-03 | full-SHA inventory、JSON-only staging、Snapshot 状態機械、merge 後照合、sticky failure |
| FR-04〜FR-05 | repository dispatch、stable Maintenance、retention / visualizer 再利用、cutoff 再計算 |
| FR-06 | repository / bot / branch / marker / diff / remote head の AND evidence、expect-absent / observed-OID lease |
| FR-07 | `metrics/**` 非再帰、通常 main push 起動、`ci-success` 非依存 |
| NFR-01 | 同一 SHA 3回、異なる3 SHA、stable maintenance の hermetic integration |
| NFR-02 | 5分 workflow timeout、270秒 internal deadline、分類付き JSON 結果 |
| NFR-03 | 既存 App 権限、PR-only、人間所有 branch の変更0件 |

## 検証結果

- conductor 再実行の対象回帰:
  - `bun test` で t221 / t222 / t231 / t298 の11ファイル
  - **157 pass / 0 fail / 424 expect**
- cutoff / lease hardening 後の対象回帰:
  - `bun test tests/unit/t222-metrics-publication.test.ts tests/integration/t222-metrics-publication.integration.test.ts tests/unit/t222-ci-snapshot-wiring.test.ts tests/integration/t222-ci-snapshot-branch.integration.test.ts`
  - **70 pass / 0 fail / 245 expect**
  - `bun run typecheck`: PASS
  - 変更対象8ファイルの Biome: error / warning 0
  - `git diff --check`: PASS
- builder 実行:
  - `bun run typecheck`: PASS
  - 変更対象 Biome: warning / error 0
  - `bun run lint`: exit 0。既存 baseline の complexity warning だけで、新規対象は0
  - `bun install --frozen-lockfile`: PASS
  - `git diff --check`: PASS
- `bun run test:ci`:
  - verbose 再実行で **654ファイル / 9,041 assertion / 2 fail** を記録
  - `t-formal-verif-ci-workflow.integration.test.ts` は metrics snapshot job の正当な変更に対して固定 baseline が古くなったため失敗。baseline を更新し、単独再実行で **3 pass / 0 fail / 13 expect**
  - 修正後の t222 対象回帰は **70 pass / 0 fail / 245 expect**、`git diff --check` も PASS
  - 残る `t-team-up-codex-resume.serial.test.ts` の failure-injection ケースは本変更と非交差。指定外のため変更していない

## 計画との差異

- 当初は `scripts/metrics-publication.ts` 1ファイルを想定したが、自己レビューで巨大モジュール化を検出したため3責務へ分割した。公開 CLI と要件スコープは不変。
- repository 全体 `test:ci` の完全 green は、非交差の既知 `t-team-up-codex-resume.serial.test.ts` 1件により得られていない。今回の CI workflow 契約回帰は修正・単独 green 化済みで、対象回帰、typecheck、lint も green。

## 未解決事項

- 実装上の未解決事項はない。
- repository 全体には本変更と非交差の `t-team-up-codex-resume.serial.test.ts` failure-injection 失敗が1件残る。指定外のため対応しない。
- §12a reviewer 起動時、engine directive の literal `{unit-name}` を reviewer runtime が実在パスへ解決できず停止した。実装レビュー前の framework blocker として [Issue #1757](https://github.com/amadeus-dlc/amadeus/issues/1757) に起票済みであり、正規 reviewer verdict は未取得。
