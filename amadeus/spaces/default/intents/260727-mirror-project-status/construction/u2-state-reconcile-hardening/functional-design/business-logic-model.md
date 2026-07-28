# Business Logic Model — u2-state-reconcile-hardening

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

U2 は unit-of-work の定義どおり、U1 の直線経路を**失敗・再試行に強い reconcile ループ**へ完全化する(unit-of-work-story-map ジャーニー2:「一時障害があっても次の節目で追いつく」)。requirements FR-3f/FR-7 を実装面(components の codec/reducer/executor 割付、component-methods の transition 3種)へ落とす。外部障害の分類は services の外部依存表に従う。

## reconcile ループ(U1 手順2〜8 の置換)

U1 の「単一対象 Project の直線経路」を「**同期対象 Project 全数の独立ループ**」へ一般化する:

1. **対象集合の構成**: 所属照会(`listProjectItems` 1回)の結果 ∪ 設定済み対象 Project(FR-3f — 同期は所属全 Project、追加は対象 Project のみの非対称を維持)。
2. **per-Project 独立処理**: 各 Project について U1 手順3〜7 を実行。**1 Project の失敗が他 Project の処理を止めない**(FR-7c の独立性 — 受入条件6)。
3. **台帳の3状態化**: 成功 → `synced` / retryable 失敗(rate-limit・network・api retryable)→ `pending` / 解決不能(フィールド・選択肢未解決、permission)→ `safety-blocked`。reducer transition 3種(component-methods: upsert-project-entry / mark-project-pending / mark-project-safety-blocked)で書き込む — U1 の「synced のみ」制約をここで解除する(unit-of-work の設計どおりの段階導入)。
4. **冪等 reconcile**: 次の eligible boundary / manual sync で台帳を読み、pending / safety-blocked の Project を含む全対象を再評価する。成功済み(synced かつ期待一致)は mutation を発行しない(FR-7b — 再実行で重複追加・重複 mutation ゼロ)。
5. **操作 outcome への集約(層分離 — U3 の BR-U3-9 と同一規約)**: 全 Project synced → 操作は completed 相当 / **未完(pending / safety-blocked を問わず)が残る → 操作 receipt は `pending`(IN_PROGRESS 分類)に留める**。`safety-blocked` は Project 台帳・警告・診断でのみ表現し、operation receipt に書かない — 既存 policy の terminal-block 分類(amadeus-mirror-policy.ts:61-65)による恒久停止を避け、FR-7b の再試行可能性を保つ(既存の coordinator 集約経路は無変更 — components の注記どおり回帰テスト対象)。

<!-- Text fallback: 対象集合構成 → per-Project 独立ループ(失敗は分類して台帳3状態へ)→ 次回 boundary で台帳起点の冪等再評価 → 操作 outcome へ集約。 -->

## 失敗分類と台帳状態の写像

| 失敗(services の分類) | 台帳状態 | 次回の扱い |
|---|---|---|
| rate-limit / network / api(retryable) | pending | 再評価(再試行) |
| フィールド・選択肢未解決 / permission | safety-blocked | 構成が変わるまで再評価のたびに safety-blocked を維持(診断へ誘導) |
| 成功・既一致 | synced | 期待変化時のみ mutation |

## failure injection(検証面)

- 部分成功: Issue 成功+Project A 成功+Project B retryable 失敗 → B のみ pending、次回 boundary で B が synced へ収束(FR-7a/7b の受入基準)。
- 二重実行: 同一 boundary の再実行で mutation 総数が不変(冪等 — NFR-1)。
- per-Project 呼び出し上限: 照会1+mutation≤2 を FakeGateway history で assert(NFR-3、component-methods の設計値)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T07:39:01Z
- **Iteration:** 2
- **Scope decision:** none

4是正(9セル状態表+12遷移 mermaid の三者一致 / BR-U2-3 引用訂正 / 台帳規模文の矛盾解消 / BR-U2-8 秘匿 assert 追加)が verbatim 実在・有効で新規矛盾なし

### Findings

- None
