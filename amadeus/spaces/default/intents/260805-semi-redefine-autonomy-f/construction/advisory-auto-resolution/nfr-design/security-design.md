# Security Design — `advisory-auto-resolution` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — 処理シーケンス・受理 3 点表・schema 契約・ロック直列性の依拠元)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在 — セキュリティ要求は requirements.md の FR-ADV-1〜5・NFR 逐条照合(questions D1)から導出した。

本 Unit は advisory choice の**無人受理境界(第2 receipt 経路)**を新設し、人間経路を置換する。security-design の目標は「無人経路の受理強度が人間経路と等価であり、認可不成立が必ず人間経路へ戻る」ことである(questions D3)。

---

## 受理境界の等価強度(FR-ADV-3 / NFR-6)

人間経路の受理 3 点(grounding / 重複排除 / 提示照合)を provenance 抽象へ載せ替え、**等価な検査を等価な深さで**行う(FD 受理 3 点表の逐語):

| 受理点 | human-turn(現行と同値) | auto-decision(新設 — 等価強度) |
| --- | --- | --- |
| grounding | 監査シャードの実 HUMAN_TURN 照合 | journal に当該 `decisionId` の `AUTO_DECIDED` 実在照会(捏造 decisionId は journal 不在で拒否) |
| 重複排除 | `(shard, eventIdentity)` | `decisionId` 単独一意+identity 単位の **provenance 跨ぎ排除**を受理前段へ引き上げ(同一 advisory への human/auto 二重 receipt を双方向に拒否) |
| 提示照合 | `DECISION_RECORDED` 照合 | occurrence `selector` と open pending identity の一致 |

- 受理関数は provenance を**判別ユニオンで 1 本**受ける(並存・分岐コピーを作らない — FR-ADV-3)。偽装 provenance(journal に無い basisFingerprint / decisionId)は grounding で拒否される(NFR-6 合否基準 (2) の advisory 面 — 落ちる実証込み)。

## fail-closed の 2 分岐構造(FR-ADV-2 / NFR-1)

- 解決経路の出口は **2 つだけ**: `decided ∧ run-now` → resolved / **それ以外すべて**(mode=none・失効 grant・scope 不一致・`parked`/`conflict`/`aborted`・`defer-with-risk` 選択・翻訳不能)→ `await-advisory-choice`(人間経路)。分岐が 2 つしかないことが構造的保証(FD 処理シーケンスの逐語)。
- **認可不成立時に第2経路へ落ちない**: 裁定は既存 `commitProductionQuestionDecision` へ委譲し、認可は semi-authorization-core の基体(第1関門 → 梯子)を経由する — 本 Unit は認可判定を複製しない。
- schema 1 store は `{ok:false}` → 既存分岐で **fail-closed hold**(読替コードを書かない — ADR-9)。
- 落ちる実証(NFR-1 の FR-ADV-2 面): 認可判定の無条件 true 化で t458 の (1)(2) が赤(注入 → 赤 → 復元 → 残渣ゼロの 1 セット)。

## 強制実行の封鎖(FR-ADV-4)

- `run_required: true` の advisory は `optionIds = ["run-now"]` — **`defer-with-risk` が選択肢空間に存在しない**(主機構)。effect registry の `defer-with-risk → quality-waiver` かつ `quality-waiver ∈ PROHIBITED_EFFECTS` が従機構(二重防衛 — 独立に落ちる実証を持つ: optionIds 分岐の無条件 2 値化で t457 赤 / PROHIBITED_EFFECTS からの除去で t459 赤)。
- 人間経路での `defer-with-risk` の可否は本 intent で変更しない(requirements.md FR-ADV-4)。

## 記述面の射程(FR-ADV-5)

- 本書および logical-components.md は「`run_required` 経路が plugin 非依存」と読める記述を含まない。plugin 非依存性への言及は「**hold 判定の面に限る**」の射程注記を必ず併記する(`formalCheckRoute` の実行コマンドはハードコードであり run_required 経路は plugin 非依存ではない — requirements.md FR-ADV-5 の実測)。機械検証手段は FD §12a FOLLOW-UP の引き継ぎどおり code-generation 着手前に確定する(`semi-docs-revision` の V 系 grep との共同チェックが候補)。

## 監査・秘密情報

- 無人裁定は既存経路の `AUTO_DECIDED` として記録され(NFR-2 の advisory 面)、receipt は `auto-decision` provenance で store(schema 2)へ永続化される。新しい監査イベント種は作らない。
- ロック直列性: C16 連鎖上の lock は `:599`(解放済み)と `:787`(受理)のみ — FD D4 の 4 箇所実測。U-3 の実装時実測義務は保持。
- 秘密情報・暗号: 該当なし(1 行理由)— advisory メタデータ・decisionId・fingerprint(公開ハッシュ)のみを扱い、credential を読まない。

## 適用 NFR との対応

| NFR | 分類 | 本設計での充足 |
| --- | --- | --- |
| NFR-1(fail-closed 実証) | **適用(FR-ADV-2 の面 — questions D1)** | 上節の落ちる実証(t458)を code-generation 成果物に記録 |
| NFR-2(監査追跡性) | **適用(advisory 面)** | AUTO_DECIDED 記録は既存経路へ委譲(新経路を作らないことが追跡性の保存) |
| NFR-4(TDD) | **適用** | t457/t459(unit)・t458(integration — 実 FS store/journal)を失敗テスト先行で追加 |
| NFR-5(ドリフトゼロ) | **適用** | 編集正本は `packages/framework/core/tools/` の advisory-choice / orchestrate(guard 呼び出し部)のみ。`bun run build` 後の追跡ファイル不変 |
| NFR-6(provenance 偽装不能) | **適用(advisory 第2 receipt の面 — questions D1)** | 受理境界の等価強度(上表)+落ちる実証(捏造 provenance の拒否) |
| NFR-7(ゲート集合) | **適用** | PR CI のブロッキング集合を全通過 |
| NFR-3(parser 実行コスト) | **非適用**(1 行理由: flag parser は `launch-autonomy-flag` の所有 — 本 Unit は argv に触れない) | — |

NFR 全 7 件の分類の閉包: **適用 6 件(NFR-1/2/4/5/6/7 — うち 1 は FR-ADV-2、2 は advisory 記録、6 は第2 receipt の各面に限定)・非適用 1 件(NFR-3)**(questions D1 と一致)。

## セキュリティ観点の検証手段

- 受理 3 点の等価強度は t459(auto-decision 側 3 点+provenance 跨ぎ二重 receipt 拒否)で固定。
- 2 分岐構造・schema fail-closed は t458 で固定。強制実行は t457/t459 の独立 2 実証。
- 「並存実装なし」(FR-ADV-3)は実装 PR レビューで受理関数の複製・分岐コピー不在の diff 検分+旧関数名 `recordProtectedAdvisoryChoice` の残存 grep 0 hit(置換の機械確認)で行う。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T12:38:28Z
- **Iteration:** 1
- **Scope decision:** none

両成果物は produces 2点限定・FD 逐語整合・NFR7件分類の閉包・FR-ADV-5射程注記・機構別blast radius層別のすべてを満たし、BLOCKER相当の欠陥は見当たらない。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/advisory-auto-resolution/nfr-design/security-design.md:40 — 「FD D4 の 4 箇所実測」という記述は、FD側のFOLLOW-UP #2(:518/:766がC16連鎖上に無いことの実測未確認)を受けてbusiness-logic-model.md:54に事後追記された「追補実測」に依拠しているが、この追補自体は独立レビューで再検証された記録が無い(FD内のReview — Iteration 1ブロックは追補前の状態のスナップショット)。U-3の実装時実測義務が保持されているため許容できるが、code-generation着手前にこの追補実測自体の妥当性(:518/:766の呼出し元関数が本当にC16連鎖と非交差か)を実装者が改めて確認する旨を一文加えると、後続工程での盲信を避けられる
- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/advisory-auto-resolution/nfr-design/security-design.md:24 — commitProductionQuestionDecision の引用に行番号(:524)が付いておらず、logical-components.md:15 の「commitProductionQuestionDecision:524」と表記が不揃い。同一 intent 内の同一機構引用は行番号まで揃えることを推奨する
- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/advisory-auto-resolution/nfr-design/security-design.md:61 — recordProtectedAdvisoryChoice の旧関数名引用に行番号(component-methods.md由来の:864-900、または最新実測の:787)が付いていない。実装時のgrep対象特定を容易にするため、business-logic-model.md:42の注記(旧測定refと新測定refの相違)への参照を1文添えることを推奨する
