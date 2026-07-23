# Unit of Work — チーム機能のコア昇格

> 上流入力(consumes 全数): components、component-methods、services、component-dependency、decisions、requirements(本文で参照)

Unit 分割は AD コンポーネント C1〜C7 の依存(component-dependency.md)と編集面の凝集から機械的に導出した(質問0問 — 既決の機械的適用)。C3 は C2 依存の選挙面として U2 へ、C5 は C4 依存の小粒として U3 へ凝集。

## U1: boundary-guard(配布境界ガード基盤)

- **対応**: C1(FR-5)
- **内容**: scan 述語(純関数 `scanDistributionTreeForScriptsRefs` — unit 層)+実 FS 走査(integration 層)+allowlist+**fixture ベースの落ちる実証**(scripts/ 参照を含む fixture で赤を実測 — FR-5b)+移動元残置の**重複不変量検査**(scripts/ と配布正本の同名資産の同時実在を禁止する generic assert — 固定リスト・マニフェスト不要、AD components.md C1 の是正済み方式。live tree への適用は corpus sweep で偽赤 0 を確認)
- **推定規模**: 140〜200 行(components.md C1 の 120〜180+重複不変量 assert ~20 — 機械計算 120+20=140 / 180+20=200)
- **受け入れ骨子**: fixture 赤の実測記録、live corpus sweep 偽赤 0、既存 CI(--ci)同乗
- **重要制約**: live tree の SKILL.md 層またぎ(scripts/ 参照)が U2 着地まで現存するため、**live-tree 検査の enforcement は U2 と同一 Bolt で有効化する**(delivery-planning で Bolt 同乗を拘束 — 単独マージで CI を赤にしない)

## U2: election-promotion(選挙エンジン+スキル昇格)

- **対応**: C2+C3(FR-1、FR-2)
- **内容**: 選挙5ファイルの git mv(scripts/ 側削除)+import 1行修正(election.ts:46 → `./amadeus-norm-metrics`)+t234〜t244 のパス追随+スキル移動(contrib → core skills/)+SKILL.md 書き換え({{HARNESS_DIR}}/tools 形+compatibility 行)+配線2点(claude manifest coreDirs / codex emit :338)+ADR-1/ADR-3 の実装+U1 live 検査の green 化(残置は重複不変量が自動検出 — マニフェスト拡張なし)+4面(cursor/kiro/kiro-ide/opencode)への skills 不在の機械確認+dist/self-install 再生成
- **推定規模**: 移動 1,761+SKILL ~140+修正・配線・テスト追随 ~60
- **受け入れ骨子**: FR-1a〜1e/FR-2a〜2d の全数、U1 ガード green、dist:check / promote:self:check exit 0

## U3: team-launcher-promotion(チーム起動系配布+doctor)

- **対応**: C4+C5(FR-3、FR-4、FR-8)
- **内容**: team 3ファイルの git mv(scripts/ 側削除)+パス導出修正(team-up.sh:57 等)+`require_prerequisites()` 新設(herdr/agmsg PATH 検査 exit 1+OS 検査)+doctor advisory 節(検出関数は in-process seam で export — NFR-3)+既存テスト(t-team-msg / t-team-up-* / t245)の green 維持+dist/self-install 再生成(残置は U1 の重複不変量が自動検出)
- **推定規模**: 移動 2,059+検査追記 ~40+doctor ~30〜60
- **受け入れ骨子**: FR-3a〜3e/FR-4a〜4b/FR-8a〜8c の全数、Should 面の既存テスト green(新規 E2E 保証なし)

## U4: clean-env-e2e(クリーン環境 E2E)

- **対応**: C6(FR-6)
- **内容**: tests/e2e/ serial テスト新設(fake herdr/agmsg+temp HOME+self-install ツリー合成)— happy path(起動→送信→選挙完走)+不在分岐(herdr/agmsg/OS)+doctor advisory 分岐。lcov DA 到達確認
- **推定規模**: 250〜400 行
- **受け入れ骨子**: FR-6a〜6c の全数(component-methods.md C6 のケース表を網羅)

## U5: team-mode-docs(docs)

- **対応**: C7(FR-7)
- **内容**: docs/guide/20-team-mode.md(en/ja)新設+harness-engineering への3層配置規約追記+prerequisite 節(公式入手先3リンク+動作確認バージョン)+Windows 対象外明記+既存 docs 参照整合ガード green
- **推定規模**: en/ja 計 400〜700 行
- **受け入れ骨子**: FR-7a〜7d の全数(FR-7c の合否基準 = 公式入手先参照の実在)

## 補足

- PU-6(バリエーション維持 — Should)は U3 の「既存テスト green 維持」受け入れに吸収(独立 Unit を立てない — 新規実装ゼロのため)
- 全 Unit 完了後の横断検証(NFR-1 の全コマンド再実行)は build-and-test ステージが担う

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T02:55:01Z
- **Iteration:** 1
- **Scope decision:** none

Critical1: U3→boundary-guard 辺は AD C-graph の転写でない新規依存(転写と誤表示)。Major2: 共有残置マニフェストの挿入衝突リスク vs 非交差宣言の矛盾。Minor3: U1 規模下限 150→160 の計算誤り。FR/NFR 全数トレース・YAML 構文・他規模数値は正確と確認

### Findings

- Critical1: team-launcher-promotion → boundary-guard 辺(dependency:14,26)は component-dependency.md:34『C1→C3のみ直列制約』と矛盾 — 転写でなく UG 新規導入の依存。AD 側 C1↔C4 関係の欠落として明示裁定が必要
- Major2: U2/U3 が同一『U1 残置マニフェスト』を拡張(unit-of-work:18,25)— shared-ledger-insert-collision 該当、非交差宣言(dependency:32)と矛盾。マニフェストの構造未記述
- Minor3: U1 規模 150〜220 の下限計算誤り(120+40=160)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:00:01Z
- **Iteration:** 2
- **Scope decision:** none

iter1 の3指摘すべて閉包確認(重複不変量方式でCritical1/Major2根治、Minor3機械再計算)。P5 3状態意味論・AD是正申告の明示性・DAG妥当性・FR/NFR全数トレース維持を確認。新規指摘なし

### Findings

- None
