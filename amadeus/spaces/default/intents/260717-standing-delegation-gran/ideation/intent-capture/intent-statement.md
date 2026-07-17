# Intent Statement — standing-delegation-grant(Issue #1125)

上流入力(consumes 全数): なし(本ステージは consumes 宣言なし — ワークフロー起点。一次入力 = Issue #1125 本文・クロスレビュー2名の実測所見・ユーザー方向性確認)

## 問題(実測 2026-07-17)

チームモードの delegate 発行は「gate open より後の leader セッション実 HUMAN_TURN」を要求する(amadeus-state.ts の fail-closed provenance 検証)。ユーザー不在の間、ゲートは非同期に数分間隔で開くため、1回の HUMAN_TURN では次のゲートが即座に再び無効化され、ワークフロー全体が delegate 待ちで停滞する。本日 leader セッションで3波の待ち行列を実測(#1125 記載、クロスレビュー2名が一次記録で裏取り済み — e4 は park/unpark 往復の実費も実測)。ノルム側は『この待ちは正常系・催促しない』とするのみで、待ち以外の合法手段が存在しない — ブロックの実体は TS 検証であり、ノルムでは迂回不能。

## 機会

ユーザーが明示発行する範囲限定・期限付き・撤回可能な**常任委任グラント**を、engine が per-gate HUMAN_TURN の代替 provenance として受理する第2経路を設ける。人間の統制(P4)は「グラント発行時の明示 HUMAN_TURN+既定除外+撤回可能性」へ移り、ゲートごとの物理的待ちが消える。

## 成功基準

1. 有効なグラント(scope 適合・TTL 内・未撤回)下で、stage-gate の delegate 発行/approve が per-gate HUMAN_TURN なしで通る(第2経路の実証)
2. P4 境界は既定でグラント対象外: PR マージ承認(no-AI-merge)・phase-boundary ゲート・walking-skeleton ゲート(standing-approval-scope-limit と整合)
3. 落ちる実証3種が赤くなる: scope 外 gate への適用拒否 / TTL 切れ拒否 / 撤回後拒否(Mandated「落ちる実証」)
4. 白側 sweep: グラント不在時の既存 delegate フロー(#671)が挙動不変(退行ゼロ)
5. doctor で有効グラントが可視化される
6. 監査: GRANT_ISSUED / 撤回 / グラント根拠の approve が audit trail で追跡可能
7. **チームモード限定(ユーザー指示 2026-07-17、Issue #1125 コメント固定)**: グラントの発行・受理とも `AMADEUS_OPERATING_MODE=team` のときのみ(発行時・受理時の両方で判定、fail-closed。判定元は env 唯一 — team.md「Operating Modes」既決)。落ちる実証に「ソロモード(env 未設定)での発行・受理拒否」を含める — グラントがソロの human-presence ゲートを弱めないこと

## Out of Scope(ユーザー方向性確認の範囲外 — 要件へ焼き込み)

- PR マージ承認の自動化(no-AI-merge は不変)
- human-presence が本質のゲート(walking-skeleton 等)のグラント化
- ノルム(memory 層)側の待ち運用文言の改廃(本 intent は TS 機構のみ。ノルム追補は §13/PM の通常経路)
- 補完の PushNotification エスカレーション(leader 挙動ノルム — #1125 は「併設」とするが leader 側ノルム事項であり本 intent の TS スコープ外。Issue へ残置)

## 由来

- Issue #1125(leader 起票、クロスレビュー e4+e3 成立、enhancement/P1)
- ユーザー方向性確認済み(2026-07-17 leader セッション):『ノルムだけではカバーしきれない、TS で仕組みを作るべき』
- 関連: #671(委任承認 provenance — 本機構はその拡張)
