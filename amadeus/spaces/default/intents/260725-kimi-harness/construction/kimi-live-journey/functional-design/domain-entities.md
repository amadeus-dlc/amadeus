上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Domain Entities — kimi-live-journey

requirements.md の FR-9 と components.md C6 をエンティティとして定義する。

## Entity: PrintDrive

- `runPrintSession(args): Promise<PrintResult>` — `kimi -p` の spawn + 回収
- `skipReason(): string | null` — ゲート判定
- 既存 driver(sdk-drive/tui-drive/kiro-acp-drive)と同じモジュール形状

## Entity: PrintResult

- `{ stdout: string; stderr: string; exitCode: number; durationMs: number }`
- journey の断言は stdout の内容と exit code に対して行う

## Entity: Journey

- tmp プロジェクトへの dist/kimi 配置 + `KIMI_CODE_HOME` の tmp 指向 + driver 呼出 + 断言の4段(component-methods.md の C6 契約どおり env で注入)
- `AMADEUS_KIMI_PRINT_LIVE=1` ゲートと「SPENDS Kimi credits」明記を持つ

## 適用範囲

- U6 の完了定義(unit-of-work.md)と unit-of-work-story-map.md の FR-9 行に対応
- driver の契約(skipReason/runPrintSession)は component-methods.md の C6 インターフェースに従う
- services.md の判定(同期プリミティブ)により、エンティティ間の共有状態は導入しない

## 関係

- dist/kimi(B1/B5 の成果物) --配置--> Journey --runPrintSession--> kimi バイナリ --断言--> PrintResult
