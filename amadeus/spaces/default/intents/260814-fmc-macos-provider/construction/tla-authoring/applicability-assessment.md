# TLA+ Authoring — 適用性評価(terminal)

**Intent**: 260814-fmc-macos-provider / **測定 ref**: HEAD `1d49d9a57e` / **裁定**: full autonomy ladder AUTO_DECIDED `auto-decision-173aa51b403b39786d9bfc14ca115d8a`

## 検査した識別子(requirements.md 全数)

FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7 / NFR-1, NFR-2

## 判定: not-applicable(terminal、authoring 不実施)

- **選定基準への適合なし**: 全 FR は `run-model-check` CLI 単一プロセス内の provider 選択・環境検査・受理判定の制御フローであり、「並行または再開可能な actor が状態を共有し、無音で残りうる安全性違反」という formal-model 基準を満たす対象を導入しない。`AutoTlcSpawnPlanner` は単一実行内の逐次フォールバック(共有状態・相互排除・再開性なし)。検証は unit 29 + integration 76 + フルスイート(build-test-results.md 実測)が担う(project.md 二層検証: 完全探索は並行プロトコルの spec 変更時のみ)。
- **登録モデルへの影響 = 交差ゼロ**: 変更4ファイル(`tlc-spawn-planner.ts` / `tlc-toolchain.ts` / `fs-tlc-toolchain.ts` / `run-model-check-execution.ts`)は model-map.json の登録3モデル全 entries と交差しない(python set 交差 = 空集合で実測)。modeled reachable behaviour は不変。
- **モデル側の再検証は実施済み**: requirements-analysis checkpoint の spec-change advisory への run-now handoff として、登録3モデル(FormalElection / MirrorLifecycle / PrConvergenceGate)の TLC 完全探索を既定 provider(auto → sandbox-exec)で実施し、全て `NOT_DETECTED`(exit 0)。verdict は `plugin-activation.ts record` で記録済み(`construction/formal-model-check/formal-model-check-result.md`)。

## この判定を覆す条件

provider フォールバックが複数プロセス・共有キャッシュの相互排除(例: jar cache の並行 acquire)や再開可能な実行状態を持つ設計へ拡張される場合、当該プロトコルを新規モデルとして authoring する。
