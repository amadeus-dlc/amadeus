# Intent Backlog

## 上流入力と優先方式

本 backlog は [`intent-statement.md`](../intent-capture/intent-statement.md)、[`feasibility-assessment.md`](../feasibility/feasibility-assessment.md)、[`constraint-register.md`](../feasibility/constraint-register.md)、および [`scope-document.md`](./scope-document.md) を proto-capability へ分解する。

優先度は MoSCoW で release boundary を定め、同じ Must 内では dependency と risk-first を先に適用し、その範囲で WSJF を参考にする。WSJF は `(User Value + Time Criticality + Risk Reduction) / Relative Size` の相対値であり、工数・行数の確約ではない。

## Prioritized Proto-Capabilities

| Rank | ID | Proto-capability | MoSCoW | UV | TC | RR | Size | WSJF | Dependencies |
|---:|---|---|---|---:|---:|---:|---:|---:|---|
| 1 | IB-01 | Prepared Unit worktree isolation proof | Must | 8 | 8 | 13 | 2 | 14.5 | none |
| 2 | IB-02 | Harness-relative enum validation and decision matrix | Must | 8 | 8 | 13 | 2 | 14.5 | IB-01 |
| 3 | IB-03 | Referee vocabulary and loud-degrade audit alignment | Must | 8 | 5 | 8 | 2 | 10.5 | IB-02 |
| 4 | IB-04 | Claude／Codex／Kiro conductor wiring | Must | 13 | 8 | 8 | 3 | 9.7 | IB-02、IB-03 |
| 5 | IB-05 | Contract、negative、referee、live verification | Must | 13 | 8 | 13 | 3 | 11.3 | IB-03、IB-04 |
| 6 | IB-06 | Documentation、onboarding、generated parity | Must | 8 | 5 | 3 | 2 | 8.0 | IB-05 |

IB-05 の raw WSJF は IB-03／IB-04 より高いが、検証対象となる wiring が未完成では実行できないため dependency を優先する。

## IB-01 — Prepared Unit Worktree Isolation Proof

**Outcome:** native child が `amadeus-swarm prepare` の unit worktree へ書き込み、main／他 Unit を変更せず、親が結果を回収できる。

**Acceptance signal:**

- 2 Unit 以上を prepared worktree へ分離
- native child ごとの対象 path と変更結果を記録
- main worktree と兄弟 Unit の非変更を確認
- writable-root／cwd 制約を記録
- 不成立なら後続 backlog を開始せず No-Go

**Trace:** S-01、C-13、C-14、R-01、I-01。

## IB-02 — Harness-Relative Enum Validation

**Outcome:** unset、`claude-ultra`、`codex-ultra` と harness の組み合わせから、selected driver、degraded-from、error が決定的に得られる。

**Acceptance signal:**

- Claude／Codex／Kiro 系の decision table を固定
- 旧 `1` と任意未知値を副作用前に拒否
- raw env、code type、audit driver を一対一語彙に統一
- 汎用 registry／adapter／写像層を導入しない

**Trace:** S-02、C-01〜C-06、C-16、R-03、I-02。

## IB-03 — Referee Vocabulary and Audit Alignment

**Outcome:** `subagent | claude-ultra | codex-ultra` が `--degraded-from` と `SWARM_DEGRADED` で同じ意味を持つ。

**Acceptance signal:**

- `ultracode` を `claude-ultra` へ置換
- `codex-ultra` を閉じた driver 値へ追加
- invalid driver は `SWARM_STARTED`／worktree 作成前に失敗
- `prepare`、`check`、`finalize` の意味論と exit contract を維持

**Trace:** S-06、C-03、C-06、C-08、I-06。

## IB-04 — Harness Conductor Wiring

**Outcome:** 各 harness が IB-02 の同じ契約を利用者可視の実行へ接続する。

**Acceptance signal:**

- Claude: unset native floor、`claude-ultra` Workflow、`codex-ultra` loud-degrade
- Codex: unset native floor、`codex-ultra` ultra request、`claude-ultra` loud-degrade、headless floor 撤去
- Kiro／Kiro IDE: unset native floorを維持、両 ultra 値を loud-degrade、新 driver は追加しない
- 全 harness: `1`／未知値 fail-closed
- retry と result collection が Unit identity を維持

**Trace:** S-03〜S-05、C-04、C-05、C-07、C-17〜C-19、R-05〜R-07、I-05。

## IB-05 — Verification

**Outcome:** 新契約が source-text assertion だけでなく、決定ロジック・監査・live execution で証明される。

**Acceptance signal:**

- harness×値 matrix tests
- `1`／未知値の side-effect-zero negative tests
- mismatch の user message／audit consistency tests
- t134／t135 系 referee regressions
- Codex native parallel spawn／collection／worktree evidence
- actual `ultra` honor telemetry がないことを証拠限界として明記

**Trace:** S-07、C-03、C-05、C-08、C-13〜C-16、R-01〜R-03、R-09。

## IB-06 — Documentation and Generated Parity

**Outcome:** 利用者が breaking change と harness 相対 semantics を理解でき、installed harness が source と同じ動作契約を持つ。

**Acceptance signal:**

- harness guides、reference、onboarding の更新
- 旧 `1`、headless Codex swarm floor、旧 `ultracode` 語彙の残存 scan
- source から dist／self-promoted／root onboarding を生成
- dist check、promote self check、packaging parity が green

**Trace:** S-08、S-09、C-02、C-07、C-12、R-04、D-04。

## MoSCoW Boundary

### Must Have

IB-01〜IB-06。公開契約を利用可能な状態で着地させるため、いずれも省略できない。

### Should Have

なし。Must ではない改善をこの Intent へ入れると、軽量再始動の境界を曖昧にする。

### Could Have

なし。追加の convenience や observability は実測された不足を解決する別 Intent で判断する。

### Won't Have This Time

- actual effort telemetry の新設
- `SubagentStart` を含む汎用 observability 拡張
- 汎用 driver registry／adapter
- 新 Kiro ultra driver
- 外部 messaging／agent orchestration
- legacy compatibility
- referee semantic redesign
- AWS infrastructure change

## Dependency Sequence

```text
IB-01 → IB-02 → IB-03 → IB-04 → IB-05 → IB-06
```

IB-03 と IB-04 の内部作業は、IB-02 の contract が確定した後に並行検討できる。ただし契約・referee・harness wiring・tests・docs は同じ Intent で揃うまで独立着地させない。

## Delivery Guardrails

- Units Generation で各 Unit に概算行数レンジを記録する
- 概算は規模可視化であり、固定 LOC budget ではない
- Unit は end-to-end acceptance へ trace し、adapter／contract だけの Unit を作らない
- IB-01 が失敗した時点で残りを停止する
- scope change は `scope-document.md` の Change Control に従い再承認する
- PR は Issue #1157 と Intent record に trace し、Mirror Issue #1182 は record から一方向同期する
