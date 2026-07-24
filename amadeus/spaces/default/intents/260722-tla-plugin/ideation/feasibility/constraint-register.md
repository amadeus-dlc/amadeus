# Constraint Register — 260722-tla-plugin

上流入力(consumes 全数): intent-statement(読了・依拠)。competitive-analysis / market-trends / build-vs-buy は market-research SKIP のため不在(expected)

## 技術制約(Technical)

| ID | 制約 | 出典 |
|---|---|---|
| T1 | CI は Linux(ubuntu)ランナー前提とし、TLC は既成 Docker イメージの digest 固定 pull で供給する。sandbox-exec は CI では使わない | Q3 ユーザー裁定 + Q4/Q5 |
| T2 | ローカル実行の JDK 要件は temurin 26 メジャー版ピン(パッチ版厳格照合は撤去)。イメージ選定も JDK 26 系列を要件とする | Q2 |
| T3 | run-model-check.ts は fail-closed 実行契約を保持する: 完全探索完走の completion marker + state 統計が揃う場合のみ NOT_DETECTED を主張、部分探索・timeout・統計欠損は HARNESS_ERROR | 既決 cid:application-design:finite-exploration-not-detected-proof |
| T4 | .tla モデル/cfg のバイト同一性検証(SOURCE_DRIFT 検出)を外部ファイル化後も維持する | fs-tlc-toolchain 既存契約 |
| T5 | プラグインの貢献は既存4シーム語彙(produces/consumes/sensors/required_sections)+ stages コピー+ fragments に限る。scopes 合成は plugin の見送り面 | scripts/plugin-composition.ts SEAM_NAMES、docs/guide/19-plugins.md |

## 組織的制約(Organizational)

| ID | 制約 | 出典 |
|---|---|---|
| O1 | JDK/Docker という opt-in runtime 依存の根拠をプラグイン文書に明文化する(Bun-only Forbidden の文書化要件)。コアの Bun-only 前提は不変 | Q1 裁定 + project.md Forbidden |
| O2 | 形式検証は日常 CI へ一律義務化しない。発動は並行プロトコルの spec 変更時のみ、専用ジョブは workflow_dispatch | 既決 cid:build-and-test:two-layer-verification-posture(user decision 2026-07-22) |
| O3 | 実験専用資材(arm-s系・eligibility系・run-skeleton-ci.ts)は本intentでは触らない | Q2 裁定 @intent-capture |
| O4 | リリース・バージョン面には一切触れない(release.yml 一本) | project.md Mandated |

## 規制/ガバナンス制約(Regulatory / Governance)

| ID | 制約 | 出典 |
|---|---|---|
| G1 | 外部規制(PCI/HIPAA 等)該当なし — OSS 開発検証基盤 | compliance 視点評価 |
| G2 | Docker イメージは digest 固定でサプライチェーン変動を遮断。具体イメージは設計段の実測確認(実在・TLC版・JDK系列)を経て確定する | Q5 裁定 + external-seam 実測ノルム |
| G3 | 完備性 sensor は「落ちる実証」(欠陥注入で赤くなること)と「正当データで赤くならないこと」の両側実測を完成条件とする | org.md Mandated + cid:code-generation:corpus-sweep-for-new-guards |
