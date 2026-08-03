# Logical Components — scope-ledger (U6 / FR-6a)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(同 unit の FD): business-rules.md、domain-entities.md(本文で実参照)。

測定 ref: repo 内 file:line は **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(`git rev-parse HEAD` の出力転記)の実測。

## 0. 前提: ここでいう「コンポーネント」

本 unit にはランタイムコンポーネントが存在しない。business-logic-model.md §1 実文 `component-methods.md は **U6 の節を持たない**(不在主張の反証確認: \`grep -c "U6" .../application-design/component-methods.md\` → \`0\`…)` および同節 実文 `本書が固定するのは **関数の振る舞いではなく文書の構造と生成手順**である。` のとおりである。

したがって本書が層別するのは**責務と保証機構の論理的な層**であり、デプロイ単位・プロセス・モジュールではない。新規プロダクションコンポーネントはゼロである(business-logic-model.md §1 が引く components.md の限定と整合)。

本書の断定的インベントリ(§2 の層表・§4 の面表)は、reliability / security / performance / scalability の各設計を確定させたうえで導出したものであり、設計途中の早期断定ではない。

## 1. 論理層の全体像(ASCII)

```
  [外部・所有外]                  [record 内・本 unit 所有]                 [検査]
  ┌──────────────┐               ┌───────────────────────────┐          ┌──────────────┐
  │ Issue #1980  │──転記+併記──▶│ L2 引用層(SourceCite)      │          │              │
  │ 本文(可変)  │               │  locator + 取得メタ + 断片 │          │              │
  └──────────────┘               └───────────┬───────────────┘          │  L4 検査層   │
  ┌──────────────┐                           │                          │  A1〜A5      │
  │ requirements │──HEAD SHA──▶ ─────────────┤                          │  (ローカル   │
  │ .md 等(版管理)│                          ▼                          │   完結)     │
  └──────────────┘               ┌───────────────────────────┐          │              │
                                 │ L1 写像層(判定表 M・語彙) │◀─照合───│              │
                                 └───────────┬───────────────┘          └──────┬───────┘
                                             │ 適用                            │ 合否
                                             ▼                                 ▼
                                 ┌───────────────────────────┐          受入可 / 不可
                                 │ L3 台帳層(ScopeLedger)    │          (部分受理なし)
                                 │  9 行 + 注記 + 測定 ref    │
                                 └───────────────────────────┘
```

テキスト説明: 外部の可変資源(Issue 本文)と版管理下の確定物(requirements.md 等)が L2 引用層を経て record へ取り込まれる。判定の写像は L1 で FD 段に固定済みであり、L3 台帳はその写像を適用した結果として書かれる。L4 検査層は L3 を L1 と照合し、外部資源へ再アクセスせずに合否を出す。

## 2. 層ごとの責務と保証機構

一枚岩の「構造的保証」は主張しない。層ごとに、守る対象・守らない対象・保証の機構を分けて記す。

| 層 | 責務 | 保証機構 | 保証しないこと |
| --- | --- | --- | --- |
| **L1 写像層** — business-logic-model.md §4 判定写像 M、domain-entities.md §3 語彙(`ScopeVerdict` / `Assignee`) | 9 件の Issue → 射程判定・分担先の対応を record 内へ固定する | FD 段での固定(business-logic-model.md §4 実文 `FD 段でこの表を固定し、実装(執筆)段では**判定を再導出しない**。`)。閉集合語彙(business-rules.md `:16` BR-SL-2) | 出典 `:72` 自体の正しさ。出典が改稿された場合の追随 |
| **L2 引用層** — domain-entities.md §3.3 `SourceCite`、business-rules.md `:24` BR-SL-10 | 外部・版管理双方の出典を、後から照合可能な形で保持する | 三点併記(locator + 取得コマンド/取得日 + verbatim 断片 — reliability-design.md §1 R-1〜R-3)。版管理下の出典は測定 ref(HEAD SHA)で代替 | 外部原本の恒久性・改竄防止(外部所有)。改稿内容の自動追随 |
| **L3 台帳層** — `bug-scope-ledger.md`(ScopeLedger 実体) | 9 行の表と注記を、指定パスに規定の様式で置く | 記載規則 BR-SL-1〜BR-SL-13(business-rules.md `:15-27`)。行順は BR-SL-9、列は BR-SL-4 | 内容の意味的な妥当性(L1 の写像に従うのみで、独自判断を持たない) |
| **L4 検査層** — business-logic-model.md §5 A1〜A5 | L3 が L1・出典と一致することを機械検出する | ローカル完結の決定的述語(`test -f` / `grep -c` / 行数照合)。fail-closed(1 件でも不通過なら受入不可) | L1 写像層自体の正しさ。検査を通った台帳の「有用性」 |

各層は下位(より外側)の層の正しさを前提として自層の逸脱だけを検出する。層をまたいだ包括的な正しさの保証は存在しない — 出典の正しさは上流(requirements / intent 裁定)の責務である。

## 3. 責務の非重複(所有の一意性)

domain-entities.md §4「正規化と検証の所有」表を層に写すと次のとおりで、同じ関心を2つの層が所有していない。

| 関心 | 所有層 | domain-entities.md §4 の対応行 |
| --- | --- | --- |
| Issue 集合の確定(9件) | 本 unit の外(requirements.md `:47`) | `本 unit は転記のみ。増減しない` |
| 射程判定の確定 | 本 unit の外(Issue #1980 本文 `:72`) | `本 unit は再判定しない(BR-SL-8)` |
| 分担先の確定 | 本 unit の外(`:65` / requirements.md `:80`) | `明記なき件は補完しない(BR-SL-5)` |
| 語彙の正規化 | L1 | `本 unit(BR-SL-2 / BR-SL-4)` |
| 行順の正規化 | L1 → L3 適用 | `本 unit(BR-SL-9)` |
| 合否検査 | L4 | `本 unit(business-logic-model.md §5 の A1〜A5)` |

## 4. 変更面のインベントリ(設計確定後の導出)

| 面 | 変更 | 根拠 |
| --- | --- | --- |
| `amadeus/spaces/default/intents/260802-record-roundtrip-pbt/bug-scope-ledger.md` | **新規作成 1 件** | business-rules.md `:15` BR-SL-1(指定パス)、components.md が指定するパス(business-logic-model.md §1 が引用) |
| `packages/` 配下 | 無改修 | business-rules.md `:27` BR-SL-13 |
| `tests/` 配下 | 無改修 | 同上。本 unit はテストを持たない(business-rules.md `:36`) |
| `.github/workflows/` 配下 | 無改修 | 同上 |
| `dist/` / self-install ツリー | 無改修(再生成不要) | business-logic-model.md §6 実文 `本 unit は \`packages/framework/core/\` を触らないため … 投影条件(dist 7 ハーネス再生成・\`dist:check\` / \`promote:self:check\`)は**適用されない**。` |
| 検査ツール | **新設しない** | domain-entities.md `:100` 実文 `**検証コードは新設しない**。台帳は機械が消費するデータではなく人間が読む記録であり、検査は §5 の grep / 行数照合という決定的手順で足りる。` |

この表は reliability / security / performance / scalability の各設計を確定したのちに導出した(§0 の断り)。設計途中の暫定インベントリではない。

## 5. 依存関係

- 本 unit の外向き依存は **出典3系統の読み取りのみ**(business-logic-model.md §2 の表)。他 unit の成果物に依存しない。
- business-logic-model.md §6 実文 `unit-of-work-dependency.md の YAML edge block(\`:13-14\` 実文 \`  - name: scope-ledger\` / \`    depends_on: []\`)のとおり **依存なし**。`
- 他 unit の型を参照しない(domain-entities.md `:11` 実文 `他 unit の型を参照しない — 参照が生じないため cross-unit-type-verbatim-check の照合対象はない`)。

## 6. 状態と遷移(L3 の生成)

business-logic-model.md §3 の S0〜S4(5値)をそのまま採る。本書で状態を追加・改名しない。層との対応のみ示す:

| 状態 | 主に働く層 |
| --- | --- |
| S0 未着手 → S1 出典確定 | L2(引用層) |
| S1 → S2 行集合確定 | L1(写像層)の適用 |
| S2 → S3 生成済み | L3(台帳層) |
| S3 → S4 受入可/不可 | L4(検査層) |
| S4(不可) → S1 | L2 から再実行(部分受理を作らない) |

状態 5 × 遷移 5(うち後戻り 1)で、business-logic-model.md §3 の記述と個数が一致する(同節 実文 `状態は上記 S0〜S4 の5値で、後戻りは S4(不可)→ S1 のみ。`)。

## 7. 上流参照の補足

- business-logic-model.md §5 が定める A1〜A5 のうち A4・A5 は同節末尾で `FR-6a の合否を緩めない(追加のみ)` と位置づけられており、L4 検査層はこの追加分を含めて構成する。
