import { ArrowUpDown, Globe, RefreshCw, Settings } from "lucide-preact";

interface HeaderProps {
  onOpenSettings: () => void;
  onReset: () => void;
  onOpenWorlds: () => void;
  onOpenExportImport: () => void;
  possibleWorldsCount: number;
}

export function Header({
  onOpenSettings,
  onReset,
  onOpenWorlds,
  onOpenExportImport,
  possibleWorldsCount,
}: HeaderProps) {
  return (
    <header className="header">
      <h1 className="logo-title">GNOSIA SOLVER</h1>

      <div className="header-actions">
        <button
          type="button"
          className="btn"
          onClick={onOpenWorlds}
          title="成立する配役パターン一覧を表示"
        >
          <Globe size={16} />
          <span>
            可能世界: <strong>{possibleWorldsCount}</strong> 通り
          </span>
        </button>

        <button
          type="button"
          className="btn"
          onClick={onOpenExportImport}
          title="現在の入力状況をファイルやテキストで保存・復元"
        >
          <ArrowUpDown size={16} />
          <span>保存 / 読込</span>
        </button>

        <button
          type="button"
          className="btn"
          onClick={onOpenSettings}
          title="参加者や役職設定を変更"
        >
          <Settings size={16} />
          <span>ゲーム設定</span>
        </button>

        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={onReset}
          title="現在のゲーム履歴をリセット"
        >
          <RefreshCw size={14} />
          <span>リセット</span>
        </button>
      </div>
    </header>
  );
}
