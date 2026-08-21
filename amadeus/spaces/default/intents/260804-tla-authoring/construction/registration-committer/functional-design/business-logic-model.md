# Functional Design: 業務ロジックモデル — U4 registration-committer

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は U4(C6 — 前提全数検査 + `model-map.json` atomic replace + 既存 `formal-model-check` への handoff)のアルゴリズムを定義する。型は `domain-entities.md`、制約は `business-rules.md` を正本とする。`unit-of-work.md` U4 の境界(可視化点の所有者。evidence の生成・検証は U1/U3 の出力を消費)に従う。

## 1. commit アルゴリズム(C6.commit)

`component-methods.md` §C6 の承認済みシグネチャ `commit(entry, bundle, pre)` の実装。

```
commit(draft: ModelMapEntryDraft, bundle: VerifiedBundle, pre: RegistrationPreconditionsCandidate):
  // pre は未検証の候補(JSON parse 由来、各フィールド optional 相当)。手順 1 の通過後に
  // 承認済み非 optional 型 RegistrationPreconditions が構成される(domain-entities.md の
  // 検証前後セマンティクス — parse-don't-validate)
  1. 前提全数検査 — 6 検査を独立に実行し、失敗を PreconditionFailure のリストへ全数収集。
     1 件以上あれば RegistrationFailure { kind: "preconditions-failed", failures } で返す
     (集約 1 kind に全数を内包 — 部分報告しない。domain-entities.md § RegistrationFailure の 2 層構造):
     a. pre.applicability の route が author-new / revise-model であること(terminal 経路は登録対象外
        → precondition-missing "applicability-route")
     b. pre.coverage が CoverageProof であること(U3 C3 のブランド型 — 不在 → "coverage")
     c. pre.freshness が { kind: "current" } であること(stale → stale-evidence)
     d. pre.proof が ProofEvidence であること(不在 → "proof")
     e. pre.review.verdict が READY(不在 → "review")かつ reviewer ≠ pre.review.modelAuthor
        (ReviewReceipt が運ぶモデル作成主体 — U5 の独立レビュー段が記入。同名・空文字 →
         reviewer-not-independent)
     f. pre.humanApproval の provenance 再照合(audit shard に HUMAN_TURN 実在 —
        U2 生成時照合と独立の第 2 照合。失敗 → approval-provenance-invalid)
  2. bundle 整合: draft.evidenceBundle.digest === bundle.ref.digest であること
     (VerifiedBundle と draft の参照が同一 evidence を指す — 不一致は validator-rejected 扱いの前段拒否)
  3. draft 検証(書込前・parse-don't-validate): 現在の model-map bytes を読み(= snapshot)、
     snapshot.parsed に draft を加えた全体を拡張 validator(MODEL_KEY_SETS + evidenceBundle)で
     検証する。失敗 → validator-rejected(既存エントリを壊す draft はここで止まる)
  4. 競合検知: rename 直前に model-map を再読込し、bytes が snapshot.bytes と異なる →
     concurrent-modification で中止(retryable。読み直しからやり直す判断は呼び手)
  5. 書込: 検証済み全体を temp-file へ書き atomic rename。rename 成功のみが登録成立
  6. RegistrationReceipt を返す。以後の実行は既存 formal-model-check(S6)の責務(handoff)
```

- 手順 3 で「draft 単体」でなく「追加後の map 全体」を検証するのは、エントリ間不変量(name 重複等)を書込前に閉じるため — validator の検査単位が map 全体であることに合わせる(`services.md` § 整合性と可視化点: 読み手は map 全体の不変条件だけを信頼する)。
- **改訂ポインタ(2026-08-20)**: 本手順の「snapshot に draft を加える」append 前提は intent 260820-fmc-drift-batch(#2289)で裁定付きで改訂され、route 依存(author-new = append / revise-model = 同名置換)となった。改訂裁定と設計は `amadeus/spaces/default/intents/260820-fmc-drift-batch/construction/revise-model-commit/functional-design/business-logic-model.md` § FR-REG-6 を正とする(裁定 provenance: ユーザー実 HUMAN_TURN バッチ承認 2026-08-20 + 同 intent RA Q1=A)。
- 手順 4-5 の間に他プロセスが書く TOCTOU 窓は残る(ファイルシステムの制約)が、rename は atomic なため「壊れた map」は観測されず、後勝ち lost update の実害は手順 4 の検知窓で実用上排除する。PR ベースの直列マージが第二の防衛線(`services.md` § スケーリングと運用特性)。

## 2. validator 拡張(Q1 裁定の実装点)

`plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` への変更は次に閉じる:

```
MODEL_KEY_SETS(:214)へ evidenceBundle を含む集合を追加:
  既存 4 集合(name/model/cfg/entries ± auxiliaries ± vocabulary)は不変のまま、
  各集合 + "evidenceBundle" の 4 集合を追加(計 8 集合)
evidenceBundle の値検証: exactObject(value, ["digest"]) かつ digest は "sha256:<hex64>" 形
schemaVersion: 2 のまま(:351 の検査は不変)
```

- 既存 map(`specs/tla/model-map.json` — `FormalElection` / `MirrorLifecycle` の 2 エントリ)は evidenceBundle なしの既存集合に一致し続けるため**バイト不変で有効**(FR-013、AC-008 の回帰で固定)。
- completeness sensor(`model-completeness`)は model-map エントリの impl 対応 drift を検査する既存機構であり、evidenceBundle key の追加はその検査対象(entries の implPath × sha256)に影響しない — ただしこの無影響は実装時に sensor 実装の実読 + 既存 2 モデルへの sensor 発火 green で実測確定する(`business-rules.md` BR-U4-12)。

## 3. CLI 面(`tla-authoring.ts commit`)

`unit-of-work.md` U4 の CLI 契約と `component-methods.md` § 共通規約(JSON 1 行 stdout、exit 0/1/2)に従う。

| サブコマンド | 入力(argv) | 出力 |
|---|---|---|
| `commit --draft <json-path> --bundle <digest> --preconditions <json-path>` | draft + 検証済み bundle 参照 + 前提束 | RegistrationReceipt または RegistrationFailure |

- CLI は bundle digest を受けて U1 `bundle verify` を内部で呼び、`VerifiedBundle` を得てから `commit` 純関数層へ渡す(verify を通らない経路を CLI 面に作らない)。
- 純関数層(前提検査・draft 検証・競合判定)と I/O 層(map 読み書き・rename)を分離し、純関数層は in-process seam で unit test する(`memory/project.md` cid:code-generation:c2-doctor-seam 系規律)。

## データフロー(U4 視点)

```
applicability receipt(U2)+ CoverageProof / ProofEvidence(U3)+ ReviewReceipt / HumanApprovalRef(U5 の stage 手順)
      │                          VerifiedBundle(U1 C4.verify)
      ▼                                   │
C6.commit(前提全数検査 → draft 全体検証 → 再読込競合検知 → temp + atomic rename)
      ▼
model-map.json(evidenceBundle 参照付きエントリ)──→ 既存 formal-model-check(S6、無変更)が実行
```

## 上流トレーサビリティ

- `unit-of-work.md`(U4 責務・CLI 契約・実装注意)、`unit-of-work-story-map.md`(FR-010/FR-013 主担当、AC-001 登録拒否面 / AC-008)
- `requirements.md`(FR-007、FR-009、FR-010、FR-013、AC-008、NFR-001〜NFR-003)
- `components.md` §C6、`component-methods.md` §C6/§共通規約、`services.md` §S3/§整合性と可視化点
- `functional-design-questions.md` Q1 裁定(人間承認 2026-08-04T19:08:57Z)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T19:17:11Z
- **Iteration:** 1
- **Scope decision:** none

commitアルゴリズムのvalidator拡張とmodel-map atomic replaceは整合するが、reviewer独立性検査の比較基準が未定義でFR-009を実装不能にし、precondition検査の「全数収集して返す」宣言がRegistrationFailureの単一kind判別ユニオンと構造的に矛盾する2件のBLOCKERがある。

### Findings

- BLOCKER | business-logic-model.md §1(e) / domain-entities.md §RegistrationPreconditions — reviewer独立性検査(FR-009)の比較対象「モデル作成主体」を指す実データが存在しない。business-logic-model.md は `pre.applicability.judgedBy / authoring 成果物の作成主体と別名` と「/」で二択を残すが、`pre.applicability.judgedBy` は C1 の適用判定主体(RA工程での判定者)であり、C7 authoring 経路の実際のモデル作成主体とは概念が別。ReviewReceipt・RegistrationPreconditions・ApplicabilityReceipt のどの型にも「モデル作成主体」を保持するフィールドが存在せず、実装者はどの値をどう取得して比較するか architect へ問い直さない限り書けない。
- BLOCKER | business-logic-model.md §1 / domain-entities.md §RegistrationFailure — 「前提全数検査(欠落・不成立を全数収集してから返す — 部分報告しない)」という明示規約が、RegistrationFailure の単一 discriminated union(1呼出し1 kind)構造と両立しない。6前提のうち freshness の不成立は kind:"stale-evidence"、review の非独立は kind:"reviewer-not-independent"、humanApproval provenance失敗は kind:"approval-provenance-invalid"、それ以外は kind:"precondition-missing" と4つの異なるkindへ分岐するため、例えば coverage欠落とfreshness stale が同時発生した場合、どちらか一方しか返せず「部分報告しない」を満たせない。優先順位付けか集約表現(複数kindを内包する型)のいずれかを明示しないと実装できない。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T19:23:29Z
- **Iteration:** 2
- **Scope decision:** none

両BLOCKERの構造は解消されたが、正本と宣言されたbusiness-rules.mdのreviewer独立性判定の空文字条件がdomain-entities.mdより弱く、FR-009ゲートに空modelAuthorのバイパス余地が残る新規BLOCKERがある。

### Findings

- BLOCKER | business-rules.md:BR-U4-10 — 「reviewerがpre.review.modelAuthorと同名または空文字」という文言はreviewerフィールドの空文字のみを条件にしており、modelAuthorが空文字かつreviewerが非空・不一致のケースを捕捉しない。domain-entities.md:26は同じ判定を「同名・いずれかが空文字なら reviewer-not-independent」と明記しており、この規則の唯一の正本と宣言されたbusiness-rules.md(business-logic-model.md:5)の文言だけを実装根拠にすると、空のmodelAuthorが独立性検査を素通りしうる — iteration 1 BLOCKER-1が閉じようとした独立性ゲートの一変種のバイパスを再導入する。
- FOLLOW-UP | domain-entities.md:67 / business-logic-model.md:24-25 / business-rules.md:25-28 — PreconditionFailureのprecondition和集合に'human-approval'が含まれるが、humanApprovalの失敗は常にapproval-provenance-invalid kindへ経路づけられ(business-logic-model.md手順1(f)、BR-U4-11)、BR-U4-08の該当precondition列挙にも'human-approval'は現れない。precondition:'human-approval'はアルゴリズム上到達不能な判別子であり、実装者・テスト作成者を混乱させる。
- FOLLOW-UP | component-methods.md:148-155(承認済み型) / business-logic-model.md §1(a)-(f) — RegistrationPreconditionsの各フィールド(review/coverage/proof/humanApproval等)は非optionalなReviewReceipt等の必須型として承認済みだが、commitアルゴリズムは各前提の「不在」を検査してprecondition-missingへ分岐する。`commit(pre: RegistrationPreconditions)`が受け取る`pre`がTS型どおり検証済み・全フィールド具備の値なのか、未検証の候補オブジェクト(検証前はPartial相当)なのかが本書からは判別できず、iteration 1から未解消のまま持ち越されている。

## Review — Iteration 3

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T19:29:41Z
- **Iteration:** 3
- **Scope decision:** none

残余3件の閉包確認: reviewer独立性判定文言の一致・到達不能値human-approvalの除去・commit入力セマンティクスの一貫記述をいずれも実読で確認し矛盾なし

### Findings

- None
