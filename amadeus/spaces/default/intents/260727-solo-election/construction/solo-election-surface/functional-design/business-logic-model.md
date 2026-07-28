# Business Logic Model — solo-election-surface (U2)

上流入力(consumes 全数): requirements.md(FR-02/04/08/09/10/11/12/13)、component-methods.md(SKILL 内挿点・spawn テンプレ構成の設計正本)、decisions.md(ADR-3/4)、unit-of-work.md(U2 スコープ)、unit-of-work-story-map.md(発動〜再議論のジャーニー)、components.md(SKILL/team.md の変更対象)、services.md(異常系分岐の手順文脈)。

## ソロ手順の論理(SKILL 内挿の内容設計 — 規則は書かず手順のみ)

### 発動判定(conductor の知識作業)

```
判断イベント発生:
  仕様変更 or 正準リスト事項     → 選挙対象外(ユーザー専権へ)
  設計逸脱 / ブロッカー / §13 選定 → 自動発動
  その他                         → ユーザーが「選挙にかけて」と言ったときのみ発動
発動時:
  Agent tool(spawn)不可         → loud 1行告知 → 選挙を開かずユーザー裁定へ(FR-10 AC の2分岐のうち不開設を採用 — 申告: 開いたまま collecting 保存は「投票者が構造的に現れない選挙」を store に残し、close-rejected の手動後始末を強いるため棄却。発動前判定なので open 前に降格できる)
  可                              → open(voters = subagent-1, subagent-2)→ CLI 指令ループへ
```

### spawn テンプレ(FR-02 — 構成3要素のみ)

テンプレ変数は2つのみ: {viewPath}(DeliveryDirective.viewPath 由来 — 実型は {voter, viewPath, spawnInstruction}、amadeus-election-transport.ts:52-56。electionId フィールドは存在しない)と {electionId}(conductor がループ外で保持する値 — next の distribute directive / --election フラグ由来、amadeus-election.ts:69)。DeliveryDirective.spawnInstruction(レンダリング済み1行、buildSpawnInstruction :116-118)は verbatim でテンプレへ転送し、独自再構築しない(C-02)。固定手順文: 「view を読む → 独立に証拠を実測 → ballot JSON(voterKind: "subagent"、voter: 指定名)を作成 → vote verb を自分の Bash で実行 → 受理 JSON を確認してから完了報告。投票完了までターンを終えない」。main agent の分析・推奨・他票状態は構造的に含められない(テンプレに差し込みスロットがない)。

### 票未着・再議論・降格の手順(FR-04/08)

```
票未着(status の pending に残存): 再spawn 1回(同一 voter 名)→ なお未着 → ユーザーへ(選挙は collecting のまま保存)
再議論(discussed 解決後): 同一個体を resume(相手票の留保・rationale を verbatim 添付)→ amend 提出
  resume 不能: 新規 spawn で同一 voter 名を引き継ぎ、その旨を record に残す(ADR-4 の降格 loud 化)
  再 tally 後も 5 残存: ユーザーへ
```

## team.md ノルム改定の論理(FR-12)

ソロモード節へ追記する規範の骨子: (1) 2体 subagent 選挙を正規の選挙形態として認める(「存在しないメンバーや投票結果を捏造しない」は不変 — subagent 票は実在の実行主体による実在の票) (2) 発動3類型+明示発動(SKILL と同文 — FR-09 の grep 照合対象) (3) 裁定効力: 2-0 即採用、割れたケース(スプリット/棄権/ブロック/再議論後残存)はユーザーへ (4) main agent は管理委員専任・不投票。矛盾照合: 選挙関連規範のチームモード限定は team.md「共通の品質契約」節が宣言しており(org.md に選挙規範は存在しない — レビュー実測)、追記は「加算」で矛盾しない(§13 admission 相当の突き合わせを code-generation で実施)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T15:17:01Z
- **Iteration:** 2
- **Scope decision:** none

Major(DeliveryDirective 実型 {voter,viewPath,spawnInstruction} への訂正)・Minor 2件(FR-10 分岐申告・team.md 帰属)を実測閉包。残余 Minor(transport.ts 短縮名)は conductor がフルパスへ機械是正済み。

### Findings

- None
