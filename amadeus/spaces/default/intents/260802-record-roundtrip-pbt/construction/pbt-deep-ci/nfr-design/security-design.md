# Security Design — unit `pbt-deep-ci` (#1980)

上流入力(consumes 全数): business-logic-model.md(本文 §1 の境界確定・§2 の権限面・§3 の fail-closed で依拠。同 unit の business-rules.md BR-PDC-16 / BR-PDC-17 / BR-PDC-5 / BR-PDC-6 と domain-entities.md E-1 / E-5 も併読した — 宣言外の追加入力)(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(`.github/workflows/` は business-logic-model.md の測定 ref `c8702be09` から差分ゼロ)。

---

## 1. 適用範囲の判定 — 部分 N/A

本 unit はアプリケーションコードを1行も追加しない(business-logic-model.md §1「本 unit がプロダクションの関数・型を1つも新設しない」)。したがって一般的なセキュリティ設計項目のうち、次は**該当なし**である:

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| 認証・認可の実装 | **N/A** | 本 unit に認証主体・認可判定を行うコードが無い。起動権限は GitHub の `workflow_dispatch` 仕様(書き込み権限保持者のみ)が所有し、本 unit はその判定を実装も迂回もしない |
| 暗号・鍵管理 | **N/A** | secrets を1つも参照しない(§2)。署名・暗号化を行う経路が無い |
| 個人情報・機微情報の取り扱い | **N/A** | 扱うデータは PBT の生成値(fast-check の arbitrary 出力)とテストのアサーション結果のみで、実データを読まない |
| 通信路の保護 | **N/A** | ネットワークアクセスは `actions/checkout` と `bun install --frozen-lockfile` の 2 経路のみで、いずれも既存ジョブと同一の GitHub / npm レジストリ経路。本 unit が新規の外部通信を導入しない |
| 入力サニタイズ(ユーザー入力) | **N/A** | `workflow_dispatch` の `inputs` を定義しない(BR-PDC-12 が予算・seed をコード定数の所有と定める)。したがって利用者が注入できる文字列が存在しない |

**該当する面は 3 つ**であり、以下で扱う: (S-1) 最小権限、(S-2) サプライチェーン(action の SHA ピン)、(S-3) 検証の fail-closed。

---

## 2. S-1: 最小権限

| 設計 | 値 | 根拠 |
| --- | --- | --- |
| ジョブ `permissions` | `contents: read` | BR-PDC-17。`.github/workflows/ci.yml:514-515` の `formal-model-check` と同形(実文 `    permissions:` / `      contents: read`) |
| secrets の参照 | **なし** | `${{ secrets.* }}` を書かない |
| 書き込み対象 | ランナーの作業ディレクトリのみ(`pbt-deep-run.log`) | domain-entities.md E-6。アーティファクトへアップロードしない |
| 起動可能な主体 | リポジトリへの書き込み権限保持者 | GitHub の `workflow_dispatch` 仕様。本 unit は `on:` を変更しない(BR-PDC-2)ため、この境界を広げない |

`contents: read` は「ワークフローが変更を push できない」ことを構造的に保証する。深掘りジョブはテストを走らせるだけで、baseline fixture の自動更新のような書き戻しを一切行わない — 再 baseline は人間が PR 内で行う手作業である(BR-PDC-14)。**自動書き戻しを設けないこと自体が権限を read に留められる理由**であり、両者は同じ設計判断の表裏である。

---

## 3. S-2: サプライチェーン(action の SHA ピン)

BR-PDC-16 が要求するとおり、本 unit が使う action は**コミット SHA ピン**で参照し、値は同ファイル内 `formal-model-check` と逐語一致させる。実測(`.github/workflows/ci.yml`、HEAD):

```
      - name: Checkout
        id: formal-checkout
        continue-on-error: true
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4

      - name: Set up Bun
        id: formal-setup-bun
        if: always()
        continue-on-error: true
        uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2
        with:
          bun-version: 1.3.13
```

同一ファイル内に**タグ参照の先例も存在する**点は明示しておく必要がある: `.github/workflows/perf.yml:45` は `uses: actions/checkout@v4`、`:52` は `uses: oven-sh/setup-bun@v2` である。すなわち「引用元の様式に倣う」だけでは SHA ピンにならない — 本 unit は失敗方針を perf.yml から、**配置と pin 方式を `formal-model-check` から**採る合成であり(business-rules.md「引用元との意図的相違」が失敗方針について述べた合成の、pin 面での対応物)、pin については perf.yml に倣わない。この意図的相違を明記する(`cid:application-design:citation-semantics-check`)。

### この pin は既存テストで強制されない

`tests/formal-verif/support/ci-workflow-contract.ts` の pin 検査は `formal-model-check` ジョブ限定である。実測(同ファイルの関数構成):

```
48:function stepById(job: WorkflowJob, id: string): WorkflowStep | undefined {
52:function inspectFormalSteps(formal: WorkflowJob): string[] {
54:  const checkout = stepById(formal, "formal-checkout");
55:  const setup = stepById(formal, "formal-setup-bun");
```

`inspectFormalSteps` は引数 `formal`(= `jobs["formal-model-check"]`)のステップだけを `stepById` で引く。**`pbt-deep` のステップは検査対象に入らない。** したがって本 unit の SHA ピンは機械ガードで守られておらず、**レビュー観点として明示するのが唯一の担保**である(BR-PDC-16 が同旨を記す)。

これを機械化するか否かは本 unit のスコープ外である — `inspectFormalSteps` の一般化は `tests/formal-verif/support/` の契約変更であり、components.md U5 の所在(`ci.yml` + fixture)を超える。ガードを新設しないことによる残存リスクは reliability-design.md §4 のリスク表 R-3 に引き継ぐ。

---

## 4. S-3: 検証の fail-closed(セキュリティ面としての意味)

BR-PDC-5(パス実在の事前検査)と BR-PDC-6(実行ファイル数の事後照合)は、機能面では「実行漏れの検出」だが、セキュリティ面では**偽の検証記録を作らないこと**の保証である。

`cid:build-and-test:test-path-set-completeness` が記録するとおり、Bun は不存在 path を無音で除外したまま exit 0 になり得る。この経路が塞がれていない場合に成立してしまう状態は:

- 対象ファイルがリネーム・削除されたのに、深掘りジョブは緑のまま残る
- 「深掘りを回して反例なし」という記録だけが積み上がる
- 実際には 0 ファイルしか走っていない

これは org.md Forbidden の「検証劇場」— 結果を実行から導かない検証 — そのものであり、**偽の信頼を生む分だけゲート不在より悪い**。したがって両検査は fail-closed(不一致なら exit 非 0)でなければならず、警告に降格してはならない。

| 検査 | 述語 | 不成立時 | 降格の可否 |
| --- | --- | --- | --- |
| 事前(BR-PDC-5) | 対象列の全要素がファイルとして実在 | exit 非 0 | 不可(警告化は検証劇場) |
| 事後(BR-PDC-6) | `Ran <N> tests across <M> files` の M == 列の要素数 | exit 非 0 | 不可(同上) |

事後照合の抽出述語は**数値部のみを取り、語尾に依存してはならない** — 実測で単数形 `file` と複数形 `files` の両方が現れる(HEAD 実測: `Ran 2 tests across 1 file. [87.00ms]` / `Ran 7 tests across 1 file. [83.00ms]`。複数ファイル時は `files`)。語尾を含む正規表現は 1 ファイル時に無音で不一致となり、**fail-closed が意図せず常時赤という別の壊れ方をする**(domain-entities.md E-5 が同旨を記す)。

---

## 5. 攻撃面の増減

| 面 | 変化 | 説明 |
| --- | --- | --- |
| ワークフローの起動口 | **増えない** | `ci.yml:8` の `  workflow_dispatch: {}` が既存。本 unit はトリガ定義を追加しない(BR-PDC-2) |
| ワークフローファイル数 | **増えない** | `ls .github/workflows/` = `ci.yml` / `metrics-maintenance.yml` / `perf.yml` / `release.yml` の 4 件のまま(HEAD 実測)。BR-PDC-4 |
| 権限の広さ | **増えない** | `contents: read`(§2) |
| 外部依存 | **増えない** | action 2 種はいずれも同ファイル内で既に使われているもの。新規 action を導入しない |
| CI 設定の改ざん検出力 | **維持** | 再 baseline(BR-PDC-14)により、以後の未承認編集は引き続きハッシュ差で検出される。既存テスト `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` の「未承認編集はハッシュを反転させる」ケースが再 baseline 後も緑であることを実証する(business-rules.md「落ちる実証の設計」の緑側) |

**再 baseline は検出力を下げる操作ではない** — ピンの基準点を「承認済みの新しい ci.yml」へ更新するだけで、正規化が strip する 3 領域(U4 固有)は変わらない(domain-entities.md E-2)。ここを混同すると「再 baseline = ガードを緩めた」という誤読が生じるため明記する。

---

## 6. 上流成果物の本文参照(consumes の依拠箇所)

| 上流成果物 | 本書での依拠箇所 |
| --- | --- |
| business-logic-model.md | §1(§1 の「新設関数ゼロ」= 認証・暗号・入力サニタイズが N/A である根拠)、§3(§3.2 のジョブ内フロー [4] [6] が fail-closed の要であること、INV-5)、§4(§6 の loud fail 成立条件と `continue-on-error` 禁止)、§5(§3.1 の起動フローと `ci.yml:8` の既存 `workflow_dispatch`) |
