# Performance Requirements — static-gate-engine

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とし、短命 Bun CLI `static-gate-engine` の性能合否を定義する。常駐 service、HTTP、database、autoscaling は対象外である。

## 性能目標

| ID | 対象 | 合格条件 |
| --- | --- | --- |
| PERF-SG-01 | cold 実行 | GitHub Actions `ubuntu-latest` 相当、Bun 1.3.13、frozen install 後の独立した fresh workspace 5件で、各 workspace の初回 `bun run no-silent-drop` がすべて15秒以内 |
| PERF-SG-02 | warm 実行 | PERF-SG-01 の各 workspace で直後に再実行した5値がすべて15秒以内 |
| PERF-SG-03 | child process | 1回の check につき pinned ast-grep child process は1回。candidate rules と coverage sentinel を同一 invocation で取得 |
| PERF-SG-04 | source I/O | authored source は各regular fileにつき初期snapshot確定の1回と走査後manifest検証の1回だけ実体を読み、ast-grep と TypeScript はその間snapshot mirror／overlayを消費 |
| PERF-SG-05 | 出力決定性 | 同一revision・config・dependency receiptの反復でstdout bytesとfinding順序が一致 |

15秒を超えた場合も、走査対象の削減、partial scan の許容、semantic全path検査の省略、precision条件の緩和は認めない。

## レイテンシ予算

| 区間 | 要求 |
| --- | --- |
| manifest／snapshot | repository-relative path順に初期snapshotを単一passで構築し、走査完了後の再hashを別の単一passで行う。各pass内で重複読取りを行わない |
| ast-grep | package binaryを私有tempへ1回copy・digest検証後、rule bundleとsentinelをまとめた単一spawn。shellを介さず検証済み私有copyのliteral argvを使う |
| semantic classification | `SemanticCandidateUniverse` は全対象ASTをwalkし、詳細なcontrol-flow解析はcandidateへ限定する |
| ledger policy | identity順の集合演算とし、件数に対する二重ループを避ける |
| rendering | 完成済みResultをstdout／stderr／exit codeへ各1回だけ投影する |

## 資源制約

- 実行は1 Bun process、1 ast-grep child process、最大2 Git child processで完結させる。Git childはtrusted base revisionのbaselineとexemptionをliteral `git show` で各1回読む用途だけに限定し、source、candidate、finding単位では起動しない。
- network、credential、remote service、daemon、watch modeを実行時依存にしない。
- 全source bytesを複数の独立コピーへ増幅しない。snapshot、read-only mirror、TypeScript overlayの所有関係を明示する。
- timeout時に精度を落とすfallbackや、未走査分を成功扱いする経路を設けない。

## 測定手順と証跡

1. revision、runner image、Bun／ast-grep／TypeScript version、対象manifest digestを記録する。
2. 独立したfresh workspaceを5件用意し、frozen install完了後の最初の実行をcoldとして測る。
3. 各workspaceで同じcommandを直後に1回実行しwarmとして測る。
4. cold／warmを別群で保持し、平均値ではなく各群の最大値を合否へ使う。
5. 10実行すべてでexpectedCount、scannedCount、manifestDigest、stdout digestが同一であることを確認する。
6. child process回数、source read回数、candidate数も併記し、15秒達成が完全性低下によるものでないことを示す。
7. `tests/tools/rss-tree-sampler.ts` を測定ownerとし、root Bun PIDと `/proc/<pid>/task/<pid>/children` から得る全descendant（ast-grep、Gitを含む）の `VmRSS` を10ms間隔で合計する。command開始直前から全child reapまでの同時合計最大値、sampler source digest、sample数、観測PID数を記録し、Bun親だけのRSSを合否に使わない。

## 受入条件

- PERF-SG-01〜05を自動テストまたは再現可能なbenchmark commandで検証できる。
- cold／warm各5値、最大値、revision、command、母集団が成果物に残る。
- zero／partial／tool missingを注入した実行は短時間でもPassにせず、typed Errorとexit 2を返す。
- performance regression時は完全性を保ったまま原因区間を特定できる。

## Revision Cycle 3 Resolution

- checked-in toolchain receiptを信頼元とし、digest検証済みの私有binary copyだけをspawnするため、probe後差替えを実行bytesへ伝播させない。
- child failureを既存InfraCodeの閉集合へ一意に写像し、固定message prefixで詳細原因を保持する。
- evidence commitをsame-directory hard-linkによるatomic no-replaceへ固定し、競合writerでも既存pathを上書きしない。
- peak RSSはBun親ではなくast-grep／Gitを含むprocess tree同時合計として測定する。
- sourceは`O_NOFOLLOW` descriptorとdevice／inode照合へ結合し、path検査後差替えによるTOCTOUを拒否する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T06:58:19Z
- **Iteration:** 1
- **Scope decision:** none

必須セクションと上流参照は満たすが、実装契約と計測可能性に5件の不整合が残る。

### Findings

- PERF-SG-04 の「1ファイル1回読取」は、FR05 と business-logic-model.md が要求する走査後再ハッシュと矛盾する。初期スナップショット読取と走査後検証読取を区別すること。
- 「Bun 1プロセス + ast-grep 子プロセス1個」は、GitReadPort の git show 実行と矛盾する。Git 子プロセスを固定上限付きで許可するか、プロセスレス Git 読取を決定すること。
- REL-SG-01 は baseline・exemption 異常をすべて Error/exit 2 とするが、ポリシー増加・置換・失効 exemption は Violation/exit 1 である。基盤異常とポリシー違反を区別すること。
- scalability-requirements.md に拡大フィクスチャと RSS の定量基準がない。観測基準負荷、代表的な拡大負荷、許容 RSS を定義すること。
- tech-stack-decisions.md は ast-grep の固定を述べるだけで、正確なパッケージ・バージョン・出力契約がない。固定値と capability probe を定義すること。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T07:04:26Z
- **Iteration:** 2
- **Scope decision:** none

必須セクション、上流参照、前回5指摘の反映は確認できたが、セキュリティ制御、障害コード、原子的出力、資源計測に実装者判断が残る。

### Findings

- 改変 ast-grep binary の拒否を要求する一方、通常 check は scan 1 spawnだけで、version確認は別CI probeに分離され、tool receiptの生成・検証契約も未定義であるため、probe後のbinary差替えを検出できない。実行binaryのliteral path、期待digestの信頼元、scan前のin-process integrity検証を固定する必要がある。
- timeout、signal、spawn I/O、resource exhaustionをtyped Errorとして個別注入するが、上流FR-09の閉じた InfraCode に対応codeも既存codeへの写像もなく、reliabilityの「既知の詳細codeを維持」と両立しない。各障害を閉集合のどのcodeへ写像するか上流契約と一致させる必要がある。
- evidence出力は既存path非上書きとpartial artifact非残存を同時に要求するが、記載されたtemp→lstat→renameでは確認後に作成された同名fileをPOSIX renameが上書きできる。same-filesystemのatomic no-replace commit方式と競合writer試験を決定しなければREL-SG-05を保証できない。
- peak RSS の上限は追加されたが、Bun親processだけかast-grep・Gitを含むprocess tree全体か、また測定器・sampling規則が未定義である。子processへメモリを移すだけで合格し得るため、L0/L2/L4の測定対象と再現可能な計測方法を固定する必要がある。
- symlink拒否とrepository外escape防止はpath検査だけで、検査したinodeと実際に読むinodeを結合する契約がない。lstat／realpath後にsymlinkへ差し替えて読ませ、走査後に戻すTOCTOUを防ぐため、no-follow open、descriptor fstat、descriptor経由read等の原子的読取境界を定義する必要がある。
