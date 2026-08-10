# Intent Capture — 質問票

- **Intent**: `260809-cg-attribution-stats`
- **Stage**: intent-capture (1.1 / IDEATION)
- **Scope**: self-feature / **Depth**: Standard
- **Mode**: chat
- **起点**: GitHub Issue [#2695](https://github.com/amadeus-dlc/amadeus/issues/2695)
- **Mirror Issue**: [#2722](https://github.com/amadeus-dlc/amadeus/issues/2722)
- **確定時刻**: 2026-08-09T10:09:08Z
- **ユーザー承認**: 2026-08-09T10:15:33Z（Chat 抽出内容と #2700 の解消確認を含む）

Issue 本文と独立クロスレビューで確定済みの内容を Chat モードで抽出し、ユーザーの `done` を受けて記録した。

## Q1. どの問題を解決するか？

- A. 現行 `stage-stats` が code-generation ステージの net 時間だけを示し、既存 audit で説明できる時間と説明できない時間を分離できない問題
- B. `stage-stats` 自体の実行性能の問題
- C. 新規 audit event が不足している問題
- D. モデル・ハーネス別の帰属がない問題
- E. 特定区間の効率化施策がない問題
- X. Other

[Answer]: A — 観測可能区間の union と帰属不能残余を分離し、観測できない時間を実装・検証・レビュー等に推定配分しない。**Mode:** chat。**Evidence:** Issue #2695 「エレベーターピッチ」「対象範囲」。

## Q2. 誰が利用し、どの痛みを解消するか？

- A. Amadeus を運用・自己開発するチーム。重いステージのどの時間が現行 audit で説明でき、どこに追加計装が必要かを判断できない
- B. Amadeus と無関係な一般のアプリケーション開発者
- C. GitHub プロジェクト管理者のみ
- D. CI ランナー管理者のみ
- E. モデルプロバイダーのみ
- X. Other

[Answer]: A — 既存 audit の説明可能範囲と観測ギャップを実測で切り分け、次の計装・効率化投資を判断できるようにする。**Mode:** chat。**Evidence:** Issue #2695 「エレベーターピッチ」「影響・価値」。

## Q3. 成功をどう測るか？

- A. 適格 window の全数で会計恒等式が成立し、曖昧さを推定せず診断でき、3形式の semantic parity と実サイズ stdout の完全性が検証される
- B. category 時間の合計が必ず 100% になる
- C. code-generation の実装時間を直接回答できる
- D. 帰属不能時間を自動的に4フェーズへ配分できる
- E. 新しい audit event を追加できる
- X. Other

[Answer]: A — 各 attribution window で `observableSeconds + unattributableSeconds = netSeconds` および `coverage + unattributableRate = 1` を保証する。Markdown・CSV・JSON の母集団・規則・除外件数を一致させ、65,536 bytes を超える出力の consumer 完走を含む。**Mode:** chat。**Evidence:** Issue #2695 「完了条件」1〜10。

## Q4. このイニシアチブのトリガーは何か？

- A. #2405 で code-generation の大きな net 時間が実測された一方、独立クロスレビューで既存 event から4フェーズの完全な実時間は復元できないと確定した
- B. 新規規制への対応期限
- C. 競合製品の同等機能
- D. ユーザーからの緊急障害報告
- E. モデル利用料金の急騰
- X. Other

[Answer]: A — 対象 corpus で code-generation は `n=109`、net 中央値 `4,721 秒`、net P95 `49,247 秒`。クロスレビューの反証を受け、完全帰属ではなく観測可能区間と帰属不能残余の測定へ範囲を絞った。**Mode:** chat。**Evidence:** Issue #2695 「背景」「改訂理由」。

## スコープ裁定

> issue記載からスコープ縮小は許されません。このIntentでカバーしてください。

- Issue #2695 の `In`、分節・会計規則、event eligibility、Markdown／CSV／JSON 出力、完了条件 1〜10 をすべて本 Intent の必須範囲とする。
- Issue 本文が定めた `Out` だけを範囲外とし、完了条件や検証面の分離・延期によるスコープ縮小を行わない。
- #2700 の終了経路欠陥は解決済みと実測確認した。ただし本 Intent が追加する出力に対する完了条件 10 は省略せず、サイズ増加後の3形式を本 Intent 内で検証する。

## #2700 の解消確認

- [Issue #2700](https://github.com/amadeus-dlc/amadeus/issues/2700) は 2026-08-09T06:06:45Z に CLOSED。
- [PR #2702](https://github.com/amadeus-dlc/amadeus/pull/2702) は merge 済みで、`stage-stats` の `process.exit(main(...))` を `process.exitCode = main(...)` へ変更した。merge commit `1c4a49d4ac2f17c3ba76ef702765521baf6eaca2` は現在の HEAD の ancestor。
- [PR #2706](https://github.com/amadeus-dlc/amadeus/pull/2706) は同根スイープとして `subagent-stats` の同型切断を修正し、他候補の characterization test を追加した。merge commit `73d6c461859c05c33ca14033ec4889be04e6cecd` も現在の HEAD の ancestor。
- `bun test tests/integration/t487-stage-stats.integration.test.ts` は 20 pass / 0 fail。JSON の 64 KiB 超 fixture、full capture と pipe byte 一致、exit 0／1／2 を固定している。
- 現行 corpus の source tool で full capture と pipe の SHA-256 は3形式すべて一致し、producer／consumer はすべて exit 0。実測 byte 数は Markdown `53,070`、CSV `48,601`、JSON `107,108`。
- source tool と Codex self-install の JSON `| jq empty` はともに producer 0 / consumer 0。
- 現行 corpus で 64 KiB を超えるのは JSON だけであり、既存 t487 の oversized regression も JSON だけを直接固定している。そのため、#2695 の出力追加後に Markdown／CSV／JSON の各形式を 65,536 bytes 超 fixture で検証する責務は本 Intent に残る。

## 完全性・矛盾検査

- 未回答の `[Answer]:` は 0 件。
- 問題、対象、成功条件、トリガーは Issue #2695 の最新本文と一致する。
- 「実装時間を推定しない」と「観測可能区間を実測する」の間に矛盾はない。
- #2700 の終了経路欠陥は PR #2702 で解消済み。#2695 の出力追加後の3形式・実サイズ検証は本 Intent でカバーする。
