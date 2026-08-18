# TLA+ Authoring — Applicability Assessment(terminal: impl-only)

- Intent: 260818-priority-bug-batch-4 / 実施: 2026-08-18(inline、amadeus-architect persona)
- 入力: `inception/requirements-analysis/requirements.md`(FR-2837-1〜5 / FR-3106-1〜4 / NFR 3 件 = 計 12 識別子を全数検査)
- Route: **`impl-only`**(terminal — authoring へ進まない。TLC 起動なし)

## 実測した前提

### 登録モデルと pinned implPath(`amadeus/spaces/default/specs/tla/model-map.json`)

| モデル | pinned implPath | 本 intent の接触 |
|---|---|---|
| `BoltPrAttestationGate` | `amadeus-orchestrate.ts` / `amadeus-state.ts` | **接触**(U1 が両方、U2 が orchestrate) |
| `PrConvergenceGate` | `amadeus-orchestrate.ts` / `amadeus-state.ts` | **接触**(同上) |
| `FormalElection` | election 系 5 本 | 非接触 |
| `MirrorLifecycle` | mirror 系 4 本 | 非接触 |

変更した production ファイル(`git diff --name-only origin/main...HEAD -- packages/`):
U1 = `amadeus-bolt.ts` / `amadeus-directive.ts` / `amadeus-orchestrate.ts` / `amadeus-state.ts` / 8 ハーネス面 / knowledge md 1 本。U2 = `amadeus-orchestrate.ts` / knowledge md 1 本。**pinned implPath は `amadeus-orchestrate.ts` と `amadeus-state.ts` の 2 本のみ**で、`amadeus-bolt.ts` / `amadeus-directive.ts` / ハーネス面 / knowledge md はどのモデルの implPath でもない。

### モデル語彙の probe(意味論不変の根拠)

対象 = `BoltPrAttestationGate.tla` / `PrConvergenceGate.tla`。述語 = `grep -ci "<語>" <file>`。

| 語 | BoltPrAttestationGate | PrConvergenceGate |
|---|---|---|
| `batch` / `pool` / `outcome` / `settle` / `cancel` / `supersed` | いずれも **0**(exit 1) | いずれも **0**(exit 1) |
| `directive` / `swarm` | — | いずれも **0**(exit 1) |
| `unit` | 34 | — |
| 対照 `VARIABLES` / `Init` / `Next` | — | 各 **2**(exit 0) |

**述語の健全性**: PrConvergenceGate 側は被検 8 語がすべて 0 hit だったため、実在が既知の対照リテラルを同一述語で走らせて非ゼロ(各 2 hit・exit 0)を確認した。被検語の exit 1 は「エラーなく不一致」であり、エラー時の exit 2 とは区別される。

`BoltPrAttestationGate` の `unit` 34 hit は `Units == {0, 1}` を用いた `reportUnits` / `evidencedUnits`(PR 報告のメンバーシップ抽象)であり、本 intent が触る per-unit outcome 台帳ではない。

### 名前付き不変量(モデルが実際に守っている性質)

- `BoltPrAttestationGate`: TypeOK, EvidenceCurrentHead, SensorRequiresAttestation, AttestationRequiresCompleteBolt, SensorRequiresCompleteBolt, OwnerEvidenceIsolated, AutonomyDecisionSafe, ReceiptIdempotent, ReceiptBoundCurrentReport, CodeGenerationGuarded, WorkflowGuarded
- `PrConvergenceGate`: TypeOK, EvidenceCurrentHead, SensorRequiresAttestation, CodeGenerationGuarded, WorkflowGuarded

いずれにも swarm dispatch(batch identity)も per-unit outcome の supersession も現れない。

## 選定根拠(全 subject の採否)

形式モデル基準 =「共有状態を持つ並行または再開可能なアクターが存在し、無音で残存しうる安全性違反があること」。

| 識別子 | 判定 | 根拠 |
|---|---|---|
| FR-2837-1(directive の batch identity 搬送) | **impl-only** | pinned implPath を変更するが、両モデルの語彙・不変量に swarm dispatch が存在せず到達可能挙動の意味論は不変。基準の並行面(spent pool への再進入)には該当するが、閉じ方が **fail-closed の emit 拒否**であり pool プロトコルへ状態・遷移を追加しない |
| FR-3106-1 / FR-3106-3(per-unit terminal outcome と pool 経路対称性) | **impl-only** | 同上。台帳は追記型で読みは決定的 fold(同時刻衝突は key 順 tie-break)。FR-3106-3 が「新しい第3の挙動を発明しない」と明示するとおり、既存 pool 経路の契約への**対称性回復**であり新規プロトコルではない |
| FR-2837-2(check_cmd 供給契約) | non-target | 契約 prose の明記のみ。実行時状態を持たない |
| FR-2837-3(engine + 7 conductor 面の同期) | non-target | 文言の投影同期。状態機械を導入しない |
| FR-2837-4(回帰テスト) | non-target | テストのみ。本番挙動なし |
| FR-2837-5(stale SKILL.md 参照の解消) | non-target | コメント修正、挙動不変 |
| FR-3106-2(落ちる実証) | non-target | テストのみ |
| FR-3106-4(docs 既知限界の更新) | non-target | docs のみ |
| NFR 台帳 resync / 検証順序 / 配送 | non-target | 横断規律・測定手法であり状態機械を導入しない |

**author-new を採らない根拠**: team.md § Testing Posture は形式モデルの完全探索を「並行プロトコル(状態機械・相互排除の不変量)の **spec 変更**時のみ」と定める。両 unit はいずれも既存契約への回復(バグ修正)であり、拒否ガードの追加と対称性回復の 2 種で、新しい状態・遷移・相互排除規則を導入しない。

## model-map の resync 実測

両ブランチとも pin が実ファイル digest と一致(`shasum -a 256` との突合):

| ブランチ | `amadeus-orchestrate.ts` | `amadeus-state.ts` |
|---|---|---|
| `bolt-pbb4-invoke-swarm-context` (#3202) | `b07123099077` | `c889d93f414f` |
| `bolt-pbb4-per-unit-outcome` (#3203) | `b36054a23db0` | `e3612b309f28`(U2 は state.ts 非接触) |

2 モデル(BoltPrAttestationGate / PrConvergenceGate)が同じ 2 本を pin するため、両モデルの entry が同一変更で更新されている。

## 申し送り

- **直列着地時の再 resync**: 2 PR は同じ pinned implPath を変更するため、先行 PR 着地後に後続 PR を rebase した時点で `amadeus-orchestrate.ts` の digest が変わる。後続 PR は rebase 後に `updateModelMap --impl-only` を再実行しないと merge group の CI が SOURCE_DRIFT で赤化する。U2 はこの合流点をコミット `71a5329ad` で明記済み
- 本判定は「新規モデルの要否」の判定であり、登録済みモデルの TLC 完全探索(後続 `formal-model-check` ステージ)とは独立である

## Terminal route の承認

- 裁定: full 梯子 AUTO_DECIDED `auto-decision-a2a5e5b2c5ff4d6282995cb993f05c69`(`approve-impl-only-terminal`)
