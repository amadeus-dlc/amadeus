# Business Rules — u001-engine-installer（260705-engine-installer）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-logic-model.md](business-logic-model.md)

## ルール

| ID | ルール | 出典 |
|---|---|---|
| BR-1 | 対象 workspace の `aidlc/` には作成も変更もしない | FR-1.9、CON-1 |
| BR-2 | settings.json は hooks 配線のみマージし、非対象キー・既存順序・複数ブロック構造を保持する。解析不能はエラー中断（無変更） | FR-1.6、AD-6 |
| BR-3 | symlink 位置に非 symlink 実体がある場合は上書きせずエラー中断し、対象と回復方法を案内する | FR-1.5 |
| BR-4 | エラー中断にロールバックはしない。適用済み工程は残存し、原因解消後の再実行で収束する。保証は衝突対象の無傷 | FR-1.8 |
| BR-5 | AMADEUS.md 変換は宣言的 2 層（H2 節 + 宣言的ブロック）で行い、宣言対象が原本に実在しない場合は throw する | FR-1.4、AD-3、business-logic-model |
| BR-6 | 配布対象の列挙はマニフェスト定数 1 箇所に集約し、eval が配布元実レイアウトとの一致を検査する | FR-1.10、FR-2.5、R-1 |
| BR-7 | 外部依存（npm パッケージ）を追加しない。node:/Bun 標準 API のみ | NFR-2 |
| BR-8 | eval は一時ディレクトリで実インストールを駆動し、成功・失敗どちらでも片付ける | FR-2.1、FR-2.8、DR-3 |
| BR-9 | TDD で進める: eval の失敗（RED）を確認してから実装する | NFR-1、DR-1 |
| BR-10 | 非対象資産の不変: amadeus* 以外の skills ファイルはバイト単位で不変（FR-2.11）。settings.json の非対象キー（env/permissions 等）は値として不変 = deep-equal（再シリアライズでバイト表現は変わり得る。FR-2.7 の検証方法） | FR-1.3、FR-2.11、FR-2.7 |
| BR-13 | エンジン 7 dir・skills・AMADEUS.md の全置換コピーは配布元を唯一の起点とし、対象側の同名資産を置換する | FR-1.2、FR-1.3、FR-1.4 |
| BR-14 | スモークは配置完了後に自動実行し、--project-dir 明示 + cwd=target で対象 workspace を検査する（実行元の誤検査 = 偽陽性を排除） | FR-1.7、business-logic-model（O-2 確定） |
| BR-15 | README の導入手順（コマンド、内容一覧、検証手順、更新規約）を成果物に含める | FR-3.1 |
| BR-11 | スモーク fail は exit 1（配置完了とスモーク失敗を区別して表示） | business-logic-model（O-2 確定） |
| BR-12 | PR 作成前に validator と npm run test:all を実行し記録する | NFR-4 |

## 検証の分担

- BR-1〜BR-6、BR-10、BR-11 は専用 eval（FR-2 系）が検証する。
- BR-7 は eval の cold cache + オフライン相当駆動（FR-2.2）と import 走査で担保する。
- BR-8、BR-9 は eval 実装自体の構造と作業手順（RED 記録）で担保する。
- BR-12 は build-and-test ステージと PR 説明で担保する。
- BR-13 は専用 eval の配置結果検査（FR-2.1〜2.2、FR-2.5）で担保する。
- BR-14 は専用 eval の偽陽性回帰検証（FR-2.12）で担保する。
- BR-15 は PR レビュー（README の diff 確認）と build-and-test の記録で担保する。
