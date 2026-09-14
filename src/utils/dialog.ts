export function handleDialogBackdropClick(e: MouseEvent): void {
  const dialog = e.currentTarget;
  if (!(dialog instanceof HTMLDialogElement)) return;
  // ダイアログ内の要素をクリックした場合は backdrop クリックではないため無視する
  if (e.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  const isInDialog = rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX &&
    e.clientX <= rect.left + rect.width;
  if (!isInDialog) {
    dialog.close();
  }
}
