# Requirements：260706-docs-consistency

## Intent 分析

### 目的

docs/amadeus の 2 つの実体乖離を解消する（Issue #562 + #576 の束ね、Maintainer 承認済みディスパッチ）。達成したい状態は次の 2 点である。

1. skill-englishization-rollout-plan の位置づけが確定し、記述が実体と矛盾しない（#562）。
2. Operation phase の実行可否に関する docs/amadeus の記述が、scope-grid の実体と steering の運用に矛盾しない（#576）。

### 上流の位置づけ

- 要求の正は Issue #562 / #576 とディスパッチ定型文（reverse-engineering 宛 DECISION_RECORDED に転記済み。補足条件 = #562 は完了済みなら退役が本命、#576 は「scope-grid と workspace steering で決まる」への更新 + overview 英日 + Corrections 同旨の実測判断）である。intent-statement / scope-document は scope（refactor）により SKIP のため存在しない。
- 対象 seam の一次情報は本ステージの直接実測である。コードベース全体像は codekb（[architecture.md](../../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../../codekb/amadeus/code-structure.md)、[business-overview.md](../../../../codekb/amadeus/business-overview.md)。reverse-engineering 段で 6894aee9 まで差分更新済み）を参照した。
- 接触面: engineer5 の #568（docs/guide/）とはファイル非接触。guide が lifecycle/overview の節を参照するため、Operation 記述の変更は意味的接触として申し送る（ディスパッチ条件）。

### 実測事実（本ステージで確認）

- **#562**: skill 42 個の SKILL.md のうち日本語残存は 3 個だけで、いずれも正当な日本語維持対象である（domain-modeling 82〜84 行 = ユーザー向け質問例文、validator = 検査対象の日本語見出し名と日本語出力フォーマットの記述、grilling 140 行 = テンプレートの日本語フィールド名「反映先」の引用で validator と同型。reviewer iteration 1 の再実測で 2→3 個へ補正）。英語化（RU002〜RU006 相当）は実質完了している。rollout-plan（101 行 + .ja.md 101 行）への外部参照は 4 件（aidlc-v2-reviewer-mapping{.md,.ja.md} 81 行、skill-language-policy{.md,.ja.md} 109 行の Related documents リンク。当初の「0 件」は grep フィルタの誤りで reviewer が検出・補正）。文書自身が「計画時点の記録」注記（#523 の暫定対処）を持ち、英日併記化は同日の兄弟 Intent 260706-docs-i18n（#523、commit 7b9b77e4）で完了したばかりである。
- **#576**: scope-grid の実体は enterprise / feature / workshop が Operation 7 ステージ、infra が 4、security-patch が 2 を EXECUTE で持つ。AMADEUS.md 65 行「Operation phase（4.1〜4.7）は、本家と同じ CONDITIONAL 実行対象として採用する」が現行契約の正である。矛盾する記述は Issue 記載の overview.md L86 だけでなく、実測で次に及ぶ: overview.md L270（v2 差分表の Operation 行）、scopes.md L41「Amadeus excludes the Operation phase」と L104（7 Operation stages を除外と説明）、`memory/phases/operation.md` L7 の根拠引用（「全 scope で SKIP される（docs/amadeus/lifecycle/scopes.md）」— default space の対象外は steering 自身の判断であり、lifecycle 契約を根拠にするのは誤り）。`aidlc-v2-operation-phase-boundary.md` は「対象外の理由」を Issue #394 の判断として定義する文書で、overview / scopes から参照されている。project.md 自体に Operation 言及はない（Issue 記載の「project.md の Corrections」は実測で `memory/phases/operation.md` の記述が該当）。

## 機能要求

### FR-1: rollout-plan の退役（#562）

- FR-1.1: 英語化の完了状況（42 skill 中、日本語残存は正当な維持対象 3 件のみ）を退役の根拠として記録する。#523（260706-docs-i18n）で英日併記化が完了した直後の成果物を退役させる経緯も明記する（英日化は英語化 Issue 群の機械的完遂であり、#562 の位置づけ確定はその後段の判断として整合する）。
- FR-1.2: `docs/amadeus/skill-englishization-rollout-plan.md` と `.ja.md` を削除する。互換 stub・アーカイブファイルは置かない（backward-compatibility ルール。歴史的経緯は git 履歴で参照可能）。参照元 4 ファイル（aidlc-v2-reviewer-mapping{.md,.ja.md} 81 行、skill-language-policy{.md,.ja.md} 109 行）の Related documents リンクを除去または「退役済み（#562、git 履歴参照）」の注記へ更新し、デッドリンクを残さない。
- FR-1.3: 完了済み計画の到達点（英語化完了の事実と検証コマンド）を残す必要があるかを設計段で判断し、必要なら skill-language-policy.md への 1 段落（git 履歴参照付き）に限定する（新文書は作らない）。

### FR-2: Operation 記述の実体整合（#576）

- FR-2.1: `docs/amadeus/lifecycle/overview.md` L86（Operation の定義行）と L270（v2 差分表の Operation 行）を「Operation の実行可否は scope（scope-grid）と workspace steering で決まる。default space は steering（memory/phases/operation.md）により対象外で、Operation を含む scope の Intent は理由付き skip で処理する」の趣旨へ更新する。英語 + `.ja.md` の両言語で同内容にする（#575 後の言語方針）。
- FR-2.2: `docs/amadeus/lifecycle/scopes.md` L41 / L104 の「Amadeus excludes the Operation phase」前提の記述を、scope-grid 実体（enterprise / feature / workshop = 7、infra = 4、security-patch = 2 の Operation ステージを含む）と整合する記述へ更新する。英日両言語。
- FR-2.3: `amadeus/spaces/default/memory/phases/operation.md` の根拠引用を補正する（「全 scope で SKIP される（docs/amadeus/lifecycle/scopes.md）」→ 対象外は default space の steering 判断自身であることを明示。lifecycle 契約への誤った根拠委譲を解消）。
- FR-2.4: `aidlc-v2-operation-phase-boundary.md` の位置づけ（歴史的判断 #394 の記録としての注記か、steering 判断への移行の明記か）を設計段で実測判断し、参照元（overview.md 英日からのリンク。scopes.md からのリンクは実測でなし）の更新と一体で決める。下限（位置づけの決定にかかわらず必須）: 同文書「Decision」節の「it does not treat any stage as an execution target」「Stage Progress is always `[S]`」等の断定文を、scope-grid 実体と矛盾しない表現へ補正する（これを行わないと FR-2.5 を満たせない）。
- FR-2.5: 更新後の記述は AMADEUS.md 65 行（CONDITIONAL 採用）・scope-grid・steering の三者と矛盾しないこと（受け入れの実測基準）。

## 非機能要求

- NFR-1: 受け入れは決定論的に検証する。(1) `npm run test:all` pass。(2) リンク切れ検出: 削除後に `skill-englishization-rollout-plan` の横断 grep = 0 件（record 内の歴史的言及は除外）。(3) Operation 矛盾表現の横断 grep は対象文書の実文言ベースで行う（「always `[S]`」バッククォート込み表記、「excludes the Operation phase」、「does not treat any stage as an execution target」、「does not run any of its stages」、operation.md の「全 scope で Operation ステージは SKIP される」）= 補正後 0 件（歴史的判断の明示注記内は除く）。(4) validator pass。
- NFR-2: docs/amadeus の変更は英語正 + `.ja.md` 併置で両言語同内容。見出し文言は変更しない（docs/guide のアンカー参照保護。#568 への意味的接触は leader へ申し送る）。

## 受け入れ条件（Issue 由来）

| 条件 | 由来 | 検証 |
|---|---|---|
| rollout-plan の位置づけ（退役）が確定し、記述が実体と矛盾しない | #562 | FR-1（削除 + 根拠記録）、横断 grep で参照 0 件維持 |
| overview（英日）の Operation 記述が scope-grid 実体と steering 運用に矛盾しない | #576 | FR-2.1 / FR-2.5 |
| scopes.md ほか同旨記述も整合する（実測で判明した追加対象） | #576 の受け入れ条件の趣旨 | FR-2.2〜2.4 |
| `npm run test:all` pass | 標準 | NFR-1 |
