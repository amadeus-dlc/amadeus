# Business Rules: seam-bridge(U1)

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

BR 集合は unit-of-work の U1 責務境界と unit-of-work-story-map の U1 担当 FR/NFR から導出する。

## BR 一覧(テスト可能形)

- **BR-U1-1(バイト保存往復)**: seam 無変更の parse→serialize は入力と byte-identical。実ステージ全32ファイル(+plugin stage)に対する往復スイープをテストに含める(corpus-sweep — 新設ガードの「正当な既存データで赤くならない」側)
- **BR-U1-2(対象外バイト不変)**: produces のみ変更した serialize は produces span 外のバイトを変更しない(本文・他フィールド・コメント・空白の保存を fixture で固定)
- **BR-U1-3(serialize 後再 parse 検証)**: 書込前に再 parse 照合し、不一致は `roundtrip-mismatch` で書き込まない(壊れた frontmatter の混入防止 — fail-closed)
- **BR-U1-4(受理集合の最小性)**: serialize の書換え対象は produces seam のみ。他 seam 指定は `unsupported-target-seam` 拒否(落ちる実証: sensors seam を指定して赤)
- **BR-U1-5(既存受理形の不変)**: `parseHostStageSeams`(合成バイト形)の挙動・`serializeStageSeams` の出力は byte 単位で不変(t301 の既存テストが green のまま — 変更しない)
- **BR-U1-6(実ステージ parse 失敗の loud 化)**: frontmatter 実在で slug 不在・seam span 曖昧のファイルは typed error とし、compose を部分適用なしで中止(既存 rollback snapshot に相乗り)
- **BR-U1-7(unknown-seam の解消)**: 実 `code-generation.md` を持つ host への produces seam 宣言 manifest の inspectPlugin が `rejected/unknown-seam` でなく受理される(RE probe2 の赤 → 本 Unit で緑になる対照実証)
- **BR-U1-8(produces_kinds 非導入)**: 本 Unit の変更は code-generation.md へ produces_kinds を導入しない(FR-2c — grep で機械検査可能)
- **BR-U1-9(drop 可逆)**: install→drop 後の対象ステージファイルが install 前と byte-identical(cmp 機械確認 — FR-1b)
- **BR-U1-10(未 install 不変)**: compose を実行しない workspace ではステージファイル・compiled graph・produces が一切不変(NFR-1 の対実証)
- **BR-U1-11(trust 3層の不干渉)**: U1 の書換えは host stage(core 出自)のみ。plugin stage の O_NOFOLLOW run 検証・TrustGrant digest・provenance stamp の各機構は無変更で、plugin stage バイトへの書込 0(FR-2d — grep/digest 照合で機械検査可能)
- **BR-U1-12(SeamListStyle の判定)**: seam 配列の様式判定は決定的 — 対象 seam 行が `<name>: [...]`(1行 flow)なら `flow-empty`(実測: 実ステージの空 consumes は `consumes: []`)、`<name>:` 行+後続の `- item`/`- artifact:` 行群なら `block-list`。どちらにも一致しない場合は `seam-span-ambiguous` で fail-closed

## テスト戦略との対応(Comprehensive)

- parse/serialize の純関数部: unit 層(バイト列 fixture 駆動、fs 非依存)
- compose E2E(fixture workspace の install→検査→drop): integration 層(fs-tests-integration-first)
- 落ちる実証(レポート削除→batch 再発出)は engine 実挙動(next の JSON 出力)で検証 — テストが読む面は compiled graph と next 出力(injection-surface-verify)
- tNNN は t444 以降を予約(NFR-5)。t301/t299 等の既存 plugin テストは全 green 維持
