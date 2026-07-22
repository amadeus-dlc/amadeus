# Business Logic Model — reference-plugin-and-guides

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 目的と境界

U11はC4/C7のreference面として、`plugins/test-pro/`の最小authoring source、単一lifecycle E2E、reference/authoring guideを提供する。新runtime APIや第二plugin implementationは作らず、U01/U09/U10の公開contractを利用者視点で実証する。

U11はFR-6 items 21–22のownerである。projection implementationはU09、compose/drop implementationはU10、全24 item ledger closureはU12に残す。frontend、database、network serviceはない。

## Upstream input traceability

| Input | 採用した制約 | 設計箇所 |
|---|---|---|
| `unit-of-work.md` | test-pro、単一E2E、guide、新APIなし、deferred除外 | 目的、Fixture、Guide |
| `unit-of-work-story-map.md` | items 21–22 ownerはU11、U09/U10 consumer、U12集約 | 目的、Evidence |
| `requirements.md` | 6面projection、宣言成果物のみ、tracked一時物0、no-clobber/deferred/6対4 docs | E2E、Guide |
| `components.md` | C4 reference source+C7 docs/tests、既存verification再利用 | 境界、Evidence |
| `component-methods.md` | C4 compose/drop/doctorとC5 projectionの既存seamをそのまま使用 | Lifecycle |
| `services.md` | package workflowとhost compose/drop workflowを一つのfixtureで接続 | Lifecycle |

## Minimal reference fixture

`plugins/test-pro/`は、C1が受理するmanifest、宣言stage一件、既決4 seamとdeclared fragmentを実証するための必要最小artifact集合を持つ。具体slug、表示文言、fixture filesystem pathは実装詳細であり、公開contractにしない。

reference sourceはunsupported/deferred面を宣言しない。実装ロジックをpluginへ複製せず、U01 schemaでvalidateされ、U09でprojectされ、U10でcompose/dropされる入力だけを提供する。

## Single E2E lifecycle

1. temp repositoryへcanonical `plugins/test-pro/` sourceを配置する。
2. U01 contractでmanifest/stageをvalidateする。
3. U09 packagerでclaude/codex/cursor/kiro/kiro-ide/opencodeの6面とplugin bundleへ投影する。
4. U10 inspect/planでno-clobberを確認し、temp host treeへcomposeする。
5. compile、sensor、doctorを実行し、宣言成果物とplugin状態だけが検出されることを確認する。
6. U10 record-owned dropを実行し、宣言成果物だけを除去してcompile/doctorを再確認する。
7. lifecycle前後のtracked treeを比較し、一時生成物0、unrelated host bytes不変を証明する。

6 package面の成功と4 self-install面（claude/codex/cursor/opencode）の成功は別matrixで検証する。kiro/kiro-ideをself-installへ昇格しない。

## Guide model

referenceとauthoring guideは次を必須面として扱う。

- Amadeusの`plugins/<name>/` authoring pathとnamespace。
- supported schema/projection/compose/doctor/drop lifecycle。
- no-clobber、失敗時不変、record-owned dropの利用者可視契約。
- deferred面: marketplace/lockfile/agents/scopes/memory/knowledge/`when`評価。
- local/temp verification手順と、6 harness package対4 self-installの差。

guideはupstream README/CHANGELOGのコピーではなく、Amadeusのコマンド・path・failure contractへ再著作する。

## Evidence and failure scenarios

- 0-plugin baselineはU09 evidenceを参照し、U11ではtest-pro一件のclosureを証明する。
- same-name stage、malformed manifest、unknown seamはU10のloud rejectをfixtureから観測し、host/record/audit不変を確認する。
- compose成功後はdoctorがpluginを検出し、drop成功後は宣言成果物だけが消える。
- tracked source treeとtemp rootを分離し、success/failure双方で一時物0を確認する。
- U11はitem 21/22のtest/docs evidenceをU12へ渡し、自らledgerを遷移しない。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Review UTC: `2026-07-20T14:37:59Z`（`date -u` により取得）
- Verdict: **READY**

### Findings

- Blocking finding: なし。
- E-OC1適合: `plugins/test-pro/`正本、U01/U09/U10の既存contract消費、新runtime APIなし、必要最小fixture、authoring→6面projection→temp compose→doctor→dropの単一E2E、宣言成果物限定、tracked一時物0を3成果物で一貫して規定している。
- Guide境界: Amadeus固有path/namespace、対応面、deferred面、no-clobber、検証手順、6 package/4 self-install差を必須面とし、marketplace、lockfile、agents/scopes/memory/knowledge、`when`評価を実装対象から除外している。
- Ownership境界: fixtureの所有をinputs/expected declarative outcomesに限定し、projectionはU09、composition/no-clobber/atomic/drop record ownershipはU10、全体evidence/ledger集約はU12に残している。新fixture ownership、no-clobber/drop意味論の追加はない。
- 非契約化: test-proの具体slug、表示文言、fixture pathを実装詳細として明示し、公開contract化していない。
- consumes実質利用: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`の6件すべてについて、由来する制約と設計上の反映先が示され、3成果物間のtraceabilityと責務分割も整合している。

### Sensor評価

- `required-sections`: PASS見込み。3成果物はいずれもH2見出しを2件以上持つ。
- `upstream-coverage`: PASS見込み。3成果物はいずれもdirectiveのconsumes 6件を明記し、実質利用を説明している。
- `linter`: N/A。対象成果物にTypeScript/JavaScript snippetはない。
- `type-check`: N/A。対象成果物にTypeScript/TSX snippetはない。
- `answer-evidence`: PASS見込み。質問0件のE-OC1承認、承認TS、既決事項、非契約事項が質問票に記録され、成果物がその範囲内で機械導出されている。
