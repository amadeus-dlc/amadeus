# Business Logic Model — docs-consistency

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## B001: rollout-plan 退役の実施設計（FR-1）

1. **参照元更新（削除より先に実施）**: `skill-language-policy{.md,.ja.md}` 109 行の Related documents リンクを、到達点 1 段落へ置換する — 「段階的英語化計画（旧 rollout plan、#402）は完了し #562 で退役した。42 skill の SKILL.md は英語化済みで、日本語残存はユーザー向け質問例文・日本語出力フォーマット・テンプレートフィールド名引用の正当な維持対象 3 件だけである。検証は `grep` による日本語文字の横断走査で行い、経緯は git 履歴（`git log -- docs/amadeus/skill-englishization-rollout-plan.md`）を参照する」の趣旨（英語正 + 日本語版、FR-1.1 / FR-1.3 を兼ねる）。`aidlc-v2-reviewer-mapping{.md,.ja.md}` 81 行のリンク行は除去のみ（注記は language-policy 側へ集約、重複させない）。
2. **削除**: `git rm docs/amadeus/skill-englishization-rollout-plan.md docs/amadeus/skill-englishization-rollout-plan.ja.md`。互換 stub・アーカイブなし。
3. **検証**: NFR-1(2) のリンク切れ grep（削除後 `skill-englishization-rollout-plan` = record 外 0 件）。

## B002: Operation 記述の 2 層構造化（FR-2）

1. **overview（英日）**: 86 行の定義を「Operation は v2 の 7 ステージを持ち、実行可否は 2 層で決まる — scope（scope-grid。enterprise / feature 等は Operation ステージを EXECUTE で持つ = AMADEUS.md の CONDITIONAL 採用）と workspace steering（default space は memory/phases/operation.md により対象外で、Operation を含む scope の Intent は理由付き skip で処理する）」の趣旨へ更新。270 行の差分表行も「v2 と同じ 7 ステージを CONDITIONAL 採用。既定 workspace の steering が対象外を定める」へ更新。boundary 文書へのリンクは「対象外運用の理由と経緯」の参照先として維持。見出し文言不変。
2. **scopes（英日）**: 41 行「Because Amadeus excludes the Operation phase...」を「default space の steering が Operation を対象外にするため、Operation ステージを含む scope（enterprise / feature / infra / security-patch / workshop）は本 workspace では理由付き skip で処理される（lifecycle 契約としては v2 と同じステージ集合を持つ）」の趣旨へ、104 行の差分説明を「compiled grid の数字は v2 と同一で、差は steering 運用（Operation ステージの理由付き skip）にある」の趣旨へ更新。**注意**: scopes.md のステージ数表（bugfix 7/32 等）が scope-grid 実測と一致するかを code-generation で再実測し、数字が v2 と同一でない場合は表の実測値を正とする。
3. **operation.md（steering）**: 7 行「Amadeus 本体開発（default space）は Operation phase を対象外にしており、全 scope で Operation ステージは SKIP される（docs/amadeus/lifecycle/scopes.md）」→「Amadeus 本体開発（default space）は、この steering 自身の判断として Operation phase を対象外にする。scope-grid 上は enterprise / feature 等が Operation ステージを持つため、該当 scope の Intent では各ステージを理由付き skip（SKIP: out of Amadeus scope）で処理する」へ補正。
4. **boundary 文書（英日）**: 冒頭に位置づけ注記を追加 —「本文書は #394 時点の判断記録である。現行の実行可否は scope-grid（CONDITIONAL 採用 = AMADEUS.md）と workspace steering（memory/phases/operation.md）の 2 層で決まり、default space の対象外は steering が定める。理由節（成果物契約・gate・validator・PR 境界）は steering 判断の根拠として引き続き有効」。Decision 節の断定文 2 文（「it does not treat any stage as an execution target」「Stage Progress is always `[S]`...」）を「At the time of #394 ... 」の過去形 + 現行 2 層構造への言及へ補正（下限、FR-2.4）。「Amadeus does not add or adopt any Operation skill」も同様に #394 時点の判断として過去形化し、現行（stage-catalog に Operation 7 stage 実在）と矛盾させない。
5. **lifecycle 3 文書の同型矛盾の補正（reviewer it1 #1/#2 で検出。英日各）**: overview 197 行のツリー内コメント →「# scaffold for v2's 7 stages; run per scope-grid, default space skips via steering」/「# v2 の 7 ステージ分の scaffold。scope-grid に従い実行し、default space は steering で skip」。state 64 行 →「Operation の実行可否は scope（scope-grid）と workspace steering で決まる。default space は steering により対象外で、該当ステージは `[S]`（`SKIP: out of Amadeus scope`）で処理する」の趣旨（英日）。construction 221 行 →「Because the default space's steering keeps Operation out of scope, a human performs the deployment execution ...」/「default space の steering が Operation phase を対象外にするため、デプロイの実行は…人間が行う」。
6. **grep 機械化方針（reviewer it1 #4 で確定）**: 補正は**文字列回避方式**とする — 書き換え後の文は NFR-1(3) の対象 5 文字列（「always `[S]`」「excludes the Operation phase」「does not treat any stage as an execution target」「does not run any of its stages」「全 scope で Operation ステージは SKIP される」）を**一切含まない言い回し**にする（過去形化でも当該文字列は保持しない）。boundary 文書 Decision 節の文例: 「At the time of #394, Amadeus kept every Operation stage out of its execution scope, recording each as `[S]` (`SKIP: out of Amadeus scope`).」— 「always `[S]`」「does not treat ...」の両文字列を含まない。これにより NFR-1(3) は文脈判定なしの単純横断 grep（docs/amadeus/ + steering 対象、record 除外）= 0 件で機械的に判定できる。※ state 64 行の補正後文中の「`[S]`（`SKIP: ...`）」単体は対象文字列でない（対象は「always `[S]`」の連語）ため許容。
7. **検証**: NFR-1(3) の実文言 grep 5 種（単純横断 grep、record 除外）= 補正後 0 件。

## code-generation 向け実行順

B001（参照元更新 → 削除 → リンク切れ grep）→ B002（overview → scopes → operation.md → boundary、英日同時）→ NFR-1 の 4 検証 → validator。#568 への意味的接触は engineer5 とピア協議で決着済み（協議記録は functional-design 宛 DECISION_RECORDED を参照。guide 側の該当 = docs/guide/00-introduction{.md,.ja.md} 冒頭 1 文、本 Intent の merge 後に engineer5 が follow-up、当方は merge 後に一報する義務）。
