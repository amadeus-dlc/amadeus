# Practices Discovery — 明確化質問(Issue #1129)

上流入力(consumes 全数): `code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md`。

## 選挙不要判定(E-OC1 3段順序)

判定: 全6論点を選挙不要(0問)とする。2026-07-17T18:55Z 頃に conductor e1 から leader へ申告し、leader が 2026-07-17T18:55:41Z に承認した(agmsg 出典)。回答の先取り記入はなく、本承認後にこの証跡を作成した。

| 論点 | 根拠種別 | 既決の所在 |
|---|---|---|
| Way of Working | 既決規則+git実測 | `org.md` / `team.md` / `project.md` の短命branch・PR・squash規則。`origin/main` first-parent直近50件のmerge commitは0件 |
| Walking Skeleton | 既決規則 | brownfieldのbugfixではceremonyをskipする既定が `org.md` にあり、本intentはMarkdown branch hygieneに限定 |
| Testing Posture | 既決規則+repo実測 | `project.md` のBunテスト規則と `.github/workflows/ci.yml` のblocking gate。現行test fileはunit 212 / integration 148 / e2e 68 / smoke 14 / other 2 |
| Deployment | 既決規則+repo実測 | deploy基盤なし、`.github/workflows/release.yml` の `workflow_dispatch` からrelease-it / GitHub Release / npm publishを行う既決経路 |
| Code Style | 既決規則+repo実測 | TypeScript / ESM / Bun、Biome 2.4系、formatter無効、strict `tsc --noEmit`、core / harness境界を `project.md` と設定で確認 |
| DevSecOps | 非該当・現状証拠 | CIのlint・型・complexity・drift・test gateは実在。repo内にSAST / DAST / secret scan / dependency-update設定は見つからず、今回新設するrisk判断はscope外 |

`code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md` と現HEADのrepo設定を全数照合した。未決のProduct / Delivery / Quality / Developer / DevSecOps判断はない。

## §13選定

2026-07-17T19:01:07Zにleaderがpersist 0件を承認した(agmsg 出典)。c1/c6は既存CID再適用、c2/c7は本intent固有、c3/c4/c5は実装不整合の監査証拠であり、workaroundをpractice化しない。E-PD2安全修正後のpromotion成功によりopen questionを解決済みへ移し、再surfaceでopen questions 0件を確認してから0件persistする。

## 質問

なし(0問)。
