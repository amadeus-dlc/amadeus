# Security Design — `semi-policy-carrier` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — 処理シーケンス・digest 設計・検証面の依拠元)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在 — セキュリティ要求は requirements.md の FR-POL-1〜3 / FR-DISP-2・NFR 逐条照合(questions D1)から導出した。

事前裁定方針(policy)は semi の**無人裁定の入力**である。security-design の目標は「人間が確認した方針集合と、実際に裁定へ効く方針集合が常に同一である」ことの保証である(questions D3)。

---

## 方針すり替えの封鎖(FR-POL-2 / Q1)

| # | 脅威 | 封鎖機構(FD の確定設計) | 検証 |
| --- | --- | --- | --- |
| P1 | 確認した方針と異なる方針の適用(すり替え・改変) | 確認 digest を方針込みへ拡張(`nonFullCommandDisplayDigest` — full 側 `grantIssuanceDisplayDigest` と同形の `policySetDigest` 合成)。**非空 policies は `planHumanAutonomyCommand` での digest 等値照合を必須**とし、不一致は `{ ok: false, code: "INVALID_COMMAND" }`(Q1 裁定 A) | t443: Q1 照合 3 分岐+落ちる実証(照合除去で不一致ケースが赤) |
| P2 | digest の不安定性による偽陰性/偽陽性 | 同一 mode・同一 policy 集合で digest 安定、異なる集合で相違(FR-POL-2 前半)。正規化(`normalizeDecisionPolicies`、seed = `commandOccurrenceId`)の呼び出しは `planHumanAutonomyCommand` 内の**単一箇所** — digest 計算入力の二重正規化を作らない(FD FOLLOW-UP の転記) | t443: digest の差異・安定 assert |
| P3 | 方針の無音破棄 | `--mode none --policies-file` は `readDecisionPolicyInputs` **より前**の loud ガードで非 0 exit + stderr(FR-POL-3 — 無警告破棄経路の根絶) | t444: 落ちる実証(loud 化を外すと赤 — NFR-1 の FR-POL-3 面) |
| P4 | 表示と実態の乖離 | `--status` の `Policies:` 行は grant 非依存の供給式(`grant?.policies.length ?? semiPoliciesOf(projection).length` — 直読禁止、総関数経由)へ(FR-DISP-2) | t444: policies 設定済み semi の実数表示 assert |

## digest の意図的相違(引用の意味論適合)

- semi の digest は full 側と同形だが **`principalId` / `scope` を含めない** — semi は grant scope を持たないため(FD アルゴリズム 2 の意図的相違の転記)。この相違は「semi へ grant 意味論を持ち込まない」(FR-AUTH-1 の責務限定と同じ原理)の digest 面であり、検査強度の低下ではない(方針集合の同一性保証は `policySetDigest` が担う)。

## 監査・追跡性(NFR-2 — replay 復元の本 Unit 配分面)

- 拡張後の `set-mode`(policies 付き)コマンドを replay(`amadeus-intent-autonomy-replay.ts`)が復元でき、`readProductionAutonomyProjection` の結果が書込前後で一致すること(FR-POL-2 後半 = story-map §NFR の割当による本 Unit の NFR-2 検収面)— t444 で固定。
- mode 適用の HUMAN_TURN 要求(provenance)は既存 `applyProductionAutonomyMode` 経路が担い、本 Unit は緩めも強めもしない(NFR-6 非適用の根拠 — questions D1)。

## 秘密情報・入力検証

- 秘密情報・暗号: 該当なし(1 行理由)— policy JSON は利用者が自然言語から conductor 経由で正規化した公開設定値であり、credential を含まない(含めない運用は stage-protocol の非 full CLI 契約側)。
- 入力検証: policies JSON の形検査は既存 `readDecisionPolicyInputs` / `normalizeDecisionPolicies` の検査を再利用(新しい parse 経路を作らない)。mode 不整合はファイル読取より先に loud(P3 — 不正ファイルより mode 不整合を先に報告する順序も FD 確定)。

## 適用 NFR との対応

| NFR | 分類 | 本設計での充足 |
| --- | --- | --- |
| NFR-1(fail-closed 実証) | **適用(FR-POL-3 の面 — questions D1)** | P3 の落ちる実証(注入 → 赤 → 復元 → 残渣ゼロの 1 セット)を code-generation 成果物に記録 |
| NFR-2(監査追跡性) | **適用(replay 復元の面 — story-map 配分)** | 上節。t444 の replay 等値 assert |
| NFR-4(TDD) | **適用** | t443(unit)・t444(integration — 実 FS・CLI spawn)を失敗テスト先行で追加 |
| NFR-5(ドリフトゼロ) | **適用** | 編集正本は `packages/framework/core/tools/` の intent-autonomy / -production / bolt(C10)/ utility(C15)。`bun run build` 後の追跡ファイル不変 |
| NFR-7(ゲート集合) | **適用** | PR CI のブロッキング集合を全通過 |
| NFR-3(parser 実行コスト) | **非適用**(1 行理由: `--policies-file` は既存フラグで新規 parse 分岐を持たない — `--autonomy` parser は `launch-autonomy-flag` 所有) | — |
| NFR-6(provenance 偽装不能) | **非適用**(1 行理由: HUMAN_TURN 要求は既存経路が担い本 Unit は変更しない — `--autonomy` 面・advisory 面は他 Unit 所有) | — |

NFR 全 7 件の分類の閉包: **適用 5 件(NFR-1/2/4/5/7 — うち 1 は FR-POL-3、2 は replay 復元の各面に限定)・非適用 2 件(NFR-3/6)**(questions D1 と一致)。

## セキュリティ観点の検証手段

- P1〜P4 は t443/t444 の分岐網羅+落ちる実証 2 点(Q1 照合除去 / loud 化除去)で固定する。
- 「正規化の単一呼び出し」は実装 PR レビューで `normalizeDecisionPolicies` 呼び出し箇所の grep(期待 1 箇所)で機械確認する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T12:42:53Z
- **Iteration:** 1
- **Scope decision:** none

両成果物は directive の2点構成、FD(C8-C10/C15・Q1・FOLLOW-UP転記)への忠実な整合、NFR7件の分類閉包が一意で、blast radiusも機構別に層別されており欠陥なし。

### Findings

- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/semi-policy-carrier/nfr-design/logical-components.md:41 — NFR-3/NFR-6 の非適用理由が「security-design.md の分類表」とだけ参照されており file:line 形式(security-design.md:41-42 等)になっていない。既決事項の再分類・複製回避の様式(stage Step 2)には沿っているが、行番号を添えるとレビュー時の照合が容易になる
