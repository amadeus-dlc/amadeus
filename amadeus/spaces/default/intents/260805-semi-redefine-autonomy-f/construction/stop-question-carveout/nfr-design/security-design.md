# Security Design — `stop-question-carveout` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — 述語契約・呼び出し点割当・検証シーケンスの依拠元)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在 — セキュリティ要求は requirements.md の FR-STOP-1/2・NFR 逐条照合(questions D1)から導出した。

stop hook の carve-out は「エージェントが人間確認なしで走行を継続できる範囲」を広げる操作である。security-design の目標は「開放を質問 1 面に厳密に限定し、他の 2 面と cap を 1 ビットも動かさない」ことである(questions D3)。

---

## 開放の限定(FR-STOP-1)

| # | 面 | 本 Unit の扱い | 検証 |
| --- | --- | --- | --- |
| Q1 | `:422` tier-2 質問 carve-out(`isPendingQuestionStop`) | **semi へ開く唯一の点** — `isQuestionCarveoutIntent` へ 1 行差し替え。semi 側は `projection.mode === "semi" ∧ modeProvenance.kind === "human-command"` を要求(mode 設定の人間由来性は緩めない) | t445 判定表全行+t121 拡張(semi + 質問 pending で stop しない) |
| Q2 | `:457` tier-2b compose gate(`isPendingComposeStop`) | **full 限定維持** — 呼び出しコードも述語も無改変(diff 非出現) | FR-STOP-1 (2) の落ちる実証: 述語を無条件共有へ戻すと赤 |
| Q3 | `:716` tier-3 conversational stop | **full 限定維持** — 同上 | 同上 |

- 開放点が 1 つであることは diff の形で機械確認できる(新述語の追加+`:422` の 1 行差し替えに閉じる — FD の「28 行と整合」)。

## 縮退方向の意味論適合

- 両述語とも `catch → false`(現行 `:175-177` と同一様式)。**この文脈の `false` は「carve-out を与えない = 人間側に倒す」であり保守側** — `launch-autonomy-flag` の C13(false が緩和側へ反転するため unreadable 拒否を採る)とは逆向きで、それぞれの文脈で正しい(`cid:application-design:citation-semantics-check` の適合照合は FD D3 で転記済み)。
- 不正値・projection 読取失敗・provenance 不一致はすべて「stop を許可しない側」でなく「carve-out を与えない側」= 従来どおりの挙動へ落ちる(挙動の拡大が起きない)。

## cap / budget の不変(FR-STOP-2)

- `AUTONOMOUS_BLOCK_CAP`(`:153`)と `stopBudgetMode`(`:159`)は本 Unit の diff に**現れない**。行番号の出典: requirements.md FR-STOP-2 の verbatim 引用(`const AUTONOMOUS_BLOCK_CAP = 8;` / `return mode === "full" ? "autonomous" : mode === "semi" ? "gated" : "interactive";`)+ worktree HEAD `5f6561eef6098209c4c29461ae0d7c6d070b5c01` での grep 再実測(§12a iteration 1 FOLLOW-UP を受けた裏取り — 両行とも現存一致)。既存 cap / budget テスト(`tests/unit/t147-kiro-hook-adapter.test.ts:721` の cap テスト verbatim — FD で実測済み)は無改変で green を維持。
- carve-out の開放は「stop の許否判定」のみに作用し、ブロック回数の上限・予算モードの意味論に触れない(判定と予算の直交を保存)。

## ピン反転の閉包(FR-PIN-2)

- `t121:1138-1150` の旧仕様ピン(semi + blank question ALLOWS)を新意味論(carve-out により継続)へ反転し、テスト名の理由句も改める。反転は C11 変更と**同一 PR**(同一変更でしか green を保てない — FD D4)。
- 近傍の `(f) gated Construction` テスト(`:1152`)は無改変 green(FR-PIN-3 の射程限定)。

## 監査・秘密情報

- 本 Unit は監査イベントを生成しない(述語は読み取りのみ — FD「書き手はいない」)。裁定の生成・記録は core / advisory Unit の所有。
- 秘密情報・暗号: 該当なし(1 行理由)— state / projection の公開状態値のみを読み、credential を扱わない。

## 適用 NFR との対応

| NFR | 分類 | 本設計での充足 |
| --- | --- | --- |
| NFR-1(fail-closed 実証) | **適用(FR-STOP-1 維持側の面 — questions D1)** | Q2/Q3 の落ちる実証(無条件共有化 → 赤。注入 → 赤 → 復元 → 残渣ゼロの 1 セット)を code-generation 成果物に記録 |
| NFR-4(TDD) | **適用** | t445(unit — export 述語の in-process 駆動)/ t121 拡張(integration — 実 FS projection)を失敗テスト先行で追加 |
| NFR-5(ドリフトゼロ) | **適用** | 編集正本は `packages/framework/core/hooks/amadeus-stop.ts`(+t121/t445)。`bun run build` 後の追跡ファイル不変 |
| NFR-7(ゲート集合) | **適用** | PR CI のブロッキング集合を全通過(allowlist 行 remap は U-6 — FD D2 の帰結) |
| NFR-2(監査追跡性) | **非適用**(1 行理由: AUTO_DECIDED の生成・replay は core / advisory Unit の所有 — 本 Unit は読み取り述語のみ) | — |
| NFR-3(parser 実行コスト) | **非適用**(1 行理由: flag parser は `launch-autonomy-flag` の所有) | — |
| NFR-6(provenance 偽装不能) | **非適用**(1 行理由: 述語は provenance の受理境界を持たず、human-command 由来性を判定材料として読むだけ) | — |

NFR 全 7 件の分類の閉包: **適用 4 件(NFR-1/4/5/7 — うち 1 は FR-STOP-1 維持側の面に限定)・非適用 3 件(NFR-2/3/6)**(questions D1 と一致)。

## セキュリティ観点の検証手段

- Q1〜Q3 は t445 の判定表全行+t121 拡張+FR-STOP-1 (2) の落ちる実証で固定する。
- 「開放点 1 つ」「cap / budget 不変」は実装 PR の diff 照合(`:457` / `:716` / `:153` / `:159` 相当行が hunk に現れない)で機械確認する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T12:48:10Z
- **Iteration:** 1
- **Scope decision:** none

両成果物は produces (security-design.md + logical-components.md のみ、kind=library の正しい適用集合) と FD (述語2本・呼び出し点 :422 のみ開放・t445/FR-PIN-2) に整合し、NFR7件の分類(適用4=1/4/5/7、非適用3=2/3/6)は両ファイル・questions D1 と一意で無矛盾、縮退方向(catch→false=保守側)の主張も FD 転記と一致、blast radius も方向別に層別されている。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/stop-question-carveout/nfr-design/security-design.md:26 — 「AUTONOMOUS_BLOCK_CAP(:153)とstopBudgetMode(:159)は本Unitのdiffに現れない」の行番号引用は、present consume の business-logic-model.md にも本レビューの読み取り対象2成果物にも実測裏付けがない(FD 側は t147:721/723 のみを verbatim 実測済みで :153/:159 には触れていない)。cid:requirements-analysis:mechanism-cite-verify-at-draft に照らし、次イテレーションまでに business-rules.md 等の一次資料で file:line を実測確認するか、確立済み決定の出典(RA/FD側の該当箇所)を明記されたい。ブロック水準の反証(上流との明確な矛盾)は未確認のため BLOCKER とはしない(conductor 対応: complete-review 前に出典明記+HEAD 5f6561ee での grep 再実測(両行現存一致)を security-design.md 当該行へ追記済み)
- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/stop-question-carveout/nfr-design/security-design.md:51 — 「NFR全7件の分類の閉包」の文言が logical-components.md 側には同一文として存在せず表(35-39行)のみで示される。閉包宣言そのものは両ファイルで数値・NFR番号とも矛盾なく一致しており実害はないが、様式を揃えると照合コストが下がる
