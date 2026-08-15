# Requirements — intent 260815-rfc-autonomy-modes(RFC-0001 実装)

> Depth: Standard。上流入力: RFC-0001(approved — 要求の唯一の正本。本書は実装要件への写像であり再裁定しない)、intent-statement.md、scope-document.md、codekb(architecture.md / code-structure.md の §260815-rfc-autonomy-modes — RE が RFC 引用 11 件の currency 10/11 一致・1 件行移動 `amadeus-orchestrate.ts:2046` を実測済み)。人間裁定: requirements-analysis-questions.md(Q6=A / Q9=A / Q12・Q13=スコープ外、実 HUMAN_TURN)。
>
> **resolution-neutral 原則**: RFC の設計裁定質問(Q2 / Q4 / Q5 / Q7 / Q8 / Q10 / Q11 / Q14 / Q15 / Q18 / Q19)は application-design 段で裁定する。本書の FR・受け入れ基準はどの裁定選択肢とも両立する outcome レベルで書く。

## Intent 分析

Intent Autonomy Mode の実装が RFC-0001 の再定義と乖離しており、機構起因の人間停止(実測 172 件 + §13 0 件確認 79 件)と 11 のコンセプト逸脱(D1〜D11)を生んでいる。本 intent は RFC の bound-surfaces(RE で現 main 断面の有効性を実測済み)を RFC の意味論へ揃える。

## Functional Requirements

### FR-1: RecommendationOutcome 判別ユニオン(Q1=A)
梯子全段の共通戻り型として `unique(optionId, basis)` / `contested(候補列挙, 事由)` / `none(事由)` の判別ユニオンを導入し、選挙 hold は contested/none へ写像、エージェント推奨(梯子⑤)にも contested を返す自由を与えること。contested の提示は候補+根拠+非一意の理由+推奨順で行い、非対話中断時も同内容を park 理由へ記録して復帰時に再提示できること。
受け入れ確認: 落ちる実証 — 現行の「推奨導出が常に 1 件」(production.ts:833-838 の定数 approve)経路で contested が表現不能なことを Red で実測 → 導入後、unique 以外が裁定順序 3 へ流れることをテストで pin。頻度予算の受け入れ基準値は Q19 裁定(設計段)に従う。

### FR-2: 対話/非対話のセッション単位検出(Q3=A′)
一次信号は既存 HUMAN_TURN 造幣パイプライン(`mintHumanPresence`)の再利用とし、新検出面を最小化。Stop hook の transcript 分類は補助信号として現行位置に残すこと。
受け入れ確認: 対話セッション(実 HUMAN_TURN あり)と非対話セッション(なし)で後続 FR-3/FR-4 の分岐が分かれることを統合テストで実測。棄却済み代替(鮮度ウィンドウ / TTY / 明示フラグ)を実装しないこと(文書検査)。

### FR-3: 非対話中断の一般機構(D1/D5)
park guard の「無人 run は走り続けろ」前提(state.ts:1599 — autonomous mode ∧ 未消費 HUMAN_TURN 0 で park 拒否)を廃棄し、非対話で裁定不能(FR-1 の unique 以外・人間専権事項)に至ったワークフローが理由付きの一級待ち状態へ入れること。resume 契約(記録内容・再開者・park 会計 — Q7)、自己 park 脅威対策(Q8)、REPAIR_STALLED との表現統合(Q14)は設計裁定に従う。
受け入れ確認: 落ちる実証 — 現行 park guard が非対話 full の park を拒む Red を実測 → 導入後、非対話 contested が理由付き待ち状態へ入り、復帰時に同内容で裁定を受けられることを pin。

### FR-4: 裁定順序の統一(D4/D10)
すべての裁定点が RFC 裁定順序 — (1) 人間専権判定 (2) 導出(ノルム・既裁定・選挙) (3) unique なら自動、それ以外は対話→人間 / 非対話→FR-3 — に従うこと。梯子⑤の「決められなくても進む」縮退を除去し、対話モードの full が人間裁定へ到達する経路(Stop hook carveout 再定義 — Q11)を持つこと。
受け入れ確認: 落ちる実証 — 現行梯子が contested 相当でも進む Red を実測 → 置換後、対話 full で AskUserQuestion 経路・非対話 full で FR-3 経路に入ることを pin。人間専権事項(仕様変更・goal 改訂・選挙 hold・委任条件外マージ)が mode に依らず自動裁定されないことの無退行テスト。

### FR-5: semi の再定義(Guide-level)
semi = full + 人間ゲート 2 種(フェーズ境界・walking-skeleton)のみ。`SEMI_ROUTINE_INTERACTIONS`(intent-autonomy.ts:581)の差し替えと第 2 ガード(`allowsOccurrence` :636-640)の改修、Bolt 自律化の投影 3 面同時改修(書込 production.ts:713 / 読取 orchestrate.ts:2046 / 乖離判定)。**FR-3 の park guard 廃棄が先行依存**(誤順で semi が park 能力を失う)。advisory 延期自動化と semi 効果認可上限は Q4 裁定に従う。
受け入れ確認: semi で phase-gate と WS だけが人間へ届き、stage-gate・question・§13・Bolt バッチ境界が自律進行することを mode 別マトリクスのテストで pin。実測 172 件クラス(milestone 種の構成上不在)の再現 fixture が新実装で停止しないこと。

### FR-6: 宣言と projection の乖離の loud fail 全 mode 化(D3/D9)
現行の full 限定・stderr のみの silent 検出を、none/semi/full すべてで loud fail にすること。
受け入れ確認: 落ちる実証 — semi/none の乖離が現行で無検出な Red → 全 mode で fail する pin。

### FR-7: 設定軸の分離(D2/D11、Q17=A)
`solo-election.trigger.mode` キーを廃止し mode から導出(none→manual 相当、semi/full→auto 相当)。旧キー残存は loud fail。mirror(`intent-mirror.github.issue.mode`)と finding(`finding.github.issue.creation.mode`)は consent 軸として独立維持し、実効 consent を `--status` / statusline で常時可視化。キー改名の要否・互換面は Q18 裁定に従う。
受け入れ確認: 落ちる実証 — 旧キーを含む config で loud fail(exit 非 0 + 理由)を pin。mode 導出の対応表テスト。consent 軸が mode 変更に影響されない独立性テスト。

### FR-8: UI 真実性の契約(付録 A 指示 6・7)
config・status・statusline の表示と実挙動の乖離を作らないこと(表示は実効値のみ。「manual と表示して auto で動く」類の新設禁止)。
受け入れ確認: `--status` / statusline の表示値が実効判定関数と同一のソースから導出されることのテスト + 文書検査。

### FR-9: マージの条件付き委任の provenance 機械化(Q6=A)
委任条件の正本は既存の常任マージ承認ノルム(team.md — 必須 CI green ∧ converged:true 実測)とし、新設 config を作らない。実装は委任実行時の provenance 記録(委任根拠 HUMAN_TURN 参照・実測値)の機械化のみ。定義者 = ユーザー直接裁定、失効 = ユーザー撤回宣言。irreversible 一律拒否の他項目(release / publish 等)は不変。
受け入れ確認: 委任条件を満たすマージの記録に委任根拠参照が残ること。条件不成立時は従来どおり人間承認要求(無退行テスト)。

### FR-10: walking-skeleton ゲートの Stance 従属(Q9=A)
WS ゲート発火判定が Skeleton Stance を参照し、degrade スコープ(stance が skip)では発火しないこと。
受け入れ確認: 落ちる実証 — 現行判定が stance 非参照で degrade でも発火する Red → stance 従属の pin(greenfield 系スコープでの発火は無退行)。

### FR-11: §13「候補 0 件」判定の機械化(Q10)
0 件確認の儀式を AI の自己申告に依存させない機械化(方式は設計裁定)。
受け入れ確認: 設計裁定後の方式に対する落ちる実証(自己申告のみでは 0 件と確定できないこと)。

### FR-12: presence 検査の封鎖(D7/D8)
`approve-batch` の presence 無検証と、ゲート presence 検査の active-scope fail-open を塞ぐこと。
受け入れ確認: 落ちる実証 — 現行の素通り Red を各 1 件実測 → fail-closed 化の pin。

### FR-13: semi milestone 空振り承認の原因調査(D6)
実装前に原因を実測で確定し、欠陥であれば別 Issue へ分離(本 intent では修正しない)。
受け入れ確認: 調査記録(機序・file:line・再現)が record に残り、欠陥なら Issue 起票、非欠陥なら根拠を記録。

### FR-14: 文書・ノルムの同一 intent 同梱(Q16)
ノルム 3 レイヤー(org / team / project)の該当箇所改定、stage-protocol.md 等 bound-surfaces 文書の実装一致、RFC frontmatter への tracking-issue(#3116)記入を実装と同じ変更列に載せること。
受け入れ確認: 文書検査 — 実装挙動と文書記述の一致(mode 別マトリクス)。frontmatter 記入の実在。

### FR-15: 効果の天井の無退行
prohibited effects(new-permission / irreversible / scope-out / norm-waiver / quality-waiver)の自動裁定不可、NORM_CONFLICT の park、code-generation 失敗の無条件停止を保持(FR-9 のマージ委任のみ例外)。
受け入れ確認: 既存の効果認可テスト群の無改変 Green + 新経路(FR-3/FR-4/FR-5)からの prohibited effect 到達不能テスト。

## Non-Functional Requirements

- TDD 必須(Red 実測 → 最小実装 → Green の vertical slice。エラーパス含む)。
- fail-closed 保存: 新分岐は無音バイパス・環境変数逃げ道を作らない(stage 文書の既存契約保存)。
- 後方互換レイヤー禁止(org.md Forbidden)— 旧 `solo-election.trigger.mode` はシムでなく loud fail で置換。
- harness 移植性: 対話検出は既存 HUMAN_TURN パイプライン再利用で新規 harness 依存を増やさない(headless 明示信号の harness 差は RFC Drawbacks どおり許容)。
- 監査・attestation の append-only / 非偽装(P2)。

## Constraints

- 設計裁定(application-design 段、選挙または梯子): Q2(ゲート推奨導出器)/ Q4(semi 効果上限)/ Q5(full 事後検収点)/ Q7(非対話 park resume 契約)/ Q8(自己 park 脅威)/ Q10(§13 機械化方式)/ Q11(Stop hook 再定義)/ Q14(park 表現統合)/ Q15(grant ceremony)/ Q18(キー改名)/ Q19(contested 発火率基準)。複数妥当解は選挙(fresh 2 voter・blind)、留保矛盾は runoff。
- 順序制約: FR-3(park guard 廃棄)→ FR-5(semi Bolt 自律化)の先行依存。FR-1 が FR-4 の基盤。FR-2 が FR-3/FR-4 の前提。
- units-generation / delivery-planning を EXECUTE(Q16 — 並行化は Unit/Bolt で行う)。

## Assumptions

- RFC-0001 の実装引用は RE 実測どおり現 main で有効(1 件のみ `:2046` へ読み替え)。
- 常任マージ承認ノルムは有効に存続している(2026-08-15 裁定、撤回なし)。

## Out of Scope

- Q12(Grill me 非提示の変更)/ Q13(intent birth・compose 承認の自動化)— ユーザー裁定でスコープ外確定。
- RFC 本文の再裁定・棄却済み代替案の再検討。#1241 の本 RFC が要さない部分。#2396 RFC ストア一般化。

## Open Questions

- なし(人間専権 3 問は裁定済み。設計裁定 11 問は Constraints に列挙し design 段へ — 黙示の欠落ではない)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-15T15:48:38Z
- **Iteration:** 1
- **Scope decision:** none

All 15 RFC-0001 capabilities trace 1:1 to FR-1..FR-15 with falling-proof acceptance checks, resolution-neutrality toward the 11 to-be-decided design questions is largely maintained, and human-prerogative boundaries (FR-9/FR-15 re Q6=A) are not widened; a few traceability/structure points are worth tightening but none block engineering start.

### Findings

- FOLLOW-UP | requirements.md FR-4 | interactive-full の AC が AskUserQuestion を名指す — 既存唯一の対話ツールの outcome 命名であり Q11 の機構は未拘束だが、design 段で Q11 代替を封鎖しないことを明示確認する
- FOLLOW-UP | requirements.md FR-5 | capability #11(advisory 延期自動化・quality-waiver 4 箇所)が FR-5 の従属句のみ — 独立 AC アンカーの付与を design/units 段で行い trace を保つ
- FOLLOW-UP | requirements-analysis-questions.md | Q6/Q9 の RFC 出典確認(レビュー時 attested context の列挙落ち — RFC 実文 :58/:61 に Q6/Q9 は実在。conductor 実測で解消済み、記録として残す)
- NIT | requirements.md | 設計裁定 11 問が Constraints 配置で Open Questions は なし — 資料上は明示済みだが後続パスで様式正規化の余地
