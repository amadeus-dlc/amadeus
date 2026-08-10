# Phase Boundary Verification — INCEPTION → CONSTRUCTION

対象 Intent: `260810-plugin-manifest-resoluti` / Scope: `self-fix` / Depth: Minimal
検証方法: `stage-protocol-governance.md` + `.kimi-code/knowledge/amadeus-shared/verification.md`
対象 Issue: [#2823](https://github.com/amadeus-dlc/amadeus/issues/2823)(ミラー [#2829](https://github.com/amadeus-dlc/amadeus/issues/2829))

## Artifact completeness

| Stage | Required artifacts | Status |
|---|---|---|
| reverse-engineering | codekb 9 成果物 + re-scan 記録 `codekb/amadeus/re-scans/260810-plugin-manifest-resoluti.md` | Approved(xrev differential scan、副作用ゼロ) |
| requirements-analysis | `requirements.md`(FR-1〜8 / NFR-1〜3)、`requirements-analysis-questions.md`(Q1〜Q4 全回答) | 本 phase-check とともに gate へ。product-lead review READY(iteration 1、BLOCKER 0) |

self-fix scope により ideation 全 stage・user-stories / application-design / units-generation / delivery-planning は SKIP。存在しない成果物を補完しない。

## Requirements traceability

| Requirement | 一次根拠 | 検証面 | Status |
|---|---|---|---|
| FR-1 manifest 解決の多面化 | Issue #2823 完了条件2 / RE N 系(所在非対称 PROVEN) | FR-7(a) consumer-layout テスト | Traced |
| FR-2 argv plugin-root-relative 規約 | Issue 完了条件2 / RE(argv root-relative PROVEN) | FR-3・FR-7 の緑 | Traced |
| FR-3 既存 argv の規約適合 | Issue 完了条件2 / RE(`plugin.json:61`、`:925`) | FR-6 ガードと対 | Traced |
| FR-4 不在の loud 化 | Issue 完了条件2 / RE(t445:155-160 pin の存在) | FR-4 受入テスト | Traced |
| FR-5 declarationFor 系の同一規約 | クロスレビュー reviewer-2 同根指摘 / RE(`:386-419`) | FR-5 受入テスト | Traced |
| FR-6 ドリフトガード述語 | Issue 完了条件3 | ガード自体が検証面 | Traced |
| FR-7 consumer-layout 回帰テスト | RE(全既存テストが dogfood layout) | failing-first で実施 | Traced |
| FR-8 consumer 実測 | Issue 完了条件1 | build-and-test で実施・ログ残置 | Traced |
| NFR-1〜3 | #2790 設計固定 / digest 対称性 | 既存テスト群の無修正緑 | Traced |

Coverage: FR 8/8、NFR 3/3、Issue 完了条件 3/3(完了条件1=FR-8、完了条件2=Q1-A/Q2-A/Q3-A → FR-1〜5、完了条件3=FR-6)。orphan requirement 0 件。units/Bolt の概念は self-fix scope では生成されないため DAG 検証は対象外。

## Consistency checks

- 問票 Q1〜Q4 の裁定と FR の対応: Q1-A→FR-1/FR-2、Q2-A→FR-4、Q3-A→FR-3、Q4-A→FR-6 — 全一致
- #2790 設計固定との整合: 配送側 transform・composed 面への非配送は不変(NFR-3)。FR-1〜5 は読取側のみの変更で両立
- センサー: required-sections / upstream-coverage / answer-evidence / question-budget / depth-budget すべて最新火災で PASS(初期火災の 3 件 FAIL — 問票 5 問超過・承認 TS 未 parse・consumes 未参照 — は問票修正で解消し手動再火災で全 exit 0)
- reviewer 所見: BLOCKER 0。FOLLOW-UP 1 件(FR-2 の argv 区別規則の明文化 — code-generation で「path separator を含む positional 要素」規則を採用予定)、NIT 2 件

## Open issues

- marketplace 経路の staging 供給機序は未検証(RE UNMEASURED、Out of scope に明記)
- #2267 の重複 close 提案は着地後にユーザーへ委譲(本 phase の対象外)
