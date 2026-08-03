# Security Design — unit `mirror-property`(U7・Could)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(明記): 同 unit の business-rules.md(BR-MP-2 / BR-MP-7 / BR-MP-8)、domain-entities.md(§2 の検証所有表)。

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(FD 群の ref `c8702be09` との対象パス差分は空)。

---

## 判定: 本 unit にセキュリティ設計対象は **無い**(N/A)

根拠は3点で、いずれも上流の実読事実である。

1. **プロダクションコードを変更しない**。business-logic-model.md §1 が変更面を `tests/unit/t274-amadeus-mirror-state-codec.test.ts` と `tests/helpers/arbitraries/mirror-snapshot.ts` の2つに閉じ、「プロダクションコードは1行も触らない」と定める(business-rules.md BR-MP-2 が合否基準まで固定)。攻撃面を持つコード経路が変わらない以上、新たな脅威は導入されない。
2. **読み側の fail-closed 境界は既に存在し、本 unit はそれを変更しない**。business-logic-model.md §1 の実読 — `MirrorStateParse`(`amadeus-mirror-state-codec.ts:111-117`)が `ok` / `invalid` の判別ユニオンで、検証失敗は `{ kind: "invalid"; issues }` を返す — のとおり、破損入力の棄却は既存実装の所有である。domain-entities.md §2 も「意味検証(キー集合・列挙・相互不変量)」の所有者を `parseMirrorStateDocument`(`:1666`)配下の `validate*` / `check*` 群と明記する。
3. **信頼境界外の入力を新たに導入しない**。P-MR1 が食わせるのは fast-check が生成する **妥当** snapshot のみ(business-logic-model.md §3、domain-entities.md §3)であり、外部由来の未検証データ・秘匿情報・ネットワーク入力・ファイルシステム入力を一切扱わない(実 FS を触らないことは business-rules.md BR-MP-10 が `tests/unit/` 層維持の根拠として明記)。

## 隣接領域との境界(N/A の輪郭を誤読させないため)

| 関心 | 所有 | 本 unit |
| --- | --- | --- |
| 破損台帳・不正ワイヤ形の棄却(fail-closed 契約の property 化) | unit `state-pbt` / `election-readpath`(requirements.md FR-4a の2種書き分けは Must unit にのみ課される — business-logic-model.md §4) | **射程外**。mirror 境界での重ね張りは Out of scope に抵触(business-rules.md BR-MP-7) |
| mirror コーデックの棄却 example 16 件(`describe("codec rejection")` `:72-313`) | 既存 t274(不改変 — BR-MP-3) | **触れない** |
| 秘匿情報の redaction | telemetry 境界(本 intent 対象外) | 非関与 |

したがって本書は「セキュリティ検査を省略してよい」ではなく、**本 unit の変更面には検査対象が実在しない**ことの記録である。既存の棄却契約・fail-closed 契約は所有者が別に居り、本 unit はそれを弱めない(BR-MP-3 の削除行 0 行という機械合否がその保証機構)。

## テスト資産としての最小限の衛生規律

セキュリティ設計ではないが、テスト追加に伴う実務上の禁止事項として次を再掲する(いずれも business-rules.md が既に合否基準を持つ)。

- 認証情報・トークン・実在の Issue 番号やリポジトリ識別子を生成器へハードコードしない。`issueNumber` は `fc` による数値生成に限り、`provenance` と対でのみ生成する(domain-entities.md §3、I-9)。
- 被検側(`parseMirrorStateDocument`)を生成器の妥当性フィルタに使わない(BR-MP-8)。妥当性を被検側に問うと、棄却規則の欠陥が「生成されなかった」形で無音化する — これは検証劇場に相当する。
