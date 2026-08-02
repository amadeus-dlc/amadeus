# Memory — application-design (260801-tla-multi-model)

## Interpretations
- 2026-08-01T17:00:00Z — (conductor 記録)reviewer iteration 1 NOT-READY(Major 1: FormalElection vocabulary 配置矛盾 + Minor 3)を builder 戻しで是正、iteration 2 READY

- 2026-08-01T20:30:00Z — consumes ヘッダは frontmatter 宣言分(requirements / architecture / component-inventory / team-practices)を記載。stories は user-stories ステージ未実施のため consume せず。
- 2026-08-01T20:30:00Z — `TLA_EXECUTION_MODEL_NAME` の所在は tla-model-loader-internal.ts ではなく `tla-model-map.ts:52`(canonical コピー amadeus-formal-verif-model-map.ts:52 も同値)。loader-internal は :22-24 で import するのみ。設計は実測側を正とした。
- 2026-08-01T20:30:00Z — `hasFrozenModelOutputBinding` の定義行は実測 :492(引用の :493-494 は本体の binding 検査部)。設計では「:492 周辺」と表記。

## Deviations
- 2026-08-01T17:00:00Z — なし

- 2026-08-01T20:30:00Z — application-design-questions.md は作成しなかった。requirements.md の Open questions が「なし(Q1/Q2 確定)」で、設計段への委譲事項も残っていないため、追加質問は不要と判断(Step 3/4 を確定裁定の転記で代替)。
- 2026-08-01T20:30:00Z — 27 テストファイルの個別仕分け表は本ステージでは分類基準の確定に留め、個別走査を units-generation/functional-design へ送った(実ファイル走査は実装直前に行うのが正確)。

## Tradeoffs
- 2026-08-01T17:00:00Z — なし

- 2026-08-01T20:30:00Z — 語彙配置は model-map エントリを採用(ADR-6)。pin 検証面に載る利点を、map 肥大化のコストより優先した。
- 2026-08-01T20:30:00Z — 二重検出だが実装は単一リゾルバに集約(ADR-2)。検出点の冗長性と規則ドリフト防止の両立。

## Open questions
- 2026-08-01T17:00:00Z — なし

- 2026-08-01T20:30:00Z — MirrorLifecycle AsIntended の CI 実測時間は未確定(FR-5 / ADR-8 の measure-first で閉じる)。
- 2026-08-01T20:30:00Z — `tla-model-loader.ts` の無引数 wrapper の新 export 名(loadVerifiedTlaSources 系)は functional-design で最終確定。

## Review iteration 1 対応(2026-08-01)

- 2026-08-01T21:00:00Z — Finding-1: FormalElection エントリへ vocabulary 追加に確定(identity 値・entries 不変)。C8/変更表/ADR-3/ADR-5/ADR-10/methods C4 を整合。receipt 入力(frozen model bytes + publicContractIdentity=entries 由来)を ADR-10 に列挙し非影響を確認(publicContractIdentity は run-model-check-source.ts:129-131 実測)。
- 2026-08-01T21:00:00Z — Finding-2: ADR-6 の pin カバー主張を撤回し trust anchor + 宣言源単一化に再根拠付け。
- 2026-08-01T21:00:00Z — Finding-3: 順序は model-map.json models 配列の宣言順(=名前昇順、parser 強制)に確定。methods C3 と services S2 を同一表現に。
- 2026-08-01T21:00:00Z — Finding-4: diagnostic の既定は全登録モデル反復(必須引数化しない)に確定。
