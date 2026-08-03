# Business Rules — u7-ci-stage1

上流入力(consumes 全数): requirements(FR-4.1 / NFR-1 / FR-3.1 単一コマンド面)、component-methods(C7 段階1)、components(C7)、unit-of-work(u7 対応行 — 申告付きで FR-3.1 面を追記)、unit-of-work-story-map(Slice 2)、services(外部境界一覧 — 本 Unit が外部サービス非接触であることの negative 確認)。

## ルール一覧

- **BR-U7-1(段階1限定)**: 本 Unit は build 前段・入口ガード・再現性検査ジョブの3点のみ。旧 check 3種(dist:check / promote:self:check / compile --check)と detect-ci-changes は**無改変**(段階2 = u8 の原子切替対象 — 検査対象の追跡状態を変える変更は追跡変更と同一 PR)
- **BR-U7-2(入口ガード)**: run-tests 入口で dist 不在/空を検知したら loud fail(exit 1)+ build 案内。テスト本体 423 ファイルは無改修(G4)
- **BR-U7-3(再現性検査の比較形)**: A = CI 上で生成済みの dist、B = 隔離 temp dir での追加1回 build — byte 比較。出荷物・検証対象そのものが比較対象に入る形(u1 FD 手順5と同一の比較形 — 検査形式の canonical 1定義)
- **BR-U7-4(落ちる実証)**: (a) dist 退避状態で run-tests が入口ガード赤 (b) 再現性検査に故意の非決定性注入(temp 側 build 後の1 byte 改変)で赤 — の両側をテスト/実証で固定
- **BR-U7-5(build script の新設 — 本 Unit 所有)**: `bun run build` script(= dist + promote:self の合成)を本 Unit が package.json へ新設する(FR-3.1 の単一コマンド面。u5 依存の soft 前提は解消 — reviewer iteration 1 Major の是正)。入口ガード・u4 dispatcher の案内文言が指すコマンドはこの script
- **BR-U7-6(交差なしの申告)**: 本 Unit の編集面は ci.yml(前段追加・ジョブ新設)、tests/run-tests.ts(入口 — FR-4.1 表記の run-tests.sh は薄ラッパーで .ts 側実装が両経路をカバー、意図的相違を申告)、package.json(build script 追加)。u8 は ci.yml の**旧 check 撤去**を行うが DAG で直列(u8 depends_on u7)のため非交差判定不要(bolt-plan と一致)

## 受け入れ基準との対応

| BR | requirements AC |
|---|---|
| BR-U7-1/2 | FR-4.1(build-before-test・入口ガード)/ 受け入れ「CI がクリーン checkout から build → 検証まで完走」の前半 |
| BR-U7-5 | FR-3.1(単一コマンド生成 — script 新設面を u7 が所有、申告付き) |
| BR-U7-3 | NFR-1(隔離2回生成 byte-identical の検査形式化)/ 受け入れ「隔離2回生成が byte-identical」 |
| BR-U7-4 | 落ちる実証必須(org.md Mandated) |
