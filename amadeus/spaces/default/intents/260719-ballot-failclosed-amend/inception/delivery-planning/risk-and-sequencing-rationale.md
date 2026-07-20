# Risk and Sequencing Rationale — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md(検証コマンド・レビュー体制の既決プラクティスは team-practices.md の live 温存版に従う)

## 順序の根拠(risk-first)

1. **e1 #1261 先行着地 → 本 Bolt 再接地**(直列合意): 交差核心(tally/verify recompute)の手戻り消去 — 最大リスク(集計意味論の二重変更衝突)を順序で解消。E-TCRCG 裁定(A=hold 二値維持)により e1 側の変更面が tally 系に限定され、交差範囲は当初想定から拡大していない。
2. Bolt 内は story map の順(FR-1 → FR-3 → FR-4 → 締め)— 事故クラス封鎖(FR-1)を最小先行価値とし、FR-4 は FR-3 が生む共存状態の上に実装。
3. 落ちる実証は fix コミット後に pre-fix 面切替で実施し、復元 ref は fix コミット SHA 明示(falling-proof-no-stash の E-GMECG 追補)。

## リスク台帳(raid-log からの引き継ぎ+現況)

| リスク | 現況(2026-07-19) | 緩和 |
| --- | --- | --- |
| R-1 amend 二重計上 | 解消方向確定(E-BFARA2+AD 適用点表 #1〜#3・#5) | FR-4 テスト固定 |
| R-2 regex 過剰厳格化 | 受理形確定(E-BFARA1=mint 限定) | FR-2 glob 全数 sweep(固定件数ループ禁止) |
| R-3 t238 交差 | 非交差維持(W-1、e1 の t238 反転は #1226 intent 側で完了) | 接触ゼロ |
| 新規: e1 #1261 の着地遅延 | 待機許容(rate-limit-idle-allowance) | 待機中は非依存工程(FD/NFR 系ステージ)を先行 |
