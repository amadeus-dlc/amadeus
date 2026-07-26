# 信頼性要件 — U4 hook-wiring-remaining

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 信頼性の中核契約

U4 の信頼性は 2 つの構造的契約に還元される — (1) **配線 XOR DegradeContract の全数閉包**(沈黙欠落の構造的不能化)、(2) **フック起動失敗時のセッション継続**(fail-safe)。前者は `business-rules.md` BR-U4-4、後者は BR-U4-5 に対応する。`technology-stack.md` 実測どおり常駐 service を持たないため、可用性 SLO ではなく決定的な fail-closed/fail-safe 契約として表現する。

## REL-U4-1: 配線 XOR DegradeContract の全数閉包(BR-U4-4)

`business-rules.md` BR-U4-4 のとおり、DegradeContract は (a) clazz == manual-only の面、または (b) composeTrigger セルが deferred(未実測)のまま U4 に到達した面の両方に必ず作る。この 2 軸閉包により「配線なし かつ degrade なし」の沈黙欠落を構造的に不能にする(`requirements.md` FR-1 silent skip 禁止 / FR-5 可観測)。

- 合否: 全面について「配線あり XOR DegradeContract あり」の全数 assert が成立(`business-logic-model.md` フロー 2)。deferred-but-not-manual-only の面も必ずどちらか一方に落ちる(iteration 1 で捕捉した沈黙欠落の芽を閉じた設計)
- 合否: DegradeContract を持つ面について doctor 出力へ advisory 行が出現する文字列 assert(U5 BR-U5-2(a) と共有 — `requirements.md` FR-5「silent drop 不合格」)
- 合否: (b) の面は composeTrigger が measured へ昇格した時点で配線へ移行し DegradeContract を除去する(components.md C4「対応面」集合の更新 — 昇格経路の存在確認)

## REL-U4-2: フック起動失敗時のセッション継続(BR-U4-5)

`business-rules.md` BR-U4-5 と `business-logic-model.md` のとおり、フック起動失敗は stderr 1 行警告+セッション継続とする(U2 HookInvocation.failureMode の逐語継承、construction.md「回復可能なエラーと致命的エラーの区別」— フック障害は回復可能側)。

- 合否: compose 失敗 fixture でセッション起動が成功し、警告が出力される(サイレント失敗禁止かつセッション非停止の両立)

## REL-U4-3: 実起動検証(BR-U4-3、verification theatre 禁止)

`business-rules.md` BR-U4-3 と `business-logic-model.md` フロー 3 のとおり、対応面の検証は native hook の実起動テストとし、配線実在のみの検査は不合格とする(`requirements.md` FR-3b 合否)。実起動が構造的に不能な面は、文書化された手動 fallback E2E で代替し、代替した事実を期待値として固定する(暗黙成功禁止)。

- 合否: 各対応面で native hook を実起動し compose `--if-stale` の実行(noop 経路含む)を観測するテストを持つ(manifest 実在のみの verification theatre は不合格)
- 合否: 実起動不能面は文書化された手動 fallback E2E で代替し、代替事実を期待値として固定(`requirements.md` FR-8 合否と同型)

## REL-U4-4: dist 同期(BR-U4-7)

`business-rules.md` BR-U4-7 のとおり、フック配線の正本変更は同一変更で全ハーネス dist / self-install を再生成し drift ガード green とする(project.md Mandated)。

- 合否: フック配線後に `bun scripts/package.ts` / `bun run promote:self` を再生成し `dist:check` / `promote:self:check` が green

## 非該当カテゴリ(N/A + 根拠)

- 可用性 SLO / MTTR / フェイルオーバー: N/A。U4 はセッション起動時トリガーで常駐 service ではない(technology-stack.md 実測)。信頼性は XOR 全数閉包・fail-safe 継続の決定的契約へ置換される
- 自動リトライ / サーキットブレーカー: N/A。フック障害は 1 行警告+継続(BR-U4-5)で扱い、リトライ層を持たない
