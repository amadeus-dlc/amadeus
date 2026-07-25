# Security Design — harness-provenance

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## Trust boundary

business-logic-model.mdのenv入力をuntrusted stringとして扱い、security-requirements.mdどおりexact union parserで正規化する。performance-requirements.mdとscalability-requirements.mdの固定処理を維持し、reliability-requirements.mdのunknown degradationへ閉じる。tech-stack-decisions.mdどおりvalidation libraryは追加しない。

## Controls

1. `AMADEUS_HARNESS_TYPE !== undefined`ならexact 7値membershipを検査
2. 不一致はraw値を含まない`unknown`へ変換
3. state/memoryへは正規化済み値だけをserialize
4. audit/log/exceptionへraw値を渡さない
5. Harness値をauthentication/authorization/permission判断へ使わない

Markdown field injectionは固定unionにより不可能にする。`AMADEUS_HARNESS_DIR`は既存resolver入力のままで、本機能からpath traversalやfile accessへ利用しない。

## Verification

固有markerを含むinvalid overrideを与え、state、実在する通常memory entry、audit、stdout、stderrのどこにもraw markerがなく、stateには`Harness: unknown`、memoryには同じ正規化値の`Harness=unknown`だけがあることを検証する。memory検証は実観測entryをfixtureで作るcaseと、観測なしでsynthetic entryを作らず`total=0`を保つcaseを分ける。dependency差分で新規SDK・network importがないことも確認する。
