# Services — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜5)、codekb の architecture.md・component-inventory.md(re-scan 鮮度確認済み)、`../practices-discovery/team-practices.md`(live 温存)。

## サービス境界

新規サービスなし — plugin は opencode プロセス内のイベントハンドラで、core hooks(既存 CLI)を subprocess として呼ぶだけ(統合境界 = spawn、エラーは stderr 記録+advisory)。ネットワーク・永続化・デーモンの追加なし(SC-3 類推、単発イベント処理)。

## 統合境界のエラー処理

spawn 失敗・hook 非0 exit はいずれも advisory(記録して継続 — cursor runAdapter :246 同型「成功は常に exitCode 0」)。サイレント失敗は禁止(stderr 必須)。
