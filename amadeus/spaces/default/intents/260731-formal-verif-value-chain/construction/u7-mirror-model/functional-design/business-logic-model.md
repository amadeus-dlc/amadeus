# Business Logic Model — u7-mirror-model

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

u7 は mirror lifecycle の TLA+ モデル(FR-C3、components.md C8)・model-map v2 スキーマ(decisions.md 設計注記)・モデル工程文書(FR-C1/C2、components.md C9)を作る Unit(unit-of-work.md の u7)。story-map の「新規プロトコルにモデルが供給され検証が回る(二層検証ノルムの実行可能化)」に対応。

## モデルの構成(component-methods.md C8 の操作面を具体化)

### T1: 状態変数

- `receipts`: 関数 [ReceiptId -> ReceiptState]、ReceiptId は 1..MaxReceipts(ADR-3: MaxReceipts=3)
- `issueNumber`: {Null, Issue1}(存在有無の2値で十分 — 重複 create の検査に番号の多様性は不要)
- `boundarySeq`: ADR-3 の4種(intent-initialized / intent-capture-approved / phase-verified / workflow-completed)の列。parked/manual は初版スコープ外(縮約で消える性質として .tla コメントへ明記 — finite-exploration-not-detected-proof)

### T2: 遷移(実装 reducer のガード述語4本の翻訳)

prepare / mark-attempted / claim-create-attempt / complete / mark-pending / mark-safety-blocked / retry-after-no-effect / claim-observed-retry / **abandon-attempt**(reviewer iteration 1 Finding 2 の是正 — reducer :97 の transition kind)の9遷移 — amadeus-mirror-state-reducer.ts の guardMarkAttempted / guardClaimCreate / guardRetryNoEffect / guardObservedRetry(:692-715)と reduceAbandon の不変条件(:716-742 — succeeded/terminal の abandon 不可・operationId 一致・repair digest 一致)を TLA ガードへ翻訳。receipt status 7値・effect 3値・operation 3値は全数保持(RE 実測ドメイン)。

**遷移縮約の申告(Finding 3 の是正)**: 実装の transition は 21 種(RE 実測)だが、モデル化は上記 receipt-lifecycle 系 9 種に限定する。除外する 12 種(set-warning / set-global-warning / clear-global-warning / set-expected-prompt / consume-expected-prompt / repair-link / issue-repair-challenge / complete-with-project-sync-hold / skip-for-event 等の補助遷移)は、**repair-link を除いて** receipt の status・operation・issueNumber を変更しない付随フィールドの更新であり、2 invariant(close の enable 条件・create の enable 条件)の状態空間と独立 — この論拠を .tla 冒頭コメントに BR-U7-2 の縮約申告として全数明記する。

**repair-link の除外根拠の訂正(実装時の実測)**: 当初この一括論拠に repair-link を含めていたが、実装は `issueNumber: t.issueNumber` を代入する(amadeus-mirror-state-reducer.ts:690)ため「issueNumber を変更しない」は事実誤り。除外は成立するが根拠が異なる — transition 型が `issueNumber: number` を宣言する(同ファイル :109)ので repair-link は issueNumber を必ず非 Null 値へ書き、Null へ戻すことはない。本モデルの抽象ドメイン {Null, Issue1}(R3)では効果が Null → Issue1 か Issue1 → Issue1 に限られ、前者は complete(create) 経由で既に到達可能な遷移であるため抽象状態を増やさず、create を再び enable することもない。加えて repair-link は operator 発行の repair challenge と plan digest の背後にあり(amadeus-mirror-repair.ts:250 consumeRepairChallenge)、invariant が統べる boundary 駆動のライフサイクルの外にある。正準の全数記述は MirrorLifecycleCore.tla 冒頭 R1 の EXCLUDED 節にあり、本節はその要約。ただし complete-with-project-sync-hold と skip-for-event は status を変える(pending 化 / skipped-for-event 終端化)ため**除外しない** — さらに **ProjectSyncTransition の3遷移**(commit-project-reconciliation = succeeded 化 :114 / hold-for-project-sync = succeeded→pending :304 / retire-project-sync-hold = pending→succeeded :354、実装は amadeus-mirror-project-reconciliation-reducer.ts — reviewer iteration 2 Critical の実測)も status 変更遷移であり除外しない。**計 14 遷移**をモデル化対象とする。特に retire-project-sync-hold は「ledger 収束を主張せずに succeeded へ戻す」経路(同ファイル :315-317 コメント)であり、NoCloseWithoutLandedSync が検査すべき enable 条件の核心 — この経路を欠くモデルは invariant を実装より狭い状態空間でしか検査できない。実装時に reducer(dispatch switch :752-801)+reconciliation reducer の status 変更遷移の全数 grep で 14 を再確定し、status を変える遷移の除外ゼロを assert する。

### T3: boundary→operation 写像

coordinator の `operationForBoundary`(:230-244)を**2変種**でモデル化する:
- **AsImplemented**: :235 の無条件 create(intent-capture-approved で issueNumber 非参照)— 現実装の忠実写像
- **AsIntended**: 全非 manual 境界で `issueNumber = Null ならば create さもなくば sync`(:243 の状態依存写像を intent-capture-approved にも適用)
落ちる実証(FR-C3 AC (ii))は AsImplemented 変種で NoDuplicateCreate 違反の反例トレースが**実際に出る**こと(#1838 の実測バグがそのまま反例)。AsIntended では両 invariant が完全探索で成立すること。

**CI 統合の契約(Finding 1 の是正)**: model-map v2 に登録するのは **AsIntended 変種の model/cfg のみ**(常時 green 対象 — BR-U7-5 の green 要件と整合)。AsImplemented は **build-and-test 段の一度限りの落ちる実証**として実行し、反例トレースを record 内エビデンス(`<record>/construction/u8-e2e-acceptance/` 系の実測記録)として保存する — ci.yml の恒常ジョブには含めない(恒常 red の構造矛盾を作らない。falling-proof-injection-one-set の「実証→記録→恒常面から除去」の適用)。AsImplemented の .tla/.cfg 自体は specs/tla/ に置いてよいが model-map エントリを持たない(SOURCE_DRIFT 監視対象は AsIntended のみ)。

### T4: invariant(出典コメント焼き込み — FR-C2)

- `NoCloseWithoutLandedSync`: close 遷移は「landed sync の succeeded receipt が存在する」状態でのみ enable(出典: #1816/#1607、close-after-landing クラス)
- `NoDuplicateCreate`: issueNumber ≠ Null の状態で create 操作の receipt が新規 prepare されない(出典: #1838、coordinator:235)

### T5: model-map v2 スキーマ

現行スキーマは単一 model/cfg 前提(amadeus-formal-verif-model-map.ts:186 の exactObject ["cfg","entries","model","schemaVersion"])。v2: `{ schemaVersion: 2, models: [{ name, model: {path,identity}, cfg: {path,identity}, entries: [...] }] }` — FormalElection の既存エントリを models[0] として機械移行し、MirrorLifecycle を models[1] に追加。読み手(loader / sensor / updateModelMap)は v2 を読む形へ更新し、v1 の読取互換は**持たない**(移行は同一 PR 内で完結 — org.md Forbidden の互換シム禁止。schemaVersion 不一致は loud 拒否)。

### T6: MirrorLifecycle の model-map エントリ(ADR-4)

entries = amadeus-mirror-state-reducer.ts + amadeus-mirror-types.ts + amadeus-mirror-project-reconciliation-reducer.ts + amadeus-mirror-coordinator.ts の**4ファイル**(SHA ピン — ADR-4 の 2026-07-31 改訂どおり)。モデル化範囲と監視面の差(coordinator は operationForBoundary 系のみモデル化)は .tla コメントに明記。

### T7: 工程文書(components.md C9)

docs/ 配下(既存 formal-verif 文書の並び)へ英語で: (a) モデル追従工程 — SOURCE_DRIFT → 分岐フロー(実装のみ変更 → u6 の --impl-only / モデル意味論変更 → モデル改訂+updateModelMap) (b) 新規プロトコル供給工程 — 題材選定 → 有限ドメイン縮約 → invariant 導出(出典焼き込み)→ model-map 登録 → TLC 完全探索完走 → 落ちる実証 → 人間ゲート。plugin README から参照。

## 不変条件(Unit 自体の)

- **I1(完全探索)**: TLC が AsIntended 変種で completion marker+state 統計付きで完走(finite-exploration-not-detected-proof — 部分探索・timeout は HARNESS_ERROR 扱いで不検出の証明にしない)。
- **I2(落ちる実証)**: AsImplemented 変種で NoDuplicateCreate 違反の反例トレース実出力(FR-C3 AC (ii))。
- **I3(u6 前提)**: モデル登録後の SOURCE_DRIFT 正規復旧経路(u6)が着地済み(edge block depends_on)。
- **I4(既存モデル不変)**: FormalElection の検証結果(既存 CI ジョブ・テスト)は v2 移行後も green(機械移行の等価性)。
- **I5(#1838 実装は不変)**: 本 Unit は coordinator の実装を変更しない — モデルが欠陥を検出する側(requirements FR-C3 注記どおり、修正は Won't)。

## テスト設計

formal-verif 系 named テスト流儀(t-formal-verif-*)で: (1) v2 スキーマの parse/validate(v1 拒否含む) (2) FormalElection 機械移行の等価性 (3) MirrorLifecycle エントリの SOURCE_DRIFT 検出(**4ファイル**のどれかを触ると赤 — reconciliation reducer 含む) (4) TLC 実行系は既存 CI ジョブ(workflow_dispatch)の run/verify が MirrorLifecycle を含む形へ拡張

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T13:38:09Z
- **Iteration:** 2
- **Scope decision:** none

iteration 2 NOT-READY(Critical: ProjectSyncTransition 3遷移の status 変更が列挙・ピン集合から漏れ)。予算消化後: 14遷移+4ファイルピンへ是正(ADR-4 改訂・申告付き)→ E-LSSADS13 準拠の閉包確認追加イテレーション(runtime 予算外・record 非搬送)で reviewer が 14遷移の独立再列挙一致・7除外の非 status 変更を閉包確認、残余の同根未伝播2箇所(T6/テスト設計)は conductor が是正し全域 grep 残存 0 で機械閉包。FD ステージゲートで本経緯を開示する。UTC 2026-07-31T13:21:04Z

### Findings

- iteration2 Critical: ProjectSyncTransition 3遷移(:114/:304/:354 の status 変更)の列挙・ピン漏れ — 14遷移+4ファイルピン(ADR-4 改訂)で是正
- 閉包確認(予算外): 14遷移=実装の status 変更遷移全数と一致、21−14=7 除外は全て非 status 変更(reviewer 独立再列挙)
- 残余2箇所(T6/テスト設計の旧3ファイル表現)— conductor 是正+grep 残存 0 で機械閉包(E-LSSADS13 機械クラス受理)
