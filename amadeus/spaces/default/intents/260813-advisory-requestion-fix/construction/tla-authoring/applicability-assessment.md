# TLA+ Authoring — 適用性評価(terminal)

**Intent**: 260813-advisory-requestion-fix / **測定 ref**: HEAD `23eef2e09` / **裁定**: full autonomy ladder AUTO_DECIDED `auto-decision-fb88c065f37298a785eaf932d8fef2e0`

## 検査した識別子(requirements.md 全数)

FR-ADV-1, FR-ADV-2, FR-ADV-3, FR-ADV-4, FR-ADV-5, FR-ADV-6, FR-ADV-7, FR-ADV-8(NFR: 適用数値目標なしの判定済み)

## 判定: not-applicable / impl-only(authoring 不実施)

- **選定基準への適合なし**: 全 FR は単一 conductor の決定的 directive routing の回復であり、「並行または再開可能な actor が状態を共有し、無音で残りうる安全性違反」という formal-model 基準を満たす新規プロトコルを導入しない。advisory store 書込は `withAuditLock` で直列化され、single-spend 不変量は既存(本 intent は routing のみ変更)。検証は t2967 系統合テスト + 既存回帰(142 pass 実測)が担う(project.md 二層検証: 完全探索は並行プロトコルの spec 変更時のみ)。
- **登録モデルへの影響 = impl-only**: 変更した `amadeus-orchestrate.ts` は PrConvergenceGate の entries に含まれるが、modeled 変数・不変量(workflowDone/attested 等)に advisory 面は存在しない(`grep -ci "advisory" amadeus/spaces/default/specs/tla/PrConvergenceGate.tla` = 0、exit 1)。modeled reachable behaviour は不変。
- **モデル側の再検証は実施済み**: spec-change advisory(model-map の impl hash 更新由来)に対し、run-now 裁定 → handoff 実行で TLC 3モデル(FormalElection / MirrorLifecycle / PrConvergenceGate)を本日2回完全探索し全て `NOT_DETECTED`(exit 0)。verdict は `plugin-activation.ts record` で記録済み。

## この判定を覆す条件

advisory 保持・受理プロトコルへ並行 actor(複数 conductor / 分散実行)や新しい相互排除不変量が導入される場合、当該プロトコルを新規モデルとして authoring する。
