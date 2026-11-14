import { ArrowUpDown, Globe, RefreshCw, Settings } from "lucide-preact";
import { GitHubIcon } from "./icons/GitHubIcon.tsx";
import { formatWithSpaces } from "../utils/format.ts";

type HeaderProps = {
  readonly onOpenSettings: () => void;
  readonly onReset: () => void;
  readonly onOpenWorlds: () => void;
  readonly onOpenExportImport: () => void;
  readonly possibleWorldsCount: number;
};

export function Header({
  onOpenSettings,
  onReset,
  onOpenWorlds,
  onOpenExportImport,
  possibleWorldsCount,
}: HeaderProps) {
  const commitHash: string | undefined = import.meta.env.VITE_COMMIT_HASH;
  const commitUrl = commitHash
    ? `https://github.com/narumincho/gnosia-solver/tree/${commitHash}`
    : "https://github.com/narumincho/gnosia-solver";

  return (
    <header className="header">
      <div className="logo-container">
        <img
          src="/favicon.svg"
          alt="GNOSIA SOLVER Logo"
          className="logo-icon"
          width="32"
          height="32"
        />
        <h1 className="logo-title">GNOSIA SOLVER</h1>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="btn btn-worlds"
          command="show-modal"
          commandfor="world-list-dialog"
          onClick={onOpenWorlds}
          title="成立する配役パターン一覧を表示"
        >
          <Globe size={16} />
          <span>
            <span className="btn-label">可能世界:</span>{" "}
            <strong>{formatWithSpaces(possibleWorldsCount)}</strong> 通り
          </span>
        </button>

        <button
          type="button"
          className="btn"
          command="show-modal"
          commandfor="export-import-dialog"
          onClick={onOpenExportImport}
          title="現在の入力状況をファイルやテキストで保存・復元"
          aria-label="保存 / 読込"
        >
          <ArrowUpDown size={16} />
          <span className="btn-label">保存 / 読込</span>
        </button>

        <button
          type="button"
          className="btn"
          command="show-modal"
          commandfor="game-setup-dialog"
          onClick={onOpenSettings}
          title="参加者や役職設定を変更"
          aria-label="ゲーム設定"
        >
          <Settings size={16} />
          <span className="btn-label">ゲーム設定</span>
        </button>

        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={onReset}
          title="現在のゲーム履歴をリセット"
          aria-label="リセット"
        >
          <RefreshCw size={14} />
          <span className="btn-label">リセット</span>
        </button>

        <a
          href={commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-icon"
          title="GitHub"
          aria-label="GitHub リポジトリを開く"
        >
          <GitHubIcon size={16} />
        </a>
      </div>
    </header>
  );
}
