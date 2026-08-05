# NFR Design: セキュリティ設計 — U5 authoring-stage-e2e

上流入力(consumes 全数): 本 unit の解決済み consumes は U5 functional-design の成果物(`business-rules.md` / `domain-entities.md` — spec kind のため `business-logic-model.md` は FD 非該当で不在)。`security-requirements` / `tech-stack-decisions` は nfr-requirements SKIP による expected-absent(設計どおりの欠落 — 内容を発明しない)。

## 守る資産と工程の真正性

U5 が守る資産は **authoring 工程の人間統制**(FR-009 — 独立レビューと人間ゲートの非代替性)と **E2E 検証の実質性**(FR-012/AC-007 — 部分経路 green への丸め込み防止)。stage 文書 + fixture という成果物性質上、実行時の攻撃面は工程規律そのものである。

| 資産 / 脅威 | 対策(`business-rules.md` の確定設計の NFR 面) |
|---|---|
| reviewer による成果物改変・工程操作 | 独立レビューは read-only 許可(Read/Grep/Glob 相当)のみでディスパッチし、engine 操作・成果物書込・Git 操作を持たせない(BR-U5-03 — `memory/project.md` の read-only サブエージェント規律) |
| 自己レビュー(作成主体 = レビュー主体) | ReviewReceipt.modelAuthor の記入を省略不能にし、U4 が登録点で reviewer ≠ modelAuthor を検査(BR-U5-04) |
| 人間ゲートの空洞化(receipt での代替) | いかなる receipt・レビュー結果も人間承認の代替にならない(BR-U5-05)。承認は実 HUMAN_TURN provenance から構成され、U4 が二重照合 |
| referee failure の握り潰し | typed failure は全数を人間へ提示して halt — 成功へ暗黙変換しない(BR-U5-02) |
| E2E の実質基準の免責による空洞化 | スタブ承認は U2(BR-U2-24)/ U4(BR-U4-15)の provenance 偽装負例テストの red 実証を前提とし、免責で実質基準を代替しない(BR-U5-11 の owning test 名指し) |
| E2E の配布契約バイパス(canonical 直実行での代替) | E2E は composed runtime で実行し missing import ゼロを実測(BR-U5-09 — `requirements.md` §2.4 の配布契約違反として失敗させる規定) |
| fixture 経由の工程汚染 | 題材 fixture は U1 の見出し駆動文法で抽出可能な要求断片に限定(BR-U5-10)— fixture が判定系へ恣意的トークンを混入させる経路を文法で閉じる |

本表のスコープは FR-009/FR-012 の工程統制点に限定する(0 件判定の根拠と同じ — proof evidence 自体の完全性脅威は U3 の所有面)。隣接脅威である ReductionManifest の vacuity witness / declaredIdentity 欠落(BR-U5-06 — U3 が missing として拒否)は本表の対象外だが、code-generation では BR-U5-14 の fail-closed 2 系の候補にこの経路(witness 欠落 manifest での referee halt)を含めて検討する(§12a FOLLOW-UP の申し送り)。

## 権限・攻撃面

- U5 の成果物(stage 文書・fixture)は実行コードを持たず、新規のネットワーク経路・秘密情報・権限はゼロ。
- stage 文書が規定する各工程の実行主体の権限は最小: reviewer = read-only、referee(U3)= 評価のみ、store(U1)= evidence 書込のみ、committer(U4)= model-map 書込のみ — 工程内の全書込面が単一所有(`services.md` 系の書き手単一化を stage 手順が保存)。
- E2E fixture の swarm unit-pool 題材は既存 `amadeus-swarm.ts` の読取参照であり、実 pool 状態への書込を伴わない。

## 検証可能性(NFR-006)

- E2E は正常(全経路)+ fail-closed 2 系(referee failure halt / 承認欠落の登録拒否)を最低構成とする(BR-U5-14)。
- 合否実測の受け入れ主体は build-and-test stage(BR-U5-12)— U5 は判定を所有せず、判定の偽装面を持たない。

## 上流トレーサビリティ

- `construction/authoring-stage-e2e/functional-design/business-rules.md`(BR-U5 群)、`domain-entities.md`(stage 文書構造契約・E2eFixture)
- `inception/requirements-analysis/requirements.md`(FR-009、FR-012、AC-007、§2.4、NFR-003、NFR-006)
- `nfr-design-questions.md`(0 件判定、人間承認 2026-08-04T22:52:32Z)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T23:16:09Z
- **Iteration:** 1
- **Scope decision:** none

security-design.md はspec kind成果物として比例した内容でFR-009/FR-012の4統制点をBR-U5引用ともども漏れなく反映しており0件判定も妥当

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260804-tla-authoring/construction/authoring-stage-e2e/nfr-design/security-design.md:§守る資産と工程の真正性 — 脅威表はFR-009/FR-012の4統制点(read-only reviewer・自己レビュー排除・人間ゲート非代替・composed runtime実測・fixture文法限定)を網羅する一方、BR-U5-06(ReductionManifestのvacuity witness/declaredIdentity欠落=proof evidence改竄)はNFR-003 fail-closed reliabilityと直結する隣接脅威であるにもかかわらず対象外と明示されていない。スコープをFR-009/FR-012に限定した根拠(質問票の0件判定理由)を本文にも一言明記すると、code-generation着手時にBR-U5-06系のfail-closedパスをE2E最低2系(BR-U5-14)の候補から漏らさない助けになる。
