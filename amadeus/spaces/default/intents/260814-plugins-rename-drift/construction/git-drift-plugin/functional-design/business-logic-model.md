# Business Logic Model — git-drift-plugin

上流入力: `unit-of-work.md` U3、`unit-of-work-story-map.md`(FR-DRIFT-1〜6 → U3)、`requirements.md` FR-DRIFT 群、`components.md` C5/C6、`component-methods.md` C5(DriftReport / CLI 契約)、`services.md` F1/F2。

## メインアルゴリズム: detectDrift

```
入力: { repoRoot, settings: { fetch-throttle-seconds, ... } }(--settings-json 経由 — U2 の C4 が解決済み)
 1. 前提検査(fail-open の skip 系 — 順に):
    a. repoRoot が git リポジトリでない → { kind:"skipped", reason:"not-a-git-repo" }
    b. origin リモート不在 → { kind:"skipped", reason:"no-origin" }
    c. default branch 解決(origin/HEAD → 不能なら main → master の順で remote-tracking ref 実在確認)
       不能 → { kind:"skipped", reason:"no-origin" }(細分不要 — 文言に理由を含める)
 2. スロットル判定(ADR-5: fetch のみ skip、判定は毎回):
    a. 機械ローカル記録(workspace 単位の `amadeus/.amadeus-sessions/git-drift-fetch.json` — 既存の gitignored 機械ローカルディレクトリ。domain-entities.md FetchThrottleRecord と同一契約)から前回 fetch 時刻を読む
    b. now - last < fetch-throttle-seconds → fetch を skip(throttled とは報告しない — 判定は続行)
    c. 期限切れ → git fetch origin <default>(タイムアウト付き — timeout は **fetch 実行のみ**に適用し、ローカル判定(rev-list/diff)には適用しない。値の確定基準は domain-entities.md の timeout_seconds 節)。失敗・タイムアウト → { kind:"skipped", reason:"fetch-failed", detail } を loud 記録(fail-open)。
       成功 → 時刻を記録
 3. behind 数: git rev-list --count HEAD..origin/<default>
    behind = 0 → { kind:"synced" }
 4. 交差判定:
    originChanged = git diff --name-only HEAD...origin/<default>(three-dot = merge-base 起点の origin 側)
    workChanged   = git status --porcelain のパス ∪ git diff --name-only <merge-base>..HEAD
    intersecting  = originChanged ∩ workChanged
    ledgerIntersecting = intersecting ∩ 台帳パターン(amadeus/spaces/*/intents/*/audit/**、**/amadeus-state.md、tests/no-silent-drop/events/**)
 5. 判定:
    intersecting 空 → { kind:"info", behind }(情報表示)
    非空 → { kind:"warning", behind, intersecting, ledgerIntersecting }(ledger 分は先頭で優先提示)
 6. 出力整形(--output-path へ既存センサー出力様式で書く。exit 0 固定 — advisory)
    警告文言(ADR-5): 「origin/<default> が N コミット先行しています。あなたの作業と交差するファイル: <一覧>。取り込み(mirror/rebase)または先着地の判断を検討してください」
```

## タイミングシーム(NFR-1 検証用)

- fetch 実行/skip は関数境界で分離し、テストから counter/クロック注入で検証可能にする(`TEST_TIME_FACTOR` 系の実時間 sleep は使わない — 判定はクロック値の比較のみ)。
- クロックと git 実行は port として注入(テストダブルはテスト側ヘルパー — 本番コードにテスト分岐を置かない: construction ガードレール)。

## 落ちる実証 3 経路(FR-DRIFT-3 — テスト用ローカル bare リポジトリで実測)

```
セットアップ: bare origin を作り clone、origin 側へ別 clone からコミットを push して「origin が進んだ」状態を作る
 (i) origin 側変更ファイル = 作業側変更ファイル → warning(交差ファイル名指し)
 (ii) origin 側変更が非交差ファイルのみ → info(behind 数のみ)
 (iii) origin の URL を到達不能へ差し替え → fetch-failed の loud skip(exit 0)
正当系: origin と同期済み(behind 0)で synced(警告なし)
```

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T08:52:08Z
- **Iteration:** 1
- **Scope decision:** none

DriftReport判別ユニオンがcomponent-methods.md C5契約と食い違い(throttled欠落・detail追加が無申告)、他は概ね整合

### Findings

- BLOCKER | domain-entities.md の DriftReport 型が application-design/component-methods.md C5 契約と一致しない。C5 は reason に throttled を宣言するが、domain-entities.md は throttled を落とし未宣言の detail? を追加している。逸脱の理由が functional-design 側に明記されておらず、developer がどちらを実装契約とすべきか判断できない(P3 違反)。C5 の型シグネチャを直すか、functional-design 側に解決根拠を明記した是正が必要
- FOLLOW-UP | FetchThrottleRecord の置き場が intent record 配下だと intent 切替・並行でスロットルが意図せずリセットされ得る。intent 非依存の置き場を検討し根拠を補足することを推奨
- FOLLOW-UP | sensor manifest の timeout_seconds が未確定のまま。code-generation 段での判断基準を一言明記すると手戻りを防げる

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T08:54:00Z
- **Iteration:** 2
- **Scope decision:** none

C5/DriftReport の BLOCKER は解消されたが、FetchThrottleRecord の置き場を修正した際に business-logic-model.md が追随しておらず新たな矛盾が生じている

### Findings

- BLOCKER | domain-entities.md の FetchThrottleRecord は workspace 単位の amadeus/.amadeus-sessions/git-drift-fetch.json へ修正済みだが、business-logic-model.md ステップ2a は旧仕様(intent record 配下の .amadeus-git-drift-fetch)のまま。両ファイルが矛盾し developer が実装契約を判断できない。business-logic-model.md 側を揃える是正が必要
- FOLLOW-UP | timeout_seconds 確定基準と business-rules.md R2 の対応(タイムアウトの適用対象が fetch のみか判定全体か)の明示があるとよい
