# Practices Discovery Evidence — Issue #1129

上流入力(consumes 全数): `code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md`。

## Pipeline & Deploy

- scan: `git log --first-parent -50 origin/main`、`.github/workflows/ci.yml`、`.github/workflows/release.yml`、`package.json`、version tagを確認した。
- evidence: `origin/main` first-parent直近50件のmerge commitは0件で、既決のsquash / linear運用と整合する。branch寿命はremote branchの残存だけでは確定しないため推定しない。
- evidence: CIはmainへのpushとPull Requestで起動し、typecheck、Biome lint、CCN complexity、dist / self-install drift、test、project / patch / relative coverageをgateする(`.github/workflows/ci.yml:8-216`)。
- evidence: releaseは `workflow_dispatch` からrelease-itでcommit / tag / pushし、GitHub Releaseとnpm publish provenanceへ進む(`.github/workflows/release.yml:32-159`)。確認できたtagは `v0.1.0`、`v0.1.1`、`v0.1.2` である。
- inference: application environment topologyは非該当で、公開経路はGitHub / npmの手動releaseに限定される。新しいdeploy判断は質問しなかった。

## Quality

- scan: `tests/`、`package.json` scripts、`.github/workflows/ci.yml`、`tsconfig*.json` と既決Testing Postureを確認した。
- evidence: test fileはunit 212、integration 148、e2e 68、smoke 14、other 2の合計444件である。TypeScript sourceは `packages/` 96件、`scripts/` 10件の合計106件である。
- evidence: `package.json:11-19` は `dist:check`、`promote:self:check`、`test:ci`、`typecheck`、`lint` を定義し、CIはこれらとcoverage gateをblocking jobで実行する。
- inference: scope別の既決方針に従い、bugfixはregression-first、全suite greenを要求する。percentage floorをrepo設定から新規推定せず、既存CIの計測契約を正本とする。

## Developer

- scan: `code-structure.md`、`technology-stack.md`、`architecture.md`、`packages/framework/`、`packages/setup/`、`biome.json`、`tsconfig.json` を確認した。
- evidence: `biome.json:3-7` はformatter無効・linter有効、`tsconfig.json:6-7` はstrict / noEmitを設定する。正本はcoreのharness中立層とharness別表層に分離される。
- evidence: setup domainには判別unionの `Result<T, E>` styleがあり、例外もrepo全体には存在するため、「全境界で例外禁止」のような新規hard ruleは導出しない。
- inference: 既決のTypeScript / ESM / Bun、Biome、strict typecheck、core / harness境界を変更せず適用する。命名やerror handlingの未決質問はない。

## DevSecOps

- scan: workflow、Biome / TypeScript設定、repository内のSAST / DAST / secret scan / dependency-update automation設定を検索した。
- evidence: lint、typecheck、CCN、生成物drift、test、coverageはrepo-wiredである。一方、repository管理下にはSAST / DAST / secret scan workflowおよびDependabot / Renovate設定を確認できなかった。
- inference: repository外のGitHub設定や組織設定の有無は断定しない。配線0件を本intentで新しいsecurity controlを発明する根拠にせず、現状証拠としてのみ記録する。

## Integrated Gap Assessment

`code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md` が示すbrownfield構造と、org / team / projectのaffirmed practiceは矛盾しない。Way of Working、Walking Skeleton、Testing Posture、Deployment、Code Style、DevSecOpsのいずれにも新しいrisk toleranceや運用判断はなく、leaderが2026-07-17T18:55:41Zに質問0件を承認した(agmsg 出典)。

engine directive / frontmatterは `mode=inline` であり、stage-protocolのrouting authorityに従ってpipeline-deploy、quality、developer、devsecopsの4観点をconductorがinlineで統合した。stage本文Step 2の4 Task記述との不整合は、leaderが2026-07-17T18:53:33Zにinline・subagent 0件と裁定しており、memoryのDeviationに保持する。

## Promotion Incident Evidence

E-PD1修正後の初回promotionは2026-07-17T19:25:42Zにexit 0で `PRACTICES_AFFIRMED` をemitしたが、`team.md` の `## Way of Working` 配下にある既存nested normまで次のH2境界ごと置換した。pre-promotion HEAD版からの実測は263→210行、H3 9→3(6件消失)、CID 190→138(52件消失)、diff +17/-70、hash `d8afae274fb5348866595f013f738c08c30a3052`→`8fcd01ce1bbfc7c40811be7fae4bb2f61ae92d6f` である。

`project.md` は初回promotion前後でdiff 0だった。破壊的 `team.md` 差分とaudit eventはE-PD2修正配送まで保持し、E-PD2が独立投票3/3・全員GoA5で成立した後、leaderの明示指示により `team.md` だけをpre-promotion HEAD版へ復元する。安全修正版ではunmanaged nested本文のbyte-for-byte保存、H3 / CID維持、missing canonical H2追記、managed block一意、再実行冪等、malformed時の両target不変を検査する。

安全修正 `29676e4c2cb38fc9a9bacc2ed9bcb5e64eed1e4b` のcopy preflightは、既存 `Way of Working` 16,672 bytesのbyte一致、H3 9 / CID 190維持、5 managed blockと5 canonical H2の一意性、再実行hash同一、malformed marker時exit 1かつteam / project両hash不変を確認した。本promotionも同じunmanaged bytes・H3・CID・managed block一意性を維持し、`project.md` hash `d1f07180d6f84e926ee309eaa54c184d6f9d0e3b` は不変、`team.md` 再実行hashは `c7fe729ed6b352a7331f54002f3e0ddae657e4fd` で同一だった。
