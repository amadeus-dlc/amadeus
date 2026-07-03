# Construction Decisions

## 判断一覧

| ID | 判断 | 根拠 | 影響 |
|---|---|---|---|
| CD001 | エンジンはバイト無改変でコピーし、適応は settings マージ、bridge 規範、skill 改名だけに限定した | 設計判断 1、2（追従コストとパリティ最小化） | 上流更新は parity-baseline 再生成と再コピーで追従できる |
| CD002 | エンジンの強依存 4 ディレクトリ（scopes、agents、knowledge、rules/aidlc.md）を追加コピーした | B001 の sandbox 統合テストで scope 定義の強依存を検出。計画の条件付き追加の発動 | backlog #1（コピー範囲）はこの結果で確定 |
| CD003 | 3.5 成果物の配置は `construction/<bolt-id>/code-generation/` とし、B001 と B002 の bolts/ 配下への誤配置を B003 で是正した | 旧契約の validator が per-unit 配置を要求 | record validator pass |
| CD004 | エンジンが書く audit shard を `.gitattributes` で whitespace 検査対象外にした | エンジン出力（空値の末尾空白）は無改変契約の対象 | shard の空白品質検査は放棄（上流仕様に従属） |
| CD005 | 旧 stage skill 22 個と amadeus-steering の削除は examples 再生成後へ後送した | examples/skill-provenance.json が旧 skill 19 ファイルを参照しており、削除は test:examples を壊す | 新旧 skill が一時併存する（削除は examples 再生成とセットで実施） |
| CD006 | examples の real provider 再生成は halt-and-ask で人間判断待ちにした | 個人 Codex アカウントのコスト消費と、生成ハーネスの新アーキテクチャ適応が必要（external-dependency-map の確認事項） | R010 の再生成 AC が未充足のまま Intent の構築を終える。判断後に後続作業で実施する |
| CD007 | Intent の完走（build-and-test 以降）はエンジン駆動（dogfooding）で行い、workflow 完了もエンジンが記録した | R011 の実証。autonomous モードで presence 免除と park 拒否のガードも確認 | 状態遷移の記録者が途中から二重（手動 audit.md + エンジン shard）になっている。移行期の記録として保存する |
| CD008 | registry の status はエンジンの語彙（complete）をそのまま使う | エンジンが正準の書き手になった | 旧 entry（completed）との表記揺れは互換維持対象の記録として残る |
| CD009 | エンジン一式を host 中立の `.agents/aidlc/` へ移設し、`.claude/` 側は symlink にした。SKILL.md と references から `.claude/` 参照を全排除した | 人間レビュー指示（PR #427。Codex 環境では `.claude/` が使えない）。エンジンは import.meta 相対の兄弟解決のためセット移動で無改変のまま動く | 配置写像は parity-map.json の relocations 7 entry で宣言。Claude 側は symlink 経由で hooks も従来どおり動作 |
