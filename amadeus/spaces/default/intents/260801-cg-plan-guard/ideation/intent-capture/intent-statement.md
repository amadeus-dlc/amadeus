# Intent Statement — 260801-cg-plan-guard

上流入力(consumes 全数): なし(起点ステージ。入力は Issue #1892 のユーザー裁定済み要件骨子と #1893、および 2026-08-01 の record 横断調査)

## 問題

Bolt/Unit 計画(units-generation / delivery-planning)が宣言した並行・直列の実行形態と、code-generation 段の実際の実行形態が乖離しても、現行 engine は何も検出しない。2026-08-01 の record 横断調査(並行可能幅 ≥2 の 18 intent)で **計画不履行4件**(bolt-plan が並行可と明記 → swarm 0 件で直列完了)を実測。真因は engine の無音 degrade ではなく「prose の計画が machine directive にならず、conductor がタスク化しないと無音で落ちる」こと(bolt-pr-taskization の同型)。あわせて、edge block の parse 失敗が bolt_dag を無音 null 化する経路(#1893 の `- id:` 形式が現物)が存在し、無音直列化の第2経路になりうる。

## 解決の方向(ユーザー裁定済み骨子 — Issue #1892 本文 2026-08-01)

1. **両方向 fail-closed ガード**: CG 実行形態 ⇔ bolt_dag の一致を engine が強制。並列計画→直列実行(計画不履行)と直列計画→並列実行(依存違反 — より危険)の両方向で発動。発動点は (a) directive 発行時(tryEmitSwarm / firstUncoveredBatch)と (b) stage approve 時の実績突合(audit SWARM イベント vs bolt_dag — engine 迂回の手動 fan-out も捕捉)。
2. **逃し弁は計画訂正のみ**: 実行時申告 verb は設けない。停止 → 裁定 → 計画成果物(unit-of-work-dependency.md / bolt-plan)の edge+理由訂正 → compile → 再評価。実行形態の正本を計画1箇所に保つ。
3. **bolt_dag null/stale の fail-closed**: 並行幅を持つ計画があるのに bolt_dag が null(edge 欠落・parse 不能・compile 陳腐化)なら loud エラー(無音 degrade 禁止)— recompile-before-construction-bolt-dag の prose 手動確認の機械化。
4. **3部メッセージ契約**: ガードメッセージは「観測事実(数字)/重み(実測根拠)/公認の出口(ファイル名・コマンド名指しの具体手順)」— 禁止でなく redirect。
5. **落ちる実証**: 両方向の違反注入で赤、正当直列6件相当の corpus で緑、bolt_dag null 注入で loud。
6. **#1893 同梱**: parser 非受理形式の是正(方向はクロスレビュー証拠を受けて requirements 段で確定 — 受理拡張 / record 訂正+loud 拒否のどちらが正か)。

## 成功指標

- 計画不履行クラス(実測4件)の再発が engine で構造的に阻止される(ガード発動またはグリーン通過のどちらかしかない)。
- 正当直列6件相当の運用が誤発動なしで通る(corpus sweep green)。
- bolt_dag の無音 null 化経路が 0 になる(#1893 含む)。

## スコープ境界

- 対象: bolt_dag を持つワークフロー(units-generation を実行するスコープ)。degrade スコープ(units-generation SKIP)は bolt_dag 不在が正常系のためガード対象外。
- 過去 record への遡及検査はしない(実行時+approve 時のみ)。
- 実行時申告 verb の新設は禁止(裁定2)。

## リスク

- 誤発動(正当直列への偽陽性)→ corpus sweep を完成条件に含めて封じる。
- #1893 の cross-review が REFRAME になった場合は同梱スコープを再裁定(編入前提 = 2名成立)。
