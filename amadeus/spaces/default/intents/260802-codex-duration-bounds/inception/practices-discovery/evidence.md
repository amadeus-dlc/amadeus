# Practices Discovery Evidence — Codex Duration Bounds

## Upstream Inputs

同日更新の `code-structure`、`technology-stack`、`dependencies`、`code-quality-assessment`、`architecture`、`business-overview` を読み、現在のcommit `6d84d06cb6e0a22626c8227709778215a91bc70f` に対する4領域のfresh scanで補完した。テストはこの発見ステージでは実行せず、静的証拠だけを使用した。

## Pipeline and Deployment Scan

- `main`への短命Pull Requestを使うGitHub Flowで、trunk-based disciplineを併用する。直近の人間起因PRは短命で、Bolt単位のsquash mergeというteam practiceと整合した。
- `.github/workflows/ci.yml` はtypecheck、Biome/complexity、distribution contract、plugin conformance E2E、smoke/unit/integration、dist/self-install/graph drift、coverageを集約する。
- 配備基盤は持たず、`.github/workflows/release.yml` の手動 `workflow_dispatch` からrelease-it、GitHub Release、npm publishを実行する。staging/canary/自動rollbackは確認できずUNKNOWN。

## Quality Scan

- Bunの独自runnerはsmoke/unit/integration/e2e/perfを持ち、通常CIはsmoke/unit/integration、単一plugin E2Eをblockingで実行する。perfと形式検証はPR blocking外である。
- project/relative/patch coverage、complexity、distribution driftはblocking。dynamic test-sizeとlegacy deletion gateの一部はadvisoryである。
- 既存team practiceは振る舞い変更と欠陥修正にTDDを要求する。現在のsuite verdictと具体的な質問・retry予算値はUNKNOWNであり、推測しない。

## Developer Scan

- TypeScript/ESM、Bun、strict `tsc --noEmit`、Biome、lower-kebab file、camelCase symbol、PascalCase type、判別unionが既存様式である。
- `packages/framework/core/` がharness-neutralな正本、`packages/framework/harness/<name>/` が薄いadapter/overlay、`dist/` とself-install treeが生成投影である。
- advisory hookはセッション拘束を避けるfail-open、canonical audit/state mutationはfail-closedという境界がある。今回も共有predicateをcoreに置き、adapterへ複製しない。

## DevSecOps Scan

- GitHub Actionsは最小権限の `contents: read` を既定にし、release時だけ限定GitHub App tokenを使う。依存はlockfileで固定し、npm publishにはprovenanceを付与する。
- Biome lint、strict typecheck、complexity ratchet、distribution driftはCI配線済みである。
- 専用SAST/DAST、secret scanning、dependency vulnerability scan、SBOM生成、Dependabot/Renovate設定はrepository workflowで確認できず、実装済みとは扱わない。

## Gap Interview

既存のaffirm済み5領域とIntent Capture・Scope Definitionの承認済み判断が全項目を埋めていたため、追加質問は0件とした。Codex固有ゲートの要否は未確定事項ではなく、再現可能なnative lifecycle defectが共有predicateへ写像できない場合だけ許容するという承認済み要件を維持する。

## Conclusion

新規team practiceと恒久ALWAYS/NEVER ruleはいずれも0件である。無変更部分ドラフトをno-op promotionし、既存のteam/project memoryを温存する。
