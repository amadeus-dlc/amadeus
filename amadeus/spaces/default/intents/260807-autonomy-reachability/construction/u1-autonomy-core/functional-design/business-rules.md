# Business Rules — u1-autonomy-core

上流入力(consumes 全数): requirements.md(FR-2 受け入れ基準の規則化)、components.md / component-methods.md(C2/C3 契約)、unit-of-work.md(境界)、unit-of-work-story-map.md(BR は u1 の物語3行の保証条件)、services.md(BR-U1-2 の audit ロック・同期 emit 契約の出典)。補助参照: component-dependency.md(FR-2d 表)、decisions.md(ADR-2/3)。

## 規則

- **BR-U1-1(canonical 書込)**: state の autonomy 3フィールドを書くコードは `applyProductionAutonomyMode` の内部1箇所のみ。他所(bolt verb・C13・hook)からの直書きは禁止 — grep で `Intent Autonomy Mode` の書込点が1箇所であることをテストで固定
- **BR-U1-2(audit 先行)**: audit transaction が commit されるまで state を書かない。逆順・同時は禁止(audit-batch-before-state-atomicity)
- **BR-U1-3(再実行収束)**: audit 成立済み+state 未反映の状態で再実行されたら、transaction を重複発行せず state のみ書いて収束する(冪等)。判定は projectionRevision の一致
- **BR-U1-4(refusal 2値)**: refusal イベントの Reason は `SCOPE_OUT` / `MODE_REQUIRES_HUMAN` の2値。`AUTHORITY_BOUNDARY` を導入しない(finding 3 — 不存在の再確認済み)
- **BR-U1-5(観測のみ)**: refusal emit・preview 列挙は認可判定の戻り値・分岐を一切変えない。変更前後で `authorizeInteraction` の全分岐の戻り値が同一であることを対照テストで固定
- **BR-U1-6(fail-open は emit のみ)**: emit 失敗は警告で継続。それ以外の失敗様式(検証・state 書込)は既存の fail-closed / loud error を維持
- **BR-U1-7(導出値)**: preview の `nonAutoDecidedKinds` は集合差で導出し、リテラル複製を持たない(canonical 1定義)
- **BR-U1-8(登録同期)**: 新設イベントは `amadeus-audit.ts` 登録・`otel/event-registry.ts` mapping・audit-format docs を同一変更で同期(NFR-4)。登録漏れは既存の audit 語彙ガードで赤になることを確認

## 受け入れ基準への写像

| BR | FR 受け入れ基準 | 検証形 |
|---|---|---|
| BR-U1-1/2/3 | FR-2c (i)〜(iii) | integration(実 FS)+failure injection |
| BR-U1-4/5/6 | FR-2a (i)〜(iii) | integration(audit 行直読)+対照テスト |
| BR-U1-7 | FR-2b | unit(純関数)+CLI 逐語 assert |
| BR-U1-1〜3 | FR-2d(6読み手) | integration 1本で直列 assert |
