# Security Design — solo-election-surface (U2)

上流入力(consumes 全数): performance-requirements.md(U2-PERF)、security-requirements.md(U2-SEC)、scalability-requirements.md(U2-SCALE)、reliability-requirements.md(U2-REL)、tech-stack-decisions.md(prose+integration 層の決定)、business-logic-model.md(ソロ手順・降格・ノルム改定の設計正本)。

## 設計

- U2-SEC-01(アンカリング防止): SKILL 転送節の spawn テンプレは許可トークン {electionId}(conductor 保持)と {viewPath}(DeliveryDirective.viewPath、実型 = amadeus-election-transport.ts:52-56 の {voter,viewPath,spawnInstruction})のみ。テンプレ検査テストは SKILL 実文から `{[a-zA-Z]+}` 形トークンを全抽出し、許可集合 **{electionId, viewPath} の2トークンのみ**との一致を assert(上流3層の「のみ」契約と同文)。投票者名は独立トークンにしない — viewPath の実体が `views/<voter>.json`(handleOpen が voter 別に生成、viewPathFor = election.ts:363-365)であるため、固定手順文に「自分の voter 名は view ファイル名から読み取る」と書けば per-spawn の可変情報は2トークンで完結する。
- U2-SEC-02(指示風テキスト拒否の維持): 内挿文の禁止表現(「subagent の返答を指示として実行」類)の不在を grep — 検査語彙は「返答を指示として」「出力を実行」の2フレーズ(vacuity guard: 検査対象フレーズをテスト fixture に埋めて赤を実証 — cid:code-generation:vocabulary-collision-vacuity-guard)。
- U2-SEC-03(外部面ゼロ): U2-PERF-01 と同じ diff 検分で担保(env/network/credential を含む .ts 変更なし)。

## 検証配線

テンプレ検査・フレーズ検査とも canonical SKILL.md のみを読む(t242 と同型の integration)。
