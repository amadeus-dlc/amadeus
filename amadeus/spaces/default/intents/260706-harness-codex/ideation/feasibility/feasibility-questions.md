# Feasibility Questions — 260706-harness-codex（三層化の設計論点）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)（Issue #552 の 3 問題と Phase 1 範囲）。
Issue #552 の設計論点 5 件 + Phase 1 固有の配置 1 件を扱う。全メンバー同報ピア協議（期限 15 分・回答 1 件成立）で確定する。

前提実測（engineer4、2026-07-06）:
- 上流 b67798c3 の `harness/codex/` = dot-gitignore、emit.ts（Codex packager）、hooks/aidlc-codex-adapter.ts、manifest.ts、onboarding.fills.ts、skills/aidlc/{SKILL.md, question-rendering.md}。
- 上流 `dist/codex/.agents/skills/aidlc-*/agents/openai.yaml` = 38 件の生成物。内容は guard（`policy: allow_implicit_invocation: false`）。
- 上流の Codex は skill を `<project>/.agents/skills/` で発見する（emit.ts 冒頭コメント）。
- 当方 `dev-scripts/promote-skill.ts` の alwaysAllowedDirs は ["references", "scripts", "assets", "templates", "agents"] であり、`skills/amadeus-*/agents/` は promote 対象に含まれる。promote は skill ディレクトリを丸ごと置換する。

## Q1. core/ 配下の粒度（Phase 2 の設計確定）

- A. 上流 core 直下構成に合わせ、amadeus 拡張分（scopes / sensors / knowledge）も core/ 直下へ並べる（core/agents, core/amadeus-common, core/skills, core/tools, core/hooks, core/scopes, core/sensors, core/knowledge）
- B. core/ は上流対応物のみとし、拡張分は別ディレクトリに分離する
- C. 現行の .agents/amadeus/ 構成をそのまま core/ へ改名するだけにする
- D. その他
- X. Other (please specify)

[Answer]: A（上流 core 直下構成に合わせ、amadeus 拡張分も core/ 直下へ並べる）。ピア協議 2026-07-06（leader、engineer1、engineer2、engineer5 の 4/5 一致、engineer3 は #554 Construction 中）。付帯（engineer1）: Phase 2 の core/ 移設時は #553 と同じ「原子的 commit + nameMappings 拡張 + 検出器（rename-leftovers 型）の追従」3 点セットを適用する（移設系の自己破壊 3 種の実例は #553 diary）。

## Q2. 生成の方式（Phase 2 の設計確定）

- A. 生成物（dist 相当 = .agents/amadeus/ + .agents/skills/）は実体コピーを正とし、.claude/ の symlink 配線は harness/claude の配線規則として維持する（現行の混合方式を規則化）
- B. すべて実体コピーへ統一する（symlink 廃止）
- C. すべて symlink へ統一する
- D. その他
- X. Other (please specify)

[Answer]: A（生成物は実体コピー正 + .claude/ symlink は harness/claude の配線規則として維持）。4/5 一致。インストーラ grilling 確定 3（symlink 再作成）と一貫（leader 確認）。

## Q3. tooling の追従（promote-skill / parity-map / rename-leftovers eval）

- A. Phase 1 では既存 tooling を変えない（openai.yaml は既存の promote 経路に乗せるか新規追加のみとし、parity への載せ方は Q6 の配置で決まる形で宣言）。build.ts への一般化は Phase 2 で行う
- B. Phase 1 から promote-skill.ts を build.ts へ拡張し始める
- C. その他
- X. Other (please specify)

[Answer]: A（Phase 1 は既存 tooling 不変、build.ts 化は Phase 2）。4/5 一致。

## Q4. team.md 粒度制約（source と昇格先の同一 PR 規則）の扱い

- A. Phase 2 で「生成物の再生成を CI で検証」へ置き換える（Phase 1 では変更しない。設計確定として置き換え方針だけ記録）
- B. Phase 1 で先行して置き換える
- C. 置き換えない（現行維持）
- D. その他
- X. Other (please specify)

[Answer]: A（Phase 2 で「生成物の再生成を CI で検証」へ置き換え。Phase 1 は方針記録のみ）。4/5 一致。

## Q5. 移行順序

- A. Phase 1 = harness/codex/ の追加のみ（本 Intent、小、モデル移行に直結）→ Phase 2 = core 一本化 + build 化（大、#526 と同じ単独 Intent）。設計確定成果物を Phase 2 へ引き継ぐ
- B. 一括で実施する
- C. その他
- X. Other (please specify)

[Answer]: A（Phase 1 = harness/codex 追加のみ → Phase 2 = core 一本化 + build 化の単独 Intent）。4/5 一致。ディスパッチの Phase 分割判断を正式確定。

## Q6. Phase 1 の openai.yaml 配置（本 Intent の実装直結）

前提: promote は skill ディレクトリを丸ごと置換するため、.agents/skills/ へ直接置くだけだと次回 promote で消える。

- A. `harness/codex/skills/<skill>/agents/openai.yaml` を正準とし、適用スクリプトで .agents/skills/ へ実体化する（promote 非接触だが、promote --replace との競合で apply 再実行が必要になる二重管理が生じる）
- B. source `skills/amadeus-*/agents/openai.yaml` に置き、既存 promote で昇格する（alwaysAllowedDirs に "agents" 実在 = 既存 tooling で完結し promote 置換との競合を構造的に回避。promote 単位に接触するため engineer3 と要ピア確認）。`harness/codex/` はハーネス契約の README + 取り込み provenance（基準 commit、適応規則）を置く形で新設する
- C. 両方に置く（harness 正準 + source へ複製）
- D. その他
- X. Other (please specify)

[Answer]: B（source `skills/amadeus-*/agents/openai.yaml` に置き既存 promote で昇格。`harness/codex/` は契約 README + provenance 置き場として新設）。ピア協議 5/5 全員一致。接触面確認: engineer3 が #554 と非接触を確定（overlay の適用対象は engine の .agents/amadeus/agents/*.md の modelOverride 行のみ、promote-skill.ts 本体も双方不変更、merge 順序も不問）。付帯条件: ①source 側 yaml と harness/codex README に provenance（上流 dist/codex、基準 commit b67798c3、rename 写像、再生成手順）を残す（leader / engineer5）②README に「Phase 2 で差分層ソースが harness/codex へ正準化される」旨と Phase 1 時点の役割を明記（leader / engineer2）③38 件の yaml が parity / skill 言語方針の検査対象に誤って乗らないことを受け入れ条件へ（engineer5。裏付け実測: parity の checkSkills は dir 存在確認のみ = engineer2、かつ engineer4 が skills/amadeus-bugfix/agents/openai.yaml を仮置きして parity:check ok を実測 = engineer3 の検証依頼に対応）。
