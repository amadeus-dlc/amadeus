# Feasibility Assessment — solo-election

上流入力(consumes 全数): intent-statement.md — 裁定済み設計パラメータ(発動条件 D / 定足数2体 / 裁定効力 A / スケルトン A / スコープ A / GoA 2体適用表)を評価対象の要求として使用。

## 総合判定: GO

D-12 裁定の残余実装という位置づけどおり、輸送層・記録層は subagent 側が既に実装済みであり、残るギャップはすべて既存機構の延長で実装可能。外部サービス依存・新規ランタイム依存はゼロ。

## 実測済みの実現基盤(すべて本 worktree HEAD `3eba39a90` で直読)

| 面 | 実測事実 | 出典 |
|---|---|---|
| 票スキーマ | `VoterKind = "member" | "subagent"` が ballot 必須属性として定義済み | amadeus-election-model.ts:126、parse 検証 :224 |
| 輸送抽象 | `TransportKind = "agmsg" | "subagent"`、provenance `"reported-by-conductor"`、per-voter shuffled blind view、配送記録 `reportDelivery` | amadeus-election-transport.ts:31-32,183-185 |
| 構造的 blind | 配布ペイロードは election id + view path のみ — 推奨・先行票はフィールドとして表現不能 | amadeus-election-transport.ts:42-44 |
| CLI 輸送分岐 | notify は subagent 輸送が既定、agmsg は `--team`/`--from` 必須の明示指定 | amadeus-election.ts:335-348 |
| 投票経路 | `vote --election <id> --file <ballot.json>` — 票 JSON を投票者自身が提出可能(subagent は Bash で CLI 実行可) | amadeus-election.ts:386-396 |
| 選挙ストア | `amadeus/spaces/default/elections/elections.json` 実在 | ls 実測 |

## 実装ギャップ(本 intent のスコープ)

1. **tally の2体 GoA 意味論**(最重要・実装必須): 現行 tally(amadeus-election-model.ts:440-476)は Q6 適用表と3点乖離する —
   - `discuss >= 2` で hold: 2体では 5×1票が素通りする(Q6: 1票で追加議論)
   - quorum-short は `favor+against === 0` のみ: 4(棄権)1票で残1票の単票成立が起きる(Q6: 成立不能→エスカレーション)
   - #1261 以降 winner は choice 票数で決まるため、同一選択肢への 賛成1+反対(7)1 が established になる(Q6: スプリット→エスカレーション)
   → tally を定足数サイズ認識(voters-aware)にする純関数変更+regression テスト。チームモード(既存票数帯)の挙動は不変が受け入れ条件。
2. **SKILL.md ソロ分岐**: `packages/framework/core/skills/amadeus-election/SKILL.md` に "subagent" への言及 0 件(grep -c 実測)。ソロ時の管理委員手順(open → spawn 2体 → 票回収確認 → tally → record 固定)の directive 追従手順を追記。
3. **conductor 駆動プロトコル**: subagent spawn プロンプトの定型(blind view の verbatim 参照・CLI 投票の同期完遂文言・成果物書込禁止)— 既知ノルム(builder-prompt-sync-completion 等)の選挙適用形。
4. **発動条件の配線**: 3類型(設計逸脱・ブロッカー・§13 選定)の自動発動はノルム+SKILL 手順として明文化(エンジン変更は不要 — 発動は conductor の判断点)。
5. **team.md ノルム改定**: ソロモード節の「複数の独立セッションを前提とする規則は適用しない」を、2体 subagent 選挙を正規形態として認める形へ改定。

## 外部前提の検証

- **Agent tool(subagent spawn)**: 本ハーネス(Claude Code)で利用可能・実証済み(§12a reviewer 運用で常用)。subagent は Bash を持ち CLI を実行できる。
- **spawn 不能ハーネス**: 降格(全件ユーザーエスカレーション=現行挙動)を loud 告知 — 新規依存なし。
- **npm/レジストリ等の外部サービス**: 不要。
