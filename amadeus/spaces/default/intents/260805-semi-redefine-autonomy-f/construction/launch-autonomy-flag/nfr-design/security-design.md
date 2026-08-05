# Security Design — `launch-autonomy-flag` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — 判定表・context 型・検証シーケンスの依拠元)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在 — セキュリティ要求は requirements.md の FR-CLI-2〜5・NFR 逐条照合(questions D1)から導出した。

本 Unit は **autonomy 認可境界への新しい入口**(起動フラグ)を追加する。security-design の目標は「入口を増やしても認可の強度を 1 ミリも下げない」ことである(questions D3)。

---

## 昇格・緩和経路の封鎖(4 点)

| # | 脅威 | 封鎖機構(FD 判定表) | 検証 |
| --- | --- | --- | --- |
| S1 | 起動フラグによる無儀式の `full` 昇格 | 判定 7: `full` かつ grant 不在 → `error` + preview 表示で fail-closed 停止(FR-CLI-4。FR-GRT-006 を緩めない) | t450 落ちる実証: fail-closed 反転 → 赤 |
| S2 | `--autonomy none` による grant の側面効果的取消 | 判定 6: `none` かつ grant present → `error`(明示 revoke = `amadeus-bolt set-autonomy --mode none` を案内)。判定 5・6 が判定 8 より先にあることで `prepareNonFullCommand:385-390` の `revoke-full` 経路が起動フラグから構造的に到達不能(FD の判定順序根拠) | t450 落ちる実証: grant 判定の無条件 `"absent"` 化 → 赤 |
| S3 | 人間が決めた mode の無言上書き | 判定 5: `declared === true`(`modeProvenance.kind === "human-command"` — ADR-13)かつ異値 → `error`。同値は no-op(監査イベントを増やさない) | t450: FR-CLI-3 (1)(2)(3) のケース+`declared` 無条件 `true` 化 → 赤 |
| S4 | HUMAN_TURN 不在での mode 適用(provenance 偽装) | 判定 8: 適用は既存 `applyProductionAutonomyMode` へ委譲し、その `PROVENANCE_REQUIRED`(`amadeus-intent-autonomy-production.ts:409-411` — requirements.md FR-CLI-5 の verbatim)を relay。**フラグ自体を provenance とみなさない**。第 2 の書込経路を作らない(ADR-8)ため、provenance 検査の迂回路が構造的に存在しない | t450: HUMAN_TURN 不在ケース。NFR-6 の「落ちる実証」対象 |

## 入力検証(loud、fail-closed)

- **値域**: `none` / `semi` / `full` の 3 値全一致のみ受理(判定 2)。値なしは `autonomyMissingValue`(判定 1)。いずれも**loud エラー停止** — 対話プロンプトへのフォールバックや無音破棄をしない(FR-CLI-2)。parse 段(C12)は値を運ぶだけで検査せず、検査は C13 が一元所有(判定の単一所在)。
- **値の consume**: `--autonomy` の値は必ず consume し、intent 自由文への漏洩(`flags.intent` 混入)を防ぐ(FR-CLI-1 — t449 で 3 値とも assert)。
- **読取失敗**: projection `unreadable` → 判定 3 で拒否側へ縮退(ADR-12)。近傍様式 `catch → false` はこの文脈では**緩和側へ反転する**ため意図的に採らない(FD アルゴリズム 3 の意味論適合照合の転記 — `cid:application-design:citation-semantics-check`)。

## 監査・秘密情報

- 本 Unit 自身は監査イベントを**生成しない**(同値 no-op は増やさない、適用は既存経路が監査を書く)。`READ_ONLY_FLAGS` へ `--autonomy` を追加しない(autonomy は監査済みの状態変更 — FR-CLI-5 後半、検証は t450 H9 の in-process assert)。
- 秘密情報・暗号: 該当なし(1 行理由)— argv の mode 名 3 値と state/projection の公開状態値のみを扱い、credential・token を読まない。

## 適用 NFR との対応

| NFR | 分類 | 本設計での充足 |
| --- | --- | --- |
| NFR-1(fail-closed 実証) | **適用(FR-CLI-4 の面に限る — questions D1)** | S1 の落ちる実証(注入 → 赤 → 復元 → 残渣ゼロの 1 セット)を code-generation 成果物に記録 |
| NFR-3(parser 実行コスト) | **適用** | C12 は既存 argv 一巡 ladder への 2 分岐追加のみ・FS I/O ゼロ。検証: parse 関数本体 grep で `readFileSync|existsSync` 0 件 |
| NFR-4(TDD) | **適用** | t449/t450 を失敗テスト先行で追加。実 FS(state・projection)を使うケースは integration 層 |
| NFR-5(ドリフトゼロ) | **適用** | 編集正本は `packages/framework/core/tools/amadeus-orchestrate.ts` のみ。`bun run build` 後の追跡ファイル不変 |
| NFR-6(provenance 偽装不能) | **適用(`--autonomy` の面)** | S4。落ちる実証込み(requirements.md NFR-6 合否基準 (1)) |
| NFR-7(ゲート集合) | **適用** | PR CI のブロッキング集合を全通過 |
| NFR-2(監査追跡性) | **非適用**(1 行理由: AUTO_DECIDED の生成・replay は semi-authorization-core / advisory-auto-resolution の所有 — 本 Unit は裁定を生成しない) | — |

NFR 全 7 件の分類の閉包: **適用 6 件(NFR-1/3/4/5/6/7 — うち 1 と 6 は本 Unit 所有面に限定)・非適用 1 件(NFR-2)**(questions D1 と一致)。

## セキュリティ観点の検証手段

- S1〜S4 の各封鎖は t450 の分岐網羅+落ちる実証 3 点(FD 検証シーケンスの確定分)で固定する。
- 「第 2 の書込経路を作らない」は実装 PR レビューで C13 diff への grep(`writeAutonomyProjection|appendAudit` 等の直接書込 API)0 hit で機械確認する(委譲先 `applyProductionAutonomyMode` の 1 呼び出しのみが許される)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T12:27:39Z
- **Iteration:** 1
- **Scope decision:** none

NFR 7件の適用/非適用分類は両成果物・文書内で無矛盾に閉包しており、produces・FD整合・cid:nfr-design:c1も遵守しているためREADY。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/launch-autonomy-flag/nfr-design/logical-components.md:37 — 「NFR-1/6: security-design.md S1〜S4の落ちる実証」という記述が、security-design.md:33/37でNFR-1をS1(FR-CLI-4の面)のみ、NFR-6をS4(--autonomyの面)のみに限定しているスコープより広く読める。S2/S3はどちらのNFRとも明示的に紐付いていないため、この一文だけを読んだ下流(infrastructure-design/code-generation)がNFR-6はS1〜S3の落ちる実証でも検証されると誤解しうる。security-design.md側の限定表記(「FR-CLI-4の面に限る」「--autonomyの面」)に合わせて、S1→NFR-1、S4→NFR-6と個別に記述するよう精密化すべき。(conductor 対応: complete-review 前に logical-components.md 当該行を S1→NFR-1 / S4→NFR-6 の個別紐付けへ是正済み)
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/launch-autonomy-flag/nfr-design/security-design.md:13 — S1行が引用する「FR-GRT-006」はこのUnitのconsumes(business-logic-model.mdのみ)内に出典が見当たらない。既存の grant 関連要件を指す既決事項の引用として妥当と推測されるが、参照先file:lineが本Unit成果物からは追えないため、code-generation段でこの引用の実在をmechanism-cite-verify-at-draft(既決cid)に従い再確認することを推奨する。
