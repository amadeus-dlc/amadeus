# Risk & Sequencing Rationale — チーム機能のコア昇格

> 上流入力(consumes 全数): requirements(リスク R 系の写像元)、components(C1 の落ちる実証構造)、unit-of-work(U 規模と受け入れ)、unit-of-work-dependency(DAG 直列制約)、unit-of-work-story-map(価値到達経路の順序整合)、team-practices(Bolt/PR/CI の運用既定)

## 順序の根拠

1. **Bolt 1(U1+U2)先頭**: 依存の根元(U2←U1 が DAG 唯一の直列辺)+落ちる実証の不可分性(ガード赤→SKILL 書き換え green を単一 Bolt で完結 — falling-proof-injection-one-set の Bolt 面適用)+配布経路の骨格を最小スライスで人間確認
2. **Bolt 2(U3)を Bolt 1 の後**: DAG 上は独立だが、(a) bash 配布という未実証面のリスクを骨格確認後に置く(risk-first)(b) Bolt 1 で確立した「移動+再生成+ガード green」の定型を再利用し手戻りを抑える
3. **Bolt 3(U4+U5)並行**: 合流点(unit-of-work の U4/U5 定義)。E2E(検証)と docs(記述)は対象が確定した後にのみ正しく書ける(nfr-design:c7 の早期断定禁止)。unit-of-work-story-map の価値到達経路(prerequisite→起動→疎通→選挙完走)とも順序整合
4. **運用既定**: 各 Bolt の PR・スカッシュ・CI green は team-practices の Way of Working / Testing Posture の枠内(components.md C1〜C7 の Reuse Inventory どおり新規 CI ジョブなし)

## リスク写像(raid-log → Bolt)

| リスク | 影響 Bolt | 緩和 |
|---|---|---|
| R-2 herdr バージョン互換 | Bolt 2/3 | fake-binary seam が期待を固定(ADR-4)。実測バージョン 0.7.1 を docs 記録 |
| R-3 e2e の CI 負荷 | Bolt 3 | serial 層配置+fanout-load-settle 既決に従う |
| R-4 ハーネス別投影の整合漏れ | Bolt 1/2 | dist:check / promote:self:check+4面 skills 不在の機械確認(U2 受け入れ) |
| R-1 agmsg 入手経路 | 解消済み(RA Q5) | prerequisite 節は公式入手先参照のみ |

## 失敗時の扱い

Bolt 失敗は halt-and-ask(autonomy モードに関わらず停止 — stage-protocol 既定)。worktree は保存。
