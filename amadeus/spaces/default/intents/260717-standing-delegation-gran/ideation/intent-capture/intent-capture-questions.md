# Intent Capture — 明確化質問(260717-standing-delegation-gran)

<!-- E-OC1 判定証跡(eoc1-evidence-in-questions-header):
判定: 全4問 選挙不要(既決導出 or 後続ステージ送り)— 各問の根拠種別は下記1問1行。
申告: e4 → leader(agmsg 送信 2026-07-17T01:2xZ — agmsg 一次記録。本ヘッダは申告送信時に記入、承認タイムスタンプは受領後に追記)
leader 承認: 2026-07-17T01:19:06Z(agmsg 一次記録 — agmsg-git-evidence-split に基づく出典明示)
回答の記入は leader 承認受領後にのみ行う。 -->

上流入力(consumes 全数): なし(本ステージは consumes 宣言なし — ワークフロー起点)

## Q1: グラント発行の主体・場所はどこに限定するか

- A: leader セッションのみ(発行 verb は発行セッションの実 HUMAN_TURN を接地根拠にする — 現行 delegate-approval と同型)
- B: 任意セッション
- X: その他

[Answer]: A — 既決導出(Issue #1125 提案1項、leader 承認 2026-07-17T01:19:06Z)
根拠種別: 既決導出 — Issue #1125 提案1項「leader セッションの実 HUMAN_TURN を根拠に発行」+現行 handleDelegateApproval の接地ゲート同型(cross-worktree-delegate-delivery の発行側と整合)

## Q2: TTL の既定値はいくつにするか

- A: 本ステージでは決めない — design 段で対照定数(既存 timeout 系 named constant)から導出 or 明示 constants-from-code 手続きで確定
- B: ここで数値を発明する
- X: その他

[Answer]: A — 既決導出(constants-from-code、leader 承認 2026-07-17T01:19:06Z)
根拠種別: 既決導出 — constants-from-code(実在しない要約帯・発明数値の禁止)。ideation 成果物に実装詳細を含めない(ideation ガードレール)

## Q3: 既定除外(グラント対象外)の集合はどれか

- A: PR マージ承認(no-AI-merge)・phase-boundary ゲート・walking-skeleton ゲートの3種を既定除外(Issue 提案3項どおり)
- B: 除外なし
- X: その他

[Answer]: A — 既決導出(Issue #1125 提案3項+standing-approval-scope-limit+P4、leader 承認 2026-07-17T01:19:06Z)
根拠種別: 既決導出 — Issue #1125 提案3項+standing-approval-scope-limit(常任承認の行為種別限定)+P4。ユーザー方向性確認済みの骨子

## Q4: session 終了時のグラント失効(選択制)の採否はどう扱うか

- A: 本ステージでは決めない — Issue 4項の「選択制」留保を保存し、requirements/design 段の選挙(または pre-approved 分岐)へ送る
- B: ここで採否を確定する
- X: その他

[Answer]: A — 留保保存(citation-reservation-preservation、leader 承認 2026-07-17T01:19:06Z)
根拠種別: 留保保存 — citation-reservation-preservation(留保付き事項を決定として書かず pre-approved 分岐か実装時判断へ落とす)。未決の設計判断の先取り禁止
