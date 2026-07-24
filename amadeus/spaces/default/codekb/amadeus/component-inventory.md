# コンポーネント一覧

## Framework コンポーネント

| コンポーネント | 所有責務 | 主な依存 | 健全性 |
|---|---|---|---|
| Stage Graph | scope、stage、依存、sensor のコンパイル | stage frontmatter、rules | 良好 |
| Orchestration Engine | next/report、gate、phase、park、complete | graph、state、lib | 注意 |
| State Machine | Intent、stage、receipt、audit 遷移 | lib、filesystem | 注意 |
| Shared Library | workspace、space、Intent、record、audit 解決 | Node/Bun APIs | 注意 |
| Audit System | append-only event、shard、presence | state/lib/hooks | 良好 |
| Rules and Knowledge | additive rule chain、agent methodology | memory、knowledge | 良好 |
| Sensors | 成果物の決定的検証 | manifests、stage graph | 良好 |
| Construction Tools | Unit、Bolt、worktree、swarm | git、state、audit | 良好 |
| Packaging Pipeline | core と overlay の6面生成 | manifests、filesystem | 良好 |
| Setup Installer | 配布物の導入・更新 | dist、HTTP/archive ports | 良好 |
| Test Runner | tier、size、coverage、registry | Bun test、LCOV | 良好 |
| Documentation | 利用者・開発者契約 | 実装、日英版 | 注意 |

「注意」は、機能不良を意味せず、巨大モジュール、高 fan-in、または今回の未実装契約により変更リスクが高いことを示す。

## Mirror コンポーネント

| コンポーネント | 責務 | 現行ギャップ | 変更影響 |
|---|---|---|---|
| Mirror Config | 3層 parse/merge/resolve | boolean、default false | 高 |
| Mirror Policy | phase 境界の auto/ask 判断 | 3 mode、operation、boundary を表せない | 高 |
| Mirror CLI | create/sync/close/status と gh | root 解決、ownership、部分成功 | 高 |
| Mirror Snapshot | record から title/body/status 生成 | non-default space の経路確認が必要 | 中 |
| Boundary Receipts | pending/completed、再入抑止 | off 切替、park/complete 未配線 | 高 |
| Provenance Store | Amadeus 作成 Issue の由来 | 不在 | 新設 |
| Reconciliation State | 未同期、警告、retry | 不十分 | 新設または state 拡張 |
| Mirror Skill | 利用者操作説明 | boolean/sync 中心 | 中 |
| Distribution Manifests | 6面への tool/skill 配布 | 生成同期が必要 | 中 |
| Mirror Tests | CLI/config/boundary の回帰 | mode matrix、安全異常系が不足 | 高 |
| EN/JA Docs | 設定、境界、移行説明 | 3モード未記載 | 高 |

## 所有境界

- config module は設定の構文と3層解決を所有し、GitHub 操作を行わない。
- policy は mode/operation/boundary の判断を所有し、filesystem や `gh` を直接呼ばない。
- state は provenance、receipt、未同期状態の正本を所有する。
- mirror CLI は GitHub adapter と snapshot rendering を所有する。
- orchestrate は lifecycle seam から policy を呼び、directive と state transition を調整する。
- package/promote pipeline は生成物を所有し、生成物の手編集を許さない。

## 変更時の依存コンポーネント

Mirror の変更は、config→policy→orchestrate→state/CLI→distribution→tests/docs の順に伝播する。`amadeus-lib.ts`、`amadeus-state.ts`、`amadeus-orchestrate.ts` は巨大かつ多数の consumer を持つため、汎用リファクタリングを同時に行わず、mirror に必要な seam のみを変更する。
