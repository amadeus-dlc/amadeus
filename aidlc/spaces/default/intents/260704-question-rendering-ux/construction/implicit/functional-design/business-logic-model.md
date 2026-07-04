# Business Logic Model — 質問レンダリング UX の処理設計

上流要求は `../../../inception/requirements-analysis/requirements.md`（R001〜R009）である。
規則の正準は `business-rules.md`、構成要素と変更対象ファイルの正準は `domain-entities.md` とする。

## 実行順序（TDD）

1. **RED — wiring 検査の拡張（R008 前半）**
   `dev-scripts/grilling-wiring.ts` に次の assert を追加し、現状の annex 群で fail することを確認する。
   - 正準 annex に Display language 中立節が存在する。
   - 正準 annex に Grill me レンダリング規則（one question per tool call、推奨マーク、分割規則）が存在する。
   - Codex annex（`question-rendering-codex.md`）が存在し、正準 label 4 個（Guide me / Grill me / I'll edit the file / Chat）、`request_user_input`、フォールバック書式、正準 annex への参照を持つ。
   - engine-bridge に会話言語文言（Japanese 固定でない）が存在する。
   - Codex annex が promotion 同期対象（`affectedRelPaths`）に含まれる。

   あわせて eval fixture（`dev-scripts/evals/grilling-wiring/check.ts` の `makeFixture`）を新 assert が要求する内容へ拡張し、「揃った fixture は pass」「新要素を欠落させた fixture は fail」の両方を確認する。RED の対象は実 repo（annex 変更前の実ファイルが新 assert で fail すること）であり、fixture eval は検査拡張と同時に GREEN を維持する（前例: Intent 260704-grilling-mode-wiring）。
2. **正準 annex の拡張（R001、R005、R006）**
   `skills/amadeus/references/question-rendering.md` に、(a) harness routing 行（「Codex では question-rendering-codex.md の束縛を使う。中立節は両 harness に適用」）、(b) Display language 中立節、(c) Grill me レンダリング中立節 + Claude Code 束縛（AskUserQuestion、1 呼び出し 1 問、4 択上限、5 択以上分割、Other 組み込み）を追加する。
3. **Codex annex の新設（R003、R004、R007）**
   `skills/amadeus/references/question-rendering-codex.md` を作成する。構成は `frontend-components.md` のフロー定義に従う。
4. **engine-bridge の整合（R002）**
   `skills/amadeus-grilling/references/engine-bridge.md` の手順 5 を会話言語 + 正準ラベル記録の文言へ更新し、Grill me レンダリング規則（正準 annex の中立節）への参照を追加する。
5. **GREEN 確認**
   `npm run grilling-wiring:check`（または相当の package script）で pass を確認する。
6. **昇格同期（R009）**
   `bun run dev-scripts/promote-skill.ts amadeus --replace` と `bun run dev-scripts/promote-skill.ts amadeus-grilling --replace` で昇格し、`npm run test:it:promote-skill` を実行する。
7. **検証**
   `npm run test:all`（parity:check を含む）と `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260704-question-rendering-ux` を実行し記録する。

## 正準 annex の節構成（変更後）

```
# Question Rendering — annex（正準）
├─ Mechanism（既存: AskUserQuestion 1:1 マップ）           … Claude Code 束縛
├─ Harness routing（新設・冒頭付近）                        … Codex は codex annex 参照
├─ Display language（新設・harness 中立）                   … R001 の規則
├─ Mode selection（既存 4 択）                              … 変更なし（label と順序維持）
│   └─ If the user picks Grill me（既存）
│       └─ Grill me rendering rules（新設・harness 中立 + Claude Code 束縛） … R005、R006
└─ Harness-specific behaviors（既存: batching、Other、Answer capture） … 変更なし
```

- 既存節の label・順序・文言は温存し、追加は新節と参照行に限る（N001。既存 wiring 検査の marker / order assert が回帰を検知する）。
- **code-generation への申し送り（順序回帰）**: 既存 order assert は 4 label の初出位置（`indexOf`）で順序を判定する。Mode selection 節より前に置く新節（Harness routing、Display language）の文面には `Guide me` / `Grill me` / `I'll edit the file` / `Chat` の label 文字列を含めない（含める場合は正順を厳守する）。
- **code-generation への申し送り（参照解決の限界）**: `pathResolutionIssues` は `engine-bridge.md` 参照だけを実解決検査する。Codex annex → 正準 annex の参照は文字列一致の assert に留まるため、相対パス（同一ディレクトリ、`question-rendering.md`）を目視確認する。

## Codex annex の節構成（新設）

```
# Question Rendering — Codex harness annex
├─ Shared rules（正準 annex の Display language / Grill me rendering を参照）
├─ Mechanism（request_user_input への spec マッピング表）
├─ Enablement（experimental_request_user_input、exec mode 非対応、既定 off）
├─ Mode selection（3 択 + custom への畳み方。Chat は custom 経由と質問本文に明記）
├─ Grill me（1 呼び出し 1 問、2〜3 択 + custom、custom = 議論・自由記述の受け皿）
└─ Text fallback（構造化ツール不可時の提示書式と回答記録の契約）
```

## 処理フロー（実行時、各 harness 共通）

```
structured question を提示する必要が生じる
  → 実行 harness を判定（AskUserQuestion が使える → Claude Code 束縛 /
     request_user_input が使える → Codex 束縛 / どちらも不可 → Text fallback）
  → decision を amadeus-log.ts で記録（正準 label の CSV）
  → 表示: prompt / label / description を会話言語へ訳して提示（Display language 節）
  → 回答受領: 正準 label へ逆解決（表示訳・記号・custom 入力のいずれからでも）
  → answer を amadeus-log.ts で記録（正準 label）
  → questions ファイルへ [Answer]: 正準ラベル + 表示訳を併記で書き戻し
```

- 逆解決が一意にできない自由記述は、要約せずそのまま記録し、正準 label への割り当てを人間に確認する（stage-protocol「Never summarize User Input」と両立）。

## データフロー

正準 label は spec → 表示（訳出）→ 回答（逆解決）→ 記録の全経路で不変である。
訳出と逆解決は表示層（annex の指示に従う実行時挙動）だけに存在し、ファイル・audit・エンジン report には表示訳が単独で現れない（併記のみ許す）。
