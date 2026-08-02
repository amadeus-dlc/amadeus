# Requirements — 用語定義の正本一本化 (#2030)

上流入力(consumes 全数): intent-statement.md、business-overview.md、architecture.md、code-structure.md

- `intent-statement.md`: 裁定7項(仕様)・成功指標・スコープ信号の正本として本書の Intent analysis / Constraints へ転記した
- `business-overview.md`: フレームワークの目的(AI-DLC の7ハーネス配布)を FR-5 の全ハーネス供給要件の背景として参照した
- `architecture.md`: 患部8面マップ・投影機構(package.ts buildTree / Step 2b 先例)・knowledge ロード経路6段・着地点候補A/B/C の実測を FR-3/FR-5/制約の根拠として参照した
- `code-structure.md`: 患部×区間 touch 判定・削除対象の消費者棚卸し(.coderabbit.yaml:83 / CONTEXT.md 孤立)・t413 空番を FR-4/FR-6/AC の根拠として参照した

## Intent analysis

ユーザーが達成したいのは「用語の意味がリポジトリ内で一意に確定する状態」である。個別の矛盾修正(Unit of Work 等)はその帰結であって目的ではない。ゴールは3層:

1. **権威の一意化**: 正本1ペア(`docs/guide/glossary.md` / `glossary.ja.md`)以外に独立した用語定義が存在しない
2. **到達の保証**: intent 実行時(全7ハーネスのステージ実行コンテキスト)でも同一定義が参照される — 現状は権威(正典を名乗る glossary)と到達性(実行時に読まれる §9 / domain-language.md)が逆転している
3. **ドリフトの機械検出**: 正本↔投影・EN↔JA の不一致が CI で検出される(現状は用語面を検査するテストが0件)

原因は bootstrap 由来(origin:bootstrap)の初期分散+裁定喪失であり、回帰ではない(#2030 改稿済み本文・クロスレビュー2名の実測)。

## Functional requirements

### FR-1: 正本の確立(語彙統合)

- FR-1a: `docs/guide/glossary.md` / `glossary.ja.md` を用語定義の唯一の正本とする。両者は同一語集合(EN/JA 行ペア、英語キーで機械照合可能)を持つ
- FR-1b: 次の語彙を正本へ吸収・昇格する(測定 ref = observed 689c38744):
  - domain-language.md のチーム固有語彙・表記規則(吸収後、同ファイルは削除 — FR-4a)
  - CONTEXT.md の self-* 4語(Self Fix / Self Feature / Self Refactor / Self Document。吸収後、同ファイルは削除 — FR-4b)
  - §9 固有6語(aidlc / component / generation / module / planning / service)【Q1=A 裁定】
  - docs/reference/04 固有4語(Approval Gate / Inline Stage / Subagent Stage / Lead Agent)【Q1=A 裁定】
- FR-1c: 実測済みの定義矛盾を正本で解消する: Unit of Work(Bolt 契約と整合する定義に統一 — 「3.1-3.7 を1回通過」は誤りで、Bolt = 3.1–3.5・3.6/3.7 は全 Bolt 完了後に1回が正)/ Guardrail(所在は memory 層 — `{{HARNESS_DIR}}/rules/` は退役済み)/ Scope 外延(硬数値「10」を count-free 化。隣接列挙原則 cid:functional-design:c3-adjacent-enum-numerals に従う)
- FR-1d: 正本に投影対象マーカーを持たせ、各投影面(§9 / docs/reference/04 Terminology / 実行文脈供給コピー)の語 subset を宣言できる(マーカーの具体様式は FD で確定。候補 (ii) HTML コメントタグが既存 `<!-- cid -->` 慣行と同型)

### FR-2: 投影の機械生成

- FR-2a: すべての投影面は正本からの機械生成とし、手書きの二重定義を全廃する。生成は `scripts/package.ts` Step 2b(renderOnboarding)と同型の「正本→レンダ→単一 transform」パイプラインに乗せる(architecture.md 実測の先例)
- FR-2b: 生成対象(最小集合): (i) 実行文脈供給コピー = `packages/framework/core/knowledge/amadeus-shared/` 配下の glossary 投影(着地点A — 執行事項、questions ファイル E-OC1 ヘッダ参照) (ii) stage-protocol §9 の表(正本 subset) (iii) docs/reference/04-stage-protocol.md / .ja.md の Terminology 節(正本 subset)
- FR-2c: シンボリックリンクを使わない。定義を持たずファイルポインタだけの用語 md を作らない(裁定5)。生成コピーは全文実体+「GENERATED — 正本は docs/guide/glossary*.md」ヘッダを持つ(ポインタのみ禁止と drift guard 付き投影の両立)
- FR-2d: `{{HARNESS_DIR}}` トークンを含む定義文は、core 投影面ではトークン形、docs/ 面では `<harness-dir>` リテラル形とする(t291 実測の既存家風に従う。変換の所有は FD で確定)

### FR-3: 実行文脈への供給

- FR-3a: 全7ハーネス(claude/codex/cursor/opencode/kimi/kiro/kiro-ide)の dist と self-install 5面へ、正本と同内容の用語が knowledge ロード順2(`{{HARNESS_DIR}}/knowledge/amadeus-shared/`)経由で届く
- FR-3b: 供給コピーは core knowledge に置くことで coreDirs(manifest:59)の既存投影に乗り、追加配線を要しない(1 core + 7 dist + 5 self = 13 ファイル同期、dist:check / promote:self:check が既存 byte-parity を保証)
- FR-3c: knowledge ロード順の変更(段の追加・削除・振り直し)は行わない — t34:310 の「>= 6 段」は現行6段でちょうど green(RE 実測)。既存段2に乗るため変更不要
- FR-3d: architecture.md が名指しした乖離 — ロード順4の `amadeus/knowledge/` は本リポジトリに実在せず、実体は `amadeus/spaces/default/knowledge/`(CLAUDE.md が等値宣言)— への対処: 本要件は供給を**経路2(core knowledge)にピン**し、経路4を供給経路として使わない。domain-language.md の吸収先も正本(docs/guide)+経路2投影であり、経路4側に新ファイルを作らない(乖離は本 intent では解消対象外の記録事項とする)

### FR-4: 旧定義面の削除

- FR-4a: `amadeus/spaces/default/knowledge/amadeus-shared/domain-language.md` を削除する。唯一の repo 消費者 `.coderabbit.yaml:83` は `docs/guide/glossary.md` / `glossary.ja.md` へ差し替える(record dir 内の9言及は append-only 記録のため不変)
- FR-4b: `CONTEXT.md` を削除する(参照ゼロ実測済み、consumer 更新不要)
- FR-4c: 削除はいずれも通常 PR の削除 diff で行い(履歴 rewrite しない)、PR レビューで削除対象の妥当性を明示確認する

### FR-5: drift guard(検証ゲート)

- FR-5a: 新規テスト(t413〜、`tests/integration/` — fs-tests-integration-first)で次を機械検証する: (i) 正本 EN/JA の用語表本体の語集合一致(英語キーで行ペアリング。JA 固有の `## 表記規則` 節・吸収後のチーム語彙節は照合対象外と明示) (ii) 各投影面の内容が正本+マーカーからの生成結果と一致(drift 検出) (iii) 正本以外の面が独立定義を持たない(禁止表現/構造の走査 — mirror-docs-contract の FORBIDDEN_CONTRACT_CLAIMS 型) (iv) symlink・ポインタのみ用語 md の不在
- FR-5b: ガードは blocking CI に載せ、**落ちる実証**を経る(正当な現状で green の述語を先に確立 → 注入で赤 → revert の1セット、corpus-sweep-for-new-guards / falling-proof-injection-one-set)
- FR-5c: slo-sli-patterns.md は統合対象外だが、(iii) の走査面に含め「正本と衝突する定義を持たない」ことのみ検査する【intent-capture Q2=A 裁定】。ドメイン用語(SLI/SLO/SLA)はフレームワーク用語と別クラスであり、目標状態の例外として本要件で明示する

### FR-6: 参照整合

- FR-6a: 件数語(「全55語」「Ten built-in scopes」等)は隣接列挙のない散文では count-free 表現へ置換する
- FR-6b: 変更で touch する文書の対語(EN/JA ペア)は同一変更で同期する(project.md Mandated)

## Non-functional requirements

- NFR-1: **決定性** — 同一の正本+マーカーから常に同一の投影が生成される(生成器に時刻・乱数を含めない)
- NFR-2: **fail-closed** — 生成器はマーカー不整合(未知マーカー・subset 宣言先の面不在・EN/JA 行ペア欠落)で loud に失敗する(Step 2b の「未解決 SLOT で throw」と同型)
- NFR-3: **既存ゲート互換** — dist:check / promote:self:check / t34(§9 見出し・6段下限)/ t174(legacy-refs)/ lint / typecheck / 既存全テストが green を維持する
- NFR-4: **TDD** — 生成器・drift guard は TDD(Red→Green の vertical slice)で実装する(tdd-default-with-narrow-exceptions。文書本文の改稿は適用外クラスだが、機械消費される正本表+マーカーは生成器のテストで検証する)

## Constraints

- 裁定7項(intent-statement 記載)は仕様であり、変更にはユーザー再裁定が必要(escalation-canonical (4))
- 供給経路は core knowledge(着地点A)— 裁定4(intent 実行時も同一定義 = 全ハーネスのステージ実行コンテキストへ供給)を満たす唯一の候補として執行(E-OC1 ヘッダ)
- 正本は `docs/` 配下のため package.ts の transform 対象外 — トークン変換の扱いは FR-2d の家風に従う
- コミットメッセージ英語・`amadeus/**/*.md` 日本語・docs は EN 正+JA 対訳の言語規約
- スコープは self-document(EXECUTE 集合は engine の compiled scope grid が正本 — 件数は本書に持たない)。units-generation は SKIP のため、code-generation は degrade 様式(construction/<slug>/code-generation/ の unit ディレクトリ配置 — degrade-scope-unit-dir-layout)に従う

## Assumptions

- A-1: 正本の表形式(`| **Term** | Definition |`)は維持され、マーカー追加は表構造を壊さない(FD で HTML コメント方式を既定候補として検証)
- A-2: 生成 md は Biome lint の対象外(md 非対応)で lint 面の追加対応は不要(RE 実測)
- A-3: 語彙昇格10語+チーム語彙吸収後も正本は単一ファイルペアで管理可能な規模(数十〜百語のオーダー)に留まる
- A-4: #2030 のクロスレビュー実測(SHA 689c38744)は患部の区間 touch=0 により本要件の根拠として有効

## Out of scope

- slo-sli-patterns.md の用語統合(検査のみ対象 — FR-5c)
- amadeus-common の method tree(stage-protocol §9 以外の節)の改稿
- 他リポジトリ・他 space への展開、mirror Issue 本文様式の変更
- 用語の意味自体の再設計(矛盾解消 FR-1c を除き、既存定義の言い換え・改善キャンペーンはしない)
- knowledge ロード順の変更(FR-3c)

## Open questions

- OQ-1(FD で確定): 投影対象マーカーの具体様式 — 候補 (ii) HTML コメントタグ(`<!-- projection: stage-protocol, docs-reference -->` 等)。表列追加 (i) と別宣言ファイル (iii) との比較は FD の ADR で行う
- OQ-2(FD で確定): §9 / docs/reference 04 の各 subset に含める語の最終リスト(Q1=A により全語彙は単一集合 — subset の切り方だけが残る)
- OQ-3(FD で確定): 生成タイミングの配置 — package.ts Step 2b 同型(ビルド時生成)か、独立スクリプト+コミット済み生成物+drift check か。dist:check との整合が判断基準
- OQ-4(CG で確定): domain-language.md のチーム固有語彙31語のうち正本の表へ入れる語と表記規則節として移す内容の最終仕分け

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-02T10:32:47Z
- **Iteration:** 1
- **Scope decision:** none

構造・網羅性・裁定反映は良好だが、供給経路の執行根拠を裁定3と誤引用(正=裁定4)する citation 欠陥が requirements.md と questions.md の双方にあり差し戻し(mechanism-cite-verify-at-draft 違反)

### Findings

- Major | requirements.md:73 | 供給経路の執行根拠「裁定3」は誤引用 — intent-statement 裁定7項の verbatim 照合で正は裁定4(intent 実行時も同一定義=全ハーネス供給)
- Major | requirements-analysis-questions.md:7 | E-OC1 判定文にも同一の裁定3誤引用
- Minor | requirements.md:76 | 「9ステージ」の出典がレビュー範囲(consumes 4件)内で確認不能
- Minor | requirements.md | architecture.md:17 が要件段でのピンを名指しした amadeus/knowledge パス乖離への明示言及なし

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-02T10:35:57Z
- **Iteration:** 2
- **Scope decision:** none

iteration1 の4指摘すべて verbatim 照合で解消確認。必須7節・上流整合・テスト可能性・裁定7項+Q1=A への無申告逸脱なし・内部整合を確認、新規指摘なしで READY

### Findings

- 確認 | requirements.md:74 | 裁定4引用が intent-statement.md:34 と verbatim 一致(iteration1 Major #1 解消)
- 確認 | requirements-analysis-questions.md:7 | E-OC1 判定文の裁定4引用一致(iteration1 Major #2 解消)
- 確認 | requirements.md | 「9ステージ」0件 = count-free 化(iteration1 Minor #3 解消)
- 確認 | requirements.md FR-3d | architecture.md:17 の乖離を明示引用し経路2固定で対処(iteration1 Minor #4 解消)
