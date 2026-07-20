# Design Decisions — 260720-hold-choice-resolution

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## ADR-1: tie の検証はテーブル空化+専用分岐(FR-1 の実装形)

- **Context**: HOLD_RESOLUTIONS は静的 Record<string, ElectionState> で、choice:<n> は election ごとの動的値 — テーブル引きでは表現不能。
- **Decision**: tie 行を `{}` に空化し、handleHoldResolved の resolution 検証を **tie/非-tie の相互排他 if/else** へ再構成する — tie 側は parseChoiceResolution+choices 実在照合で `resumedTo="tallied"` を直接代入し、**generic table 検証を通らない**(バイパスでなく到達しない構造)。else 側は現行 :201-207 をブロック内へ移す(検証条件・エラー文言無変更、変数名のみ shadowing 回避リネーム — 挙動同一)。エラー文言は既存様式+実在 internalNo 列挙(`choice:<n>` 形)の valid ヒント。(iteration 1 Critical 是正: 直列 const のままでは tie の有効入力が空テーブル lookup で exit 1 になる制御フロー欠陥を、相互排他分岐の明示で封鎖)
- **Consequences**: 非 tie reason の経路は1行も変わらない(E-TCRCG=A 維持の構造保証)。tie の二値投入は分岐で loud 拒否(e4 Q3 留保の実装形)。
- **Alternatives Rejected**: (a) テーブル値を関数化(Record<string, ElectionState|Validator>)— 全 reason の検証コードパスが変わり blast radius 過大。(b) 事前に choices から動的テーブル生成(choice:1→tallied, ...)— 生成タイミングの二重管理と、エラー文言の valid 列挙が Object.keys 頼みになり choice 増加時に肥大。

## ADR-2: 描画は rulingOverride 合成の拡張のみ(record.ts 無変更)

- **Context**: FR-3 の描画点。renderPersistDraft は rulingOverride param(#1268 既設 seam)を持つ。
- **Decision**: handleRender の override 合成に choice 分岐を追加し、record.ts は触らない。旧二値 override(他 reason 由来)は分岐の else でそのまま。
- **Consequences**: e4 バッチとの交差が record.ts ファイルレベルで消滅。verify(checkGoaLine 等)は裁定行を検査しないため無影響(RE 実測)。
- **Alternatives Rejected**: rulingText 本体へ hold+resolution 分岐を追加 — record.ts 変更で e4 交差面が復活し、rulingText の責務(TallyResult 由来の派生)に CLI 由来 resolution が混入する責務混合。

## ADR-3: docs 1行は SKILL.md の3面同期(e4 留保の置き場)

- **Context**: e4 Q3 留保「二値(単一提案型)と choice 指定(多肢 tie)の使い分けを docs に1行」。election CLI に README はなく、利用者向け文書は SKILL.md(.claude/.agents/contrib の3面 — RE 実測)。
- **Decision**: SKILL.md の hold 関連記述近傍へ1行追加し、3面を同一内容で同期(cmp 検査を CG 完了条件に)。
- **Consequences**: 配布外制約(W-3)と整合 — SKILL.md は配布3面だが scripts/ 同様チーム内運用面で、dist/ ツリー非投影(RE 実測: SKILL は .agents/.claude/contrib のみ)。
- **Alternatives Rejected**: 新規 docs ファイル — 1行のために新設は過大。CLI の usage 文字列 — 使い分けの説明は usage の責務外で肥大。

## 逸脱申告

なし。#1267 対応方向・E-HCRRA1〜3 裁定・エスカレーション承認・e4 並行合意の全てに整合。
