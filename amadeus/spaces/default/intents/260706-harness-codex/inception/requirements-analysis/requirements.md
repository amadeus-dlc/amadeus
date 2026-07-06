# Requirements — 260706-harness-codex（Issue #552 Phase 1）

## Intent 分析

Amadeus には Codex 対応物（skill 別 `agents/openai.yaml`）の置き場がない（[intent-statement.md](../../ideation/intent-capture/intent-statement.md) の Problem 2）。本 Intent は三層化の設計確定（feasibility で完了、Q1〜Q6 の 5/5 一致）を踏まえ、Phase 1 = `harness/codex/` の新設と上流 openai.yaml 群の適応取り込みを実装する。スコープは [scope-document.md](../../ideation/scope-definition/scope-document.md) の in/out 表、実施規範は [team-practices.md](../practices-discovery/team-practices.md) に従う。

コードベース文脈（codekb）: 運用モデル（Issue 起点、merge は人間、installer 配布）は [business-overview.md](../../../../codekb/amadeus/business-overview.md)、promote / parity の seam は [architecture.md](../../../../codekb/amadeus/architecture.md)、skills / dev-scripts の配置は [code-structure.md](../../../../codekb/amadeus/code-structure.md) を参照した。

## 機能要求

### FR-1: 上流取得と純正性検証（backlog P1-1）

- FR-1.1: 上流 awslabs/aidlc-workflows の基準 commit b67798c3 を fresh clone で取得する。
- FR-1.2: `dist/codex/.agents/skills/aidlc-*/agents/openai.yaml` 全件（38 件）の内容を照合し、前提 A-1（全 skill 同内容 guard = `policy: allow_implicit_invocation: false`）を検証する。相違があれば記録し、取り込み内容を上流実体に合わせる。

### FR-2: 写像表の作成（backlog P1-2）

- FR-2.1: 上流 38 skill → amadeus skill の写像表を `harness/codex/provenance.md` に作成する。写像は parity-map の skillNameMapping を正とする（nameMappings はパス写像であり skill 名写像には使わない）。
- FR-2.2: 上流対応のない amadeus 独自 skill は取り込み対象外として表に明記する（scope-definition Q1 = A）。

### FR-3: source skills への openai.yaml 追加（backlog P1-3）

- FR-3.1: 写像表の対象 skill について `skills/amadeus-<name>/agents/openai.yaml` を追加する。内容は上流実体に rename 契約（aidlc-* → amadeus-*、/aidlc → /amadeus）を適用したもの。guard 内容自体に名称が含まれない場合は上流と同一になる。
- FR-3.2: 各 yaml の冒頭に provenance コメント（上流 path、基準 commit、写像、guard の意味）を付す（questions Q1 = A）。

### FR-4: harness/codex/ の新設（backlog P1-4）

- FR-4.1: `harness/codex/README.md` を新設し、ハーネス契約（Codex の skill 発見規則 = `.agents/skills/`、openai.yaml の役割）、Phase 1 時点の役割（契約 + provenance 置き場）、Phase 2 で差分層ソースがここへ正準化される予定、言語の再判定条件を明記する。
- FR-4.2: `harness/codex/provenance.md` に取り込み記録（基準 commit、写像表、適応規則、再取り込み手順）を置く。
- FR-4.3: 文書は日本語で書く（questions Q2 = A）。

### FR-5: promote 昇格（backlog P1-5）

- FR-5.1: 対象 skill 全件を `dev-scripts/promote-skill.ts --replace` で昇格し、`.agents/skills/amadeus-*/agents/openai.yaml` へ反映する。
- FR-5.2: `npm run test:it:promote-skill` の pass を記録する。

### FR-6: 検証（backlog P1-6）

- FR-6.1: `npm run test:all` と validator（Intent 指定込み）が pass する。
- FR-6.2: `npm run parity:check` が pass し、openai.yaml が parity の検査対象に乗らないこと（checkSkills = dir 存在確認のみ）を結果で確認する。
- FR-6.3: skill-language-policy.md は `agents/openai.yaml` を英語必須の対象表に含む（適用規則 =「SKILL.md の frontmatter description を変更した場合に、必要に応じて更新する」）。本 Intent が追加する yaml は guard のみで description 由来の記述を含まず、SKILL.md も変更しないため、この同期義務が発火しないことを確認し記録する（engineer5 提案の受け入れ条件の正確化。reviewer iteration 1 指摘 1 による是正）。
- FR-6.4: rename-leftovers eval が pass する（取り込みで旧名 aidlc 表記を持ち込まない）。
- FR-6.5: rename-leftovers の scanRoots に `harness` を追加する（allowlist.json のデータ宣言 1 行）。現状の scanRoots は harness/ を含まず、FR-4 の新設 2 文書が旧名検出の対象外になるため。検出器のデータ追従は #553 の移設 3 点セット（原子的 commit + 写像宣言 + 検出器追従）の規範に従う最小変更であり、NFR-3 の対象（promote / build 機構の変更禁止）には含めない（reviewer iteration 1 指摘 2 による確定）。

## 非機能要求

- NFR-1（再現性）: 取り込みは再実行可能な手順として provenance.md に記録し、Phase 2 の build 化（再生成 CI 検証）に接続できる形にする。
- NFR-2（純正性）: FR-1 の fresh clone 照合結果（一致 / 相違）を成果物に記録する（#541）。
- NFR-3（最小変更）: 既存 tooling の機構（promote-skill / parity-check / build 経路）を変更しない（設計確定 Q3 = A の趣旨 = build 化の先行着手禁止）。検出器のデータ宣言追従（FR-6.5 の scanRoots 1 行）は #553 規範に基づく例外として明示的に許容する。

## 制約

constraint-register の C-1〜C-9 に従う（Phase 分割、rename 契約、純正性検証、基準 commit、接触面確認済み、人間 merge、検証記録、台帳表現、promote 規律）。

## 前提

- promote の alwaysAllowedDirs に "agents" が実在（実測済み）。
- parity checkSkills は skill 内ファイルを照合しない（実測済み。将来検査が強化された場合は provenance.md が宣言の根拠になる）。
- 上流 openai.yaml は guard 内容（A-1）。FR-1.2 で最終検証する。
- skill-forge 由来の openai.yaml（`interface.display_name` 等を含む別形式）が `skills/amadeus-grilling/agents/` と `skills/amadeus-domain-modeling/agents/` に既存する。両 skill は上流対応のない独自 skill（parity-baseline の 38 skill 一覧に不在 = reviewer 実測）であり、scope-definition Q1 = A により本 Intent の取り込み対象外。既存 yaml には触れない。

## スコープ外

scope-document のスコープ外表 5 項目（Phase 2、emit.ts / hooks adapter、独自 skill への付与、Codex 実挙動検証、team.md 粒度制約変更）。

## 未解決事項

- 上流 38 skill のうち amadeus に対応 skill がないもの（あれば）の扱い: 写像表作成（FR-2）時に確定し、取り込み対象外として記録する。

## 受け入れ条件

| 受け入れ条件 | 対応要求 |
|---|---|
| harness/codex/ が新設され、契約 README と provenance（写像表込み）が存在する | FR-4、FR-2 |
| 上流対応 skill に openai.yaml が追加され、promote で昇格済み | FR-3、FR-5 |
| 純正性検証（fresh clone 照合）の結果が `harness/codex/provenance.md` に記録されている | FR-1、FR-4.2、NFR-2 |
| validator / test:all / parity:check / rename-leftovers（scanRoots へ harness 追加後）が pass し、yaml について parity 非照合の確認と言語方針の同期義務が発火しないことの確認が記録済み | FR-6（6.1〜6.5） |
