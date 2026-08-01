# Reliability Design — u3-vocabulary-supply

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

上流入力(consumes 全数): reliability-requirements(REL-1〜7), performance-requirements, security-requirements, scalability-requirements, tech-stack-decisions, business-logic-model(§2.2 明示失敗 / §4 / §5 / §7 不変性 / §8 テスト計画)

## 設計方針

可用性 SLA を持たない短絡 CLI のため、信頼性設計は **fail-closed・決定論・後方互換** の 3 柱で、いずれも functional-design 既定の機構にそのまま写像する。retry・回路遮断・health check・failover は適用外(reliability-requirements「非適用とする領域」— 常駐サービス・永続状態なし、失敗は即座の非ゼロ終了)。

## NFR → 機構 → 検証の写像

| NFR | 設計機構(functional-design 既定) | 検証方法(証明するテスト/AC) |
|---|---|---|
| REL-1(fail-closed) | vocabulary 省略は `namedInvariantsFor` / `traceVocabularyFor` が MODEL_MAP_INVALID(kind MODEL_LOAD)を返す明示失敗。未登録 byte-pin 要求は `selectVerifiedModel` の明示失敗。空配列・既定値・先頭モデル・他モデル語彙への silent fallback は設計に存在しない(business-logic-model §2.2 / §5.1) | t404 vocabulary 省略 red + 統合の未登録要求 red が「落ちる実証」として green(u3 AC2/AC3) |
| REL-2(失敗分類の不変) | 新エラー kind/code を新設しない。語彙欠如は既存 MODEL_MAP_INVALID、toolchain 内の語彙不一致は従来どおり `failed("GRAMMAR", …)`。byte-pin 不一致のメッセージ文字列(`sourceDrift(…, "model bytes differ from the verified U1 source")`)も不変(business-logic-model §2.2 / §3.4 / §5.1) | 既存テスト全件が期待値不変で green(tlc-output / toolchain / 統合系) |
| REL-3(決定論: 語彙 pin) | map へ移管する語彙値は現行定数と**順序含め一字一致**(business-logic-model §1.1 / §6)。コード側既定値(`TLA_NAMED_INVARIANTS` / `TRACE_STATE_VARIABLES`)は削除し二重管理を排除 | t404 deep-equal pin(語彙改変で赤になる構成を維持、u3 AC1 / FR-6)+ grep ガード(残余定数参照なし) |
| REL-4(決定論: receipt/解析結果の不変) | receipt 計算の入力は frozen bytes + publicContractIdentity のみで vocabulary は入力に入らない(ADR-10)。identity 計算式・counterexampleIdentity 計算式・TLC grammar 不変(business-logic-model §7) | t404 frozen receipt 不変 pin(固定 publicContractIdentity で byte 一致)+ 既存 identity 定数 pin 期待値不変(u3 AC1) |
| REL-5(後方互換) | map 変更は FormalElection エントリへの vocabulary 追加のみ。identity 値・entries 配列・MirrorLifecycle エントリ・schemaVersion は不変(business-logic-model §6) | model-map.json diff のレビュー + model-map 系既存テスト green(NFR-1) |
| REL-6(patch coverage 100% ゲート) | テストは修正と同 PR で運ぶ。`bun run typecheck` / `bun run lint` / 既存テスト green(business-logic-model §8.6) | CI patch gate 充足(u3 AC4) |
| REL-7(語彙なしに receipt を生成する経路を作らない) | receipt キー集合は語彙引数由来の closed-set 検査(`validateFrozenTlaModelReceipt` の exactPlainObject)が保証。語彙解決失敗時は frozen 生成も失敗する結線(business-logic-model §4.2 / §4.3) | t404: receipt キー集合 = 語彙集合の一致 + validateFrozenTlaModelReceipt closed-set 検査が語彙引数由来であることの確認 |

## グレースフルデグラデーションを採用しない理由

NFR-2 の fail-closed 方針と矛盾するため。退化動作(silent fallback)は禁止事項(REL-1)であり、「部分的に動く」設計は偽陰性(SEC-2 の和集合緩和と同型の欠陥)を生む(reliability-requirements §非適用の引き継ぎ)。

## 下流(code-generation)が侵してはいけないこと

- 失敗を `null`・空配列・既定値で握り潰すコードを書かない。Result 型の `ok: false` を必ず呼出側へ伝播させる(REL-1)。
- 既存エラーメッセージ文字列を「改善」しない(REL-2 — 既存 red ケースの期待値保護)。
- 語彙値・identity 計算式・grammar を動かす変更を紛れ込ませない(REL-3/REL-4 — t404 pin が即座に検出する構成を維持)。
- `hasFrozenModelOutputBinding` を一般化しない(business-logic-model §3.5 / ADR-10 — 「一般化対象外」コメントを残す)。
