上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

# Delivery Planning Questions — test-pyramid-rebuild(#684)

## E-OC1 判定申告欄(cid:requirements-analysis:no-election-judgment-gate)

各設問について、選挙実施が必要か・選挙不要と判断するかを1問1行で申告し、leader 承認を得てから該当行へ記入する。**[Answer] タグは選挙裁定受領後、または選挙不要判定への leader 承認後にのみ記入する(election-answer-after-ruling / no-election-judgment-gate)。conductor は本ファイル作成時点で先取り記入しない。**

- Q1: 選挙実施 E-TPR-DP。裁定 A(2026-07-17T13:58:17Z 開票)
- Q2: 選挙実施 E-TPR-DP。裁定 A(全会一致)
- Q3: 選挙実施 E-TPR-DP。裁定 A(2-1、起草者推奨 B は敗)
- Q4: 選挙実施 E-TPR-DP。裁定 A(2-1、留保 e1 転記)

## Q1: Walking Skeleton 姿勢 — Bolt 1(U1)は単独ゲート要否

### 論点

org.md「Walking Skeleton」は greenfield スコープ(mvp/enterprise/feature/poc/workshop/infra)で Bolt 1 の単独・ゲート付き実行を既定とする。本 intent(amadeus スコープ、project.md「スコープ既定」)は既存コードベースへの設計・台帳 materialize であり、新パッケージ・新配布経路の greenfield 要素は薄い。一方で project.md「Walking Skeleton」は「greenfield 要素を含む intent では最初の Bolt を小さな end-to-end スライスとして扱い、以後の拡張前に人間がゲートで確認する」とし、U1 は他ユニットが依存する根・3消費者を持つ最小スライスという性質上、スケルトン相当の扱いが妥当という見立てがある(bolt-plan.md「Walking Skeleton 姿勢」)。

### 選択肢(MECE)

- A. Bolt 1(U1)を walking-skeleton として単独実行しゲートする(推奨 — bolt-plan.md の見立てと整合、根ユニットの正しさを最初に検証できる)
- B. Bolt 1 も他 Bolt と同様に扱い、単独ゲートのセレモニーは行わない(org.md の scope 別デフォルトの厳密解釈 — greenfield 非該当と読む場合)
- C. ユーザーへ直接エスカレーション(正準リスト該当性が不明瞭なため)

[Answer]: A — Bolt 1(U1)を walking-skeleton 相当で単独実行しゲートする。E-TPR-DP Q1=A(2-1+起草者、GoA 1x3)。記録(e1 A 受容度7): incremental でのセレモニー空回し懸念 — U1 は3消費者を持つ根であり根の正しさを最初に検証する価値がセレモニーコストを上回ると判断。

## Q2: Bolt 2(U2)⇔ Bolt 3(U3)の並行 vs 直列

### 論点

unit-of-work-dependency.md は U2・U3 に相互データ依存がないと結論する(C4→C2 は判定参考のみで実データ依存ではない)。bolt-plan.md はこれを根拠に並行実行を推奨するが、両 Bolt が record 成果物として書き込むディレクトリが実際に非交差か(c6)は construction 進入時の実 diff/静的目録突き合わせでのみ確定できる。

### 選択肢(MECE)

- A. 並行実行を既定とし、着手前の非交差判定(c6)がクリアした場合のみ実施する(推奨 — DAG 上の独立性を活かしリソース効率を稼ぐ)
- B. 直列実行を既定とし、Bolt 2 完了後に Bolt 3 を着手する(安全側だがフロー効率が下がる)
- C. builder リソース状況(rate-limit-idle-allowance)に応じて都度判断する

[Answer]: A — 並行実行を既定とし着手前の非交差判定(c6)クリア時のみ実施。E-TPR-DP Q2=A(全会一致、GoA 1x3)。

## Q3: swarm finalize の適用可否(record 成果物への --claimed 要求)

### 論点

team.md cid:swarm-finalize-claimed-required は construction の code-generation ステージにおけるコード実装 finalize の運用(--claimed 必須)を定める。本 intent は実装 Out で record 成果物(設計台帳・計画文書)の construction であり、この運用をそのまま適用すべきか、record 成果物向けに簡略化すべきかが未決。

### 選択肢(MECE)

- A. 同一運用を適用する(conductor の明示クレームを経ずに finalize しない)
- B. record 成果物専用の簡略運用とする(単一 conductor の確認のみで足りる — Bolt 2/3 は各1名 builder のため merge 主体が単一)
- C. construction 進入時に conductor が実運用状況を見て判断する(本 delivery-planning では確定しない)

[Answer]: A — swarm finalize --claimed 同一運用を適用(conductor 明示クレームを経ずに finalize しない)。E-TPR-DP Q3=A(2-1、起草者推奨 B=簡略は敗)。理由: 緩和はガードに内容別の穴(e3)・検証意味論は record 成果物でも同一(e4)。記録(e1 A 受容度7): over-application 懸念。

## Q4: builder 数(Bolt 2/3 並行時)

### 論点

team.md cid:parallel-bolts は intent あたり同時アクティブ builder 最大4を上限とする。team-allocation.md は Bolt 2・Bolt 3 それぞれ1名(計2名)を既定案とするが、reviewer 独立性確保(role-model)のため conductor/builder/reviewer を全て分離すると人員が膨らむ可能性がある。

### 選択肢(MECE)

- A. Bolt 2・Bolt 3 それぞれ 1 builder(計2、上限4に対し余裕あり)+ reviewer は Bolt 間で輪番(推奨 — team-allocation.md の最小構成方針と整合)
- B. Bolt 2・Bolt 3 それぞれ conductor 兼 builder 1名 + 専任 reviewer 1名(計4、役割分離を最大化)
- C. ソロモード運用時は builder 数の論点自体が不成立(1エージェントが順次担当) — モード判定後に再考

[Answer]: A — Bolt2・Bolt3 各1 builder(計2、上限4に余裕)+reviewer は Bolt 間で輪番。E-TPR-DP Q4=A(2-1、GoA 1x2 2x1)。**留保転記(e1, GoA2)**: 『計4/計2』はチームモード前提であり、ソロモードでは同一セッション順次に帰着する。輪番割付では**自己実装 Bolt のレビューを担当しない**(role-model 既決の執行)— bolt-plan/team-allocation に明記。
