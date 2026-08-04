# Intent Statement — 260803-pi-harness

## Problem Statement

Amadeusは複数のAIコーディングハーネスへ同一の決定論コアを配布するが、現時点ではPi Coding Agentを正式ハーネスとして扱っていない。Piはプロジェクトの`AGENTS.md`と`.agents/skills/`を読み込めるため、AmadeusのskillとBun製エンジン自体は起動できる。一方、現在のdoctorはPiを識別せずCodexとして検査し、Piのextension eventを監査・human gate・継続制御へ接続するadapter、subagent実行、専用installer、配布契約、適合テストも存在しない。この状態では「一部コマンドが動く」だけで、監査可能なAI-DLCとして正式サポートを表明できない。

本intentでは、共通コアをPi向けに分岐させるのではなく、Pi Coding Agentのネイティブなskill、extension、package、CLI実行面へハーネスadapterを追加する。これにより、既存ハーネスと同じ状態機械・監査ログ・承認ゲートをPi上で利用可能にする。

## Target Customer

- **第一の顧客**: Pi Coding Agentを利用するAmadeusユーザー。Piの標準的な導入・操作方法のまま、監査可能なAI-DLCワークフローを実行できる
- **第二の顧客**: Amadeusの開発者・保守者。Pi上でAmadeusをdogfoodし、one-core/many-harnesses契約と移植ガイドの実効性を継続検証できる
- **間接的な受益者**: PiのextensionまたはPi Packageを利用してワークフローを拡張する開発者。AmadeusをPiネイティブ統合の実例として参照できる

## Success Metrics

以下をすべて満たしたとき、Piを正式対応ハーネスとみなす。

1. Pi用の手書きソースから`dist/pi/`を決定的に生成でき、packaging・promote-self・byte-parityのdrift guardが通る
2. 既存setup CLIの`--harness pi`で導入でき、同一生成物をPi Packageとして`pi install -l`でも導入できる。両経路の内容一致を自動テストで証明する
3. Pi 0.83.0以上で、skill起動、session lifecycle、user input、tool call、compaction、agent settled/shutdownをAmadeusの監査・継続制御へ正しく変換できる
4. Piネイティブなhuman gateとsubagent実行が成立し、agent role・親子関係・終了状態が決定論的な契約テストを通る
5. Pi専用doctorがバイナリ版、project trust、skill、extension、配布物、実行依存関係を検査し、Codex固有要件を誤って要求しない
6. セルフインストール後の対話TUIで`/skill:amadeus`、extension event、human gate、doctor、subagentを実走して成功する
7. `pi -p`またはRPCを駆動するopt-inのlive journeyを少なくとも1本追加し、ローカル実機でgreenを確認する
8. Pi利用者向け導入・運用文書とハーネス保守者向け実装文書が更新され、既存の全ハーネス回帰テストがgreenを維持する

## Initiative Trigger

- ユーザーがPi上でAmadeusを利用したいという具体的なdogfood要求を提示した
- ローカルのPi 0.83.0で、`AGENTS.md`、`.agents/skills/amadeus`、Bun製エンジンの起動までは実測でき、未対応箇所がハーネス境界に集中していると判明した
- Pi 0.83.0は、必要なsession・input・agent・tool・compaction eventとPi Package配布を提供しており、正式adapterを実装できる技術的な入口が揃っている
- 現状の部分動作を正式対応と誤認すると、doctor、監査、承認ゲート、subagentに関する信頼性リスクがあるため、サポート契約を明確にする必要がある

## Initial Scope Signal

**`self-feature` / Brownfield / Standard depth / Comprehensive test strategy**。既存の決定論コアと他ハーネスの挙動を維持しながら、Pi用ハーネス表層、installer、doctor、配布、文書、適合テストを追加する。

正式対象は`@earendil-works/pi-coding-agent` CLIであり、その内部依存である`@earendil-works/pi-agent-core`を直接利用する独立SDK埋め込みAPIは対象外とする。最低対応版は、必要event surfaceを実測したPi 0.83.0とする。古い版は互換性を設計・テストで証明できた場合のみ対応範囲へ含める。

配布は、既存setup CLIをAmadeus側の正本としつつ、同一生成物をPi Packageとしてもプロジェクトローカル導入できる二重チャネルとする。完了判定には決定的テストだけでなく、対話TUIのdogfoodと自動live journeyを含める。
