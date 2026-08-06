# Security Design — `semi-docs-revision` NFR Design(#2253)

上流入力(consumes 全数): **空**(engine directive の解決済み `consumes` は空集合 — kind: spec のため business-logic-model.md は存在せず、nfr-requirements 系は scope の SKIP により設計上不在。questions ヘッダの負方向解決を参照)。設計文脈は本 Unit 自身の functional-design 成果物(business-rules.md の BR-1〜BR-10 / domain-entities.md の E1〜E5)と requirements.md の逐条照合から導出した。

本 Unit は非コードの文書改訂だが、対象文書は **autonomy 認可意味論の正本記述**である。security-design の目標は「文書が実態より緩い(または広い)認可を主張しない」ことの保証である(questions D3)。

---

## 記述面の認可安全(3 点)

| # | 守る性質 | 機構(FD の確定設計) | 検証 |
| --- | --- | --- | --- |
| S1 | **節目の人間裁定の記述保存** — walking skeleton / phase 境界 / Intent 終端が人間裁定であることを述べる行を弱めない | 保存対象の明示列挙(stage-protocol.md `:105` / `:808` + docs P 分類 12 行 — FD business-rules.md:23(BR-4)/ :49(BR-7)と diff 非出現義務。周辺編集の機械的巻き込み変更も禁止 | FD business-rules.md:115(BR-10 V3 — diff hunk 照合)+レビュー実読 |
| S2 | **過大主張の非混入** — 「phase を完走する」(FR-LAD-6)・「run_required 経路が plugin 非依存」(FR-ADV-5)・「semi が節目を自動裁定できる」(FR-LAD-5 裏面)と読める記述を書かない | 禁止語彙集合(FD business-rules.md:27(BR-5)/ domain-entities.md:67(E5)の F1〜F3)による負の拘束 | FD business-rules.md:115(BR-10 V2 — grep 補助)+レビュー実読(免責代替禁止) |
| S3 | **新意味論の正確な記述** — 改訂文は business-rules.md:98(BR-8)の内容契約 8 要素(5 段梯子 / AUTO_DECIDED / 節目人間 / grant-less / policies / human-command 由来 / 同一語彙 / 禁止語彙なし)と矛盾しない | 内容契約は「文面」でなく「命題集合」として固定(domain-entities.md:52(E4))— 起草の自由度を保ちつつ意味論の逸脱を封じる | FD business-rules.md:115(BR-10 V1 — 旧定義残存 grep)+レビュー実読 |

## 供給網(ミラー)の完全性

- 編集は canonical 1 本(`packages/framework/core/amadeus-common/protocols/stage-protocol.md`)のみ。on-disk ミラー 13 本は `bun run build` の再生成物であり、直接編集は source-only 境界(NFR-5)違反として `git status` 非 clean で機械検出される(FD business-rules.md:19(BR-3)/ :115(BR-10 V5))。
- docs は追跡ファイルの直接編集であり、日英対訳ペアの同一 PR 同期(FD business-rules.md:15(BR-2)/ :115(BR-10 V4))が「片側だけ新意味論」という記述の分裂を防ぐ。

## 秘密情報・入力検証

- 秘密情報・暗号: 該当なし(1 行理由)— 公開ドキュメントの改訂のみで、credential・個人情報・秘匿設定を扱わない。
- 入力検証の類推適用: 改訂対象の行目録は実装時に 2 キー grep で再導出し(FD business-rules.md:111(BR-9)— `cid:functional-design:inventory-from-grep-each-time`)、本 FD の目録(HEAD `5f6561eef6098209c4c29461ae0d7c6d070b5c01` 断面)を無検証で信用しない。

## 適用 NFR との対応

| NFR | 分類 | 本設計での充足 |
| --- | --- | --- |
| NFR-5(ドリフトゼロ) | **適用(本 Unit の中心契約)** | canonical 1 本編集+`bun run build` 後の追跡ファイル不変(V5)。source-only:check / 再現性検査 / グラフ不変量は NFR-7 側で走る |
| NFR-7(ゲート集合) | **適用** | PR CI のブロッキング集合を全通過(docs 改訂でも paths-ignore に依存せず全ゲートを通す — `cid:build-and-test:ci-paths-ignore-doc-guard-blindspot` の教訓により docs-consuming テストの赤を PR 内で検出する) |
| NFR-4(テスト方式) | **適用外**(1 行理由: 実行時の振る舞いを持たない文書・書式のみの変更 — team.md §Testing Posture の TDD 適用外 (1)。**適用外でも無検証にしない**: FD business-rules.md:115(BR-10)の V1〜V6 機械検査+FR-DOC-1 AC のレビュー実読を検証手段とする) | — |
| NFR-1(fail-closed 実証) | **非適用**(1 行理由: 本 Unit は認可・受理ゲートを新設・改訂しない — NFR-1 の列挙 5 ゲートはすべてコード Unit の所有) | — |
| NFR-2(監査追跡性) | **非適用**(1 行理由: 監査 journal に触れない) | — |
| NFR-3(parser 実行コスト) | **非適用**(1 行理由: parser は `launch-autonomy-flag` の所有) | — |
| NFR-6(provenance 偽装不能) | **非適用**(1 行理由: provenance 境界を持たない) | — |

NFR 全 7 件の分類の閉包: **適用 2 件(NFR-5/7)+適用外 1 件(NFR-4 — 検証手段の代替を明記)+非適用 4 件(NFR-1/2/3/6)**(questions D1 と一致)。

## セキュリティ観点の検証手段

- S1〜S3 は FD business-rules.md:115(BR-10)の V1〜V6(機械補助)+FR-DOC-1 AC のレビュー実読で固定する。grep は必要条件の検査であり十分条件はレビューが担う(`cid:requirements-analysis:exemption-clause-must-not-substitute` — 免責が実質基準を代替しない)。
- 実装 PR のレビュー観点に「保存対象行の diff 非出現」(V3)と「禁止語彙 0 hit」(V2)を機械チェックとして含める。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T12:52:07Z
- **Iteration:** 1
- **Scope decision:** none

produces/NFR分類/検証劇場/c1準拠は良好だが、Step 2 が明示要求する既決事項への file:line 引用形式を全編で満たしていない。

### Findings

- BLOCKER | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/semi-docs-revision/nfr-design/security-design.md:13-38 — nfr-design.md Step 2「In an applicable artifact, reference an established decision as `file:line`」に反し、Functional Design の既決事項(FD BR-1〜BR-10、domain-entities E1〜E5)への参照が全編で `BR-4`, `BR-5`, `BR-9`, `BR-10 V3` のような裸番号のみで、business-rules.md / domain-entities.md への file:line 形式を一度も伴わない(例: L13 `FD BR-4/BR-7`、L14 `FD BR-5 / domain-entities E5`、L15 `BR-8`、L19 `FD BR-3 / BR-10 V5`、L20 `FD BR-2 / V4`、L25 `FD BR-9`)。stage-protocol.md 自体への引用(L13 `stage-protocol.md :105 / :808`)は file:line 形式で行われており、同一文書内で書式が非対称。ステージ本文が明示するフォーマット契約への違反であり、実装者・レビュアーが既決事項を即座に照合できない。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T12:54:35Z
- **Iteration:** 2
- **Scope decision:** none

是正はほぼ完了しているが line 33 に裸番号参照 'FD BR-10' が1件残存し、Step 2 の file:line 書式契約を再び満たさない。

### Findings

- BLOCKER | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/semi-docs-revision/nfr-design/security-design.md:33 — nfr-design.md Step 2「In an applicable artifact, reference an established decision as `file:line`」に反し、NFR-4 適用外理由の記述内で「FD BR-10 の V1〜V6」が file:line 形式を伴わない裸番号参照のまま残存している。同一 Unit の他11箇所(L13/14/15/19/20/25、および同種参照である L43「business-rules.md:115(BR-10)」)はすべて file:line 形式に是正済みであり、L33 だけが iteration 1 の BLOCKER と同一パターンの未修正インスタンスとして残っている。実装者・レビュアーが本箇所の BR-10 根拠行を即座に照合できない。
