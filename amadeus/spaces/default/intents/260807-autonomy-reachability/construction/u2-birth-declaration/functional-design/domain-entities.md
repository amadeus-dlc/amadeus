# Domain Entities — u2-birth-declaration

上流入力(consumes 全数): requirements.md(FR-1a〜1d — ユーザー仕様裁定 Q1)、components.md(C1)、component-methods.md(takeAutonomyFlag 不変・applyLaunchAutonomyDeclaration 拡張・intent-birth 引数)、unit-of-work.md(u2 境界)、unit-of-work-story-map.md(物語「1コマンドで宣言して走行開始」)、services.md(engine 主導の直列フロー — 宣言搬送の orchestration 契約)。

## 変更エンティティ

### LaunchDeclarationJudgment(`amadeus-orchestrate.ts` C13 の判定 union — 拡張)

| 変更 | 内容 |
|---|---|
| carry の発火点 | judgment 0 は「carry 可否の仮判定」に留め、**carry の確定は birth print directive の emit 点(Branch 7b `:3151-3168` / 9a `:3223-3237` / 4a)**で行う — 同一 `next` 呼び出しが birth に到達する場合のみ `intent-birth` コマンド行へ `--autonomy <none\|semi\|full>` を付与(**full も搬送する** — 処理は intent-birth 側で分岐。Review iteration 1 BLOCKER 1・iteration 2 残余是正) |
| ask 経路の扱い | 同一呼び出しが Branch 8(scope 未確定 freeform → ask)へ落ちる場合、宣言は **loud 拒否+案内**(「`--scope` を明示するか、birth 後に `--autonomy` で宣言」)— 無音消失なし、t450-branch:83 の不変条件維持(**ユーザー裁定 2026-08-07: FR-1a 精密化**) |
| エラー残存 | `stateContent === null` かつ birth 記述なし → 現行文言の loud error を維持 |
| 値域・値なし | 従来どおり loud refuse(t449 ピン不変) |

### BirthDirectiveWithDeclaration(birth print directive の搬送拡張 — ADR-1 Option A)

`intent-birth` コマンド行に `--autonomy <none|semi|full>` を含めて emit する(**full も搬送し、full の分岐処理は intent-birth 側が担う** — iteration 2 残余是正: 旧「full は含めない」記述は C13 側設計の名残であり撤回)。directive の message 契約は既存の run-then-continue 形を維持。

### IntentBirthAutonomyArg(`amadeus-utility.ts` intent-birth の新引数)

- `--autonomy <none|semi>`: state 生成直後に `applyProductionAutonomyMode`(u1 で canonical 化済み)を呼ぶ。provenance = 宣言打鍵の実 HUMAN_TURN(latestHumanTurnId — フラグ自体は provenance にならない: t450-branch:119 の契約維持)
- `--autonomy full`: intent-birth は**受理する**が mode を適用しない — birth を成立させ、出力に「preview-autonomy → 明示確認 → set-autonomy full」の儀式手順を印字して fail-closed 停止(FR-1b — FR-GRT-006 不変)。**責務は intent-birth 側で一意**(ADR-1 Consequences・component-methods C1 と同一 — Review iteration 1 BLOCKER 2 是正: FD 旧記述「値域エラー・C13 側」を上流に合わせて撤回)。birth 後に grant 儀式が完了して mode=full になれば、既存 judgment 7(`amadeus-orchestrate.ts:1342-1351`)が以後の nudge を担う(新設不要)

## 不変条件

- 宣言の消化は最初の1回のみ(`modeProvenance.kind === "system-default"` の間のみ受理 — 既存ラッチ不変)
- birth が失敗した場合、宣言は消化されない(部分適用なし — birth 原子性の外に mode を書かない)
- コメント `:2943-2946`(Branch 4ab 配置根拠)は「birth は routing でなく workflow 創出であり相乗り禁止の適用外」へ改訂(FR-1d)
