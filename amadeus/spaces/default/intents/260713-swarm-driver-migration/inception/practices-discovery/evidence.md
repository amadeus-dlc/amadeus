# Practices Discovery 証拠

## スキャン条件

- 対象: Brownfield の `amadeus` リポジトリ
- 観測コミット: `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`
- 観測日時: `2026-07-13T08:16:02Z`
- 実行形態: `AMADEUS_OPERATING_MODE` 未設定のソロモード。Pipeline、Quality、Developer、DevSecOps の4 persona を inline で適用した。
- 再利用した同日 CodeKB: `code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md`。各成果物の最新 `260713-swarm-driver-migration` 節と現行リポジトリの差分証拠を照合した。

## Pipeline & Deploy Agent の所見

- `git log --first-parent -n 60` は各コミットに [Pull Request](https://github.com/amadeus-dlc/amadeus/pulls) 番号を持ち、直近100コミットの merge commit は0件だった。`main` 中心の短命ブランチを squash merge する既存の GitHub Flow／トランクベース運用と一致する。
- `.github/workflows/ci.yml:7-24` は `main` push と Pull Request を対象にし、PR は supersede cancellation、`main` はSHA単位で全runを完走させる。
- `.github/workflows/release.yml:28-49` は `workflow_dispatch` と `v*` tag を入口とし、`contents: write` と npm provenance 用 `id-token: write` を release job に限定する。最新タグは `v0.1.1`（2026-07-08）。
- ランタイム環境へのデプロイ基盤はなく、配布先は npm と GitHub Release である。既存 project.md の Deployment を変更する証拠はない。

## Quality Agent の所見

- テストファイルは406件で、smoke 13、unit 205、integration 118、e2e 68。`tests/run-tests.ts:109-123` は `--ci` を smoke＋unit＋integration、`--release` をそれら＋e2e と定義する。
- `.github/workflows/ci.yml:46-65` は typecheck、Biome lint、lizard complexity ratchet、dist drift、self-install drift、smoke＋unit＋integration を merge gate とする。
- `codecov.yml` は patch coverage 100% を要求し、`.github/workflows/ci.yml:76-125` は project coverage ratchet と Codecov OIDC upload を実行する。
- 今回の4 native driver の2 Unit以上 live proof は通常CIへ資格情報を追加せず opt-in e2e とすることが Ideation で既決である。これは intent の完了要件であり、恒久的な team practice の変更ではない。

## Developer Agent の所見

- `package.json:9-20` は Bun を実行基盤とし、TypeScript、Biome、`scripts/package.ts`、`scripts/promote-self.ts`、tiered test runner を正準コマンドにする。
- `tsconfig.json:2-20` は TypeScript ESM、bundler resolution、strict、noEmit を強制する。`biome.json:3-27` は formatter を無効、linter を有効にし、`dist/**` と生成済み setup dist を検査対象外にする。
- 正本は `packages/framework/core/` と `packages/framework/harness/<name>/`、生成物は `dist/<harness>/`、Claude／Codex self-install は `scripts/promote-self.ts` が同期する。現行 project.md の Code Style／Way of Working と一致する。
- 既存 CLI／hook は境界で例外を捕捉し、監査・stderr・exit code へ変換する手続き型が中心である。新 driver selector の error model は後続 Requirements／Application Design で固定し、practice として先取りしない。

## DevSecOps Agent の所見

- `.github/workflows/ci.yml:26-27` の既定権限は `contents: read`。Codecov job の OIDC、metrics snapshot 用 GitHub App token、release job の publish権限だけをjob単位で追加する。
- Codecov と `actions/github-script` は commit SHA pin、その他の checkout／setup／artifact／release action は major tag pinである。
- main には Dependabot、Renovate、CodeQL、Semgrep、Gitleaks、Trivy 等の専用設定がない。`origin/renovate/configure` は存在するが main に設定がないため、依存更新automationが有効とは確認できない。
- 現在の security posture は権限最小化、lockfile固定、OIDC provenance、型検査／lint／complexity／テスト／drift guard が中心で、専用SAST・secret scan・dependency vulnerability gateは未導入である。不在を新しい推奨 practice として肯定せず、現状証拠としてのみ記録する。

## Interview Gap Analysis

| Practice area | 決定根拠 | 未決ギャップ |
| --- | --- | --- |
| Way of Working | Git履歴、CI trigger、team.md／project.md | なし |
| Walking Skeleton | project.md と本 intent の Ideation／scope決定 | なし |
| Testing Posture | 406 test files、CI／coverage gate、Comprehensive test strategy | なし |
| Deployment | release.yml、npm／GitHub Release、project.md | なし |
| Code Style | tsconfig、Biome、正本／生成物境界、project.md | なし |

Brownfield interview は evidence で確定できない項目だけを質問する契約であるため、今回は追加質問を行わなかった。新しい hard constraint も発見していないため、`team-practices.md` と `discovered-rules.md` は無変更の部分ドラフトとした。

## Traceability

- Way of Working／Code Style: `code-structure.md`、`architecture.md`、`dependencies.md`
- Testing Posture／security evidence: `technology-stack.md`、`code-quality-assessment.md`
- Deployment／利用者価値: `business-overview.md`、`architecture.md`
- Intent固有の native driver completion criteria: Ideation の `feasibility-assessment.md`、`scope-document.md`、`initiative-brief.md`
