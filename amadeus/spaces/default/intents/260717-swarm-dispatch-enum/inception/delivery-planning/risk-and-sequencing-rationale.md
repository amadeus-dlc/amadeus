# Risk and Sequencing Rationale — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。

## Risk-first の充足状況

scope の risk-first sequencing のうち最大リスク(S-01 worktree isolation)は **requirements 段の live probe で解消済み**(C-13/C-14 成立 — `../requirements-analysis/c13-probe-evidence.md`)。残余リスクと配置:

| リスク | 影響 | 緩和・配置 |
|---|---|---|
| 三値契約の設計漏れ(decision table 不整合) | 全 harness 挙動 | Bolt 1 で契約+全セルテストを先行着地(配線前に契約を固定) |
| headless 撤去による codex journey テスト破損 | CI 赤 | Bolt 2 のスコープに t-exec-codex-journey 系の棚卸し(置換 or 退役)を明示的に含む(UG 済み) |
| sandbox restricted 環境での native 書き込み失敗 | Codex floor | requirements 前提に開示済み(unrestricted 実測条件)。restricted での失敗が実測されたら選挙へ(requirements Open questions 承継) |
| dist drift(6 ツリー+self-install) | CI 赤・配布不整合 | Bolt 3 で一括再生成+dist:check/promote:self:check。並行 PR との cross-merge 盲点は本 intent 期間の並行 dist 変更 PR 監視で緩和(cross-merge-dist-tree-blindspot) |
| effort=ultra の実適用不可観測 | 期待値齟齬 | C-15 開示を docs へ焼き込み(Bolt 3)— 実測済みと誤表現しない |

## 順序の根拠

契約(Bolt 1)→ 配線(Bolt 2)→ 配布(Bolt 3)は「検証済み契約だけを文書・生成物へ確定する」(scope Delivery Strategy 5)の写像。逆順・並行は、未確定契約の配布(検証劇場类似の偽確定)か dist 二重再生成の衝突を生むため退ける。
