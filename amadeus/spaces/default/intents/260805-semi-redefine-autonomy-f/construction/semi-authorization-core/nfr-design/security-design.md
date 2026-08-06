# Security Design — `semi-authorization-core` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — 3 層置換・判定表・結線・検証面の依拠元)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在 — セキュリティ要求は requirements.md の FR-AUTH-1〜3 / FR-LAD-1〜6・NFR 逐条照合(questions D1)から導出した。

本 Unit は semi の**認可基体(SemiAuthority)そのもの**を新設する。security-design の焦点は「基体を足しても、節目の人間裁定・効果の安全弁・監査の完全性が 1 点も緩まない」ことである(questions D3)。

---

## 認可強度の保存(4 点)

| # | 守る性質 | 機構(FD の確定設計) | 検証 |
| --- | --- | --- | --- |
| A1 | **基体の責務限定** — SemiAuthority は (a) scope 認可 (b) effect 認可 (c) basisFingerprint 供給 の 3 責務のみ。TTL・revoke 状態・発行 principal 儀式(grant の意味論)を持ち込まない | 型定義の直読で検査可能な形(FR-AUTH-1 (1))。grant と別型である理由 = この 3 責務差分 | t451: 型に 4 つ目の責務が無いことの直読検査 |
| A2 | **節目の人間裁定の保存** — walking-skeleton / phase-gate は semi で `human-required: SCOPE_OUT` | 第1関門判定表(FD の 8 行表)。`SEMI_ROUTINE_INTERACTIONS`(stage-gate + question)の閉じた列挙が節目を構造的に除外 | t452: 判定表全行+FR-LAD-5 の落ちる実証(反転で赤) |
| A3 | **効果の安全弁** — 不可逆効果は `semi-gate-effect-not-authorized` で拒否(workflow-reversible のみ通す) | C7: inline 述語を `SemiAuthority.authorizeEffect` へ置換(述語同値・拒否文字列維持)。C5 の 3 つの throw ガード(question 誤配線 / mode 一致 / grant 実在)は 1 文字も変えない(FR-LAD-3) | t452/t453: 効果拒否ケース+ガード維持の assert |
| A4 | **不正基体の fail-closed 拒否** — scope 未供給・生成不成立・不正 projection は認可しない | 第1関門: `semiScope` null → `human-required`(D3 fail-closed)。`SemiAuthority.of` null → `human-required` 翻訳。`assertLegalAutonomyProjection` の片方向不変条件(`semiPolicies` あり ∧ mode ≠ semi → throw)+ replay 拒否(FR-AUTH-1 (3)) | t452: 落ちる実証 — 不変条件除去で赤 |

## 梯子入口の単一述語化と縮退方向

- `:702` の `projection.mode !== "full" || grant === null` → `input.authority === null` の単一述語(`invalid: "authorization-required"`)。mode 名の直接比較を梯子入口に残さない(FR-AUTH-2 — 改訂後の関数本体 grep で `mode !== "full"` 0 hit)。
- 縮退方向は常に**拒否側**: authority が解決できない question は invalid、semi の human-required は `decide:607-610` の早期 return(不変)で即返る。緩和側へ反転する `catch → false` 様式はこの層に存在しない。
- `none` mode の question が引き続き `human-required` になること(FR-AUTH-2 受け入れ基準)を t452 に含める。

## 監査・追跡性(NFR-2 — 本 Unit が主所有)

- semi 下の無人裁定はすべて **SemiAuthority 由来の basisFingerprint** を持つ `AUTO_DECIDED` として記録される。コミットイベント列(`AUTO_DECIDED` + `WORKFLOW_EFFECT_APPLIED`)は無改変(FD C7)。
- basisFingerprint は SHA-256 形式(`SHA256.test` の形検査 — ADR-3 逐語)。
- replay(`amadeus-intent-autonomy-replay.ts`)が semi 裁定込みの journal から projection を復元でき、書込直後の projection と等値(NFR-2 合否基準)— t453 の統合テストで固定。不正 authorization を持つ projection は片方向不変条件経由で fail-closed 拒否(A4)。
- 後段 2 段(solo-election / agent-recommendation)由来は `reviewState: "unreviewed"` で unreviewed queue へ(FR-LAD-4 — 人間の事後レビュー可能性を保存)。

## grant 意味論の不侵食(FR-AUTH-3)

- semi は current grant = null を維持。`set-mode` の値域へ `full` を追加しない。full 経路(`full-grant` / `reserveFullDecision`)は payload 拡張(scope / policies)を除き不変。
- 秘密情報・暗号: 該当なし(1 行理由)— 扱うのは projection・occurrence・fingerprint(公開ハッシュ)のみで credential を読まない。

## 適用 NFR との対応

| NFR | 分類 | 本設計での充足 |
| --- | --- | --- |
| NFR-1(fail-closed 実証) | **適用(FR-AUTH-1 の面 — questions D1)** | A4 の落ちる実証(不変条件除去 → 赤、注入 → 赤 → 復元 → 残渣ゼロの 1 セット)を code-generation 成果物に記録 |
| NFR-2(監査追跡性) | **適用(本 Unit が主所有)** | 上節。t453 の replay 等値 assert + SHA256 形検査 |
| NFR-4(TDD) | **適用** | t451/t452(unit — 純関数)/ t453(integration — 実 FS journal)を失敗テスト先行で追加 |
| NFR-5(ドリフトゼロ) | **適用** | 編集正本は `packages/framework/core/tools/` の autonomy 系 3 ファイル(intent-autonomy / -runtime / -production)+ replay。`bun run build` 後の追跡ファイル不変 |
| NFR-7(ゲート集合) | **適用** | PR CI のブロッキング集合を全通過 |
| NFR-3(parser 実行コスト) | **非適用**(1 行理由: flag parser は `launch-autonomy-flag` の所有 — 本 Unit は argv に触れない) | — |
| NFR-6(provenance 偽装不能) | **非適用**(1 行理由: `--autonomy` 面は `launch-autonomy-flag`、advisory 第2 receipt 面は `advisory-auto-resolution` の所有 — 本 Unit の基体は mode 設定の human-command 由来性を判定材料として読むだけで、provenance の受理境界を持たない) | — |

NFR 全 7 件の分類の閉包: **適用 5 件(NFR-1/2/4/5/7 — うち 1 は FR-AUTH-1 の面に限定)・非適用 2 件(NFR-3/6)**(questions D1 と一致)。

## セキュリティ観点の検証手段

- A1〜A4 は t451/t452/t453 の分岐網羅+落ちる実証(FD 検証シーケンスの確定分: 不変条件除去 / FR-AUTH-2 入口ガード除去 / FR-LAD-5 反転)で固定する。
- 「3 つの throw ガード無改変」「イベント列無改変」は実装 PR の diff 照合(当該行が hunk に現れない)で機械確認する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T12:33:19Z
- **Iteration:** 1
- **Scope decision:** none

produces は directive の 2 点(security-design/logical-components)に一致し、FD の3層置換・8行判定表・3点結線・t451-t453(レビュー時点の表記は t440-t442 — 後続の tNNN 改番 sweep で機械置換)との整合、NFR7件の分類(適用5/非適用2)は両成果物間で一意・無矛盾、cid:nfr-design:c1のインフラ非適用置換とc4の機構別層別化も遵守されている。

### Findings

- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/semi-authorization-core/nfr-design/security-design.md:34 — 「秘密情報・暗号: 該当なし」の1行が『## grant 意味論の不侵食(FR-AUTH-3)』見出し配下に置かれており、話題(grant値域の不変)と暗号非該当の非関連トピックが同一見出しに混在している。Step 5 の Security focus area(encryption)に対応する記述であることが見出しから読み取れず、独立の小見出しまたは既存の『適用 NFR との対応』表内への統合が望ましい(実装可否には影響しない)
- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/semi-authorization-core/nfr-design/logical-components.md:15 — LC-2(第1関門 authorizeInteraction)を『同ファイル』(LC-1 の amadeus-intent-autonomy.ts)としているが、FD 側は D3 点1で『純関数層』とだけ述べ、authorizeInteraction の所在ファイルを明示していない(component-methods.md §C3 の所在列は本レビュー範囲外)。整合はしているが、レビュー範囲内の一次証拠だけでは所在ファイル一致を完全には裏取りできない旨を明記しておくと将来の齟齬検出が容易になる
