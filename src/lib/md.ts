/** Markdown 檔案提取出的單一區段 */
export interface MdSection {
  /** 區段文字內容 */
  text: string;
  /** 區段序號（1-based，模擬「頁碼」以統一介面） */
  pageNumber: number;
}

/**
 * 從 Markdown 檔案提取文字，依 `##` 標題分割成區段。
 *
 * @param buffer - Markdown 檔案的原始二進位內容（UTF-8）
 * @returns 分割後的 {@link MdSection} 陣列；空檔回傳 `[]`
 */
export async function extractMdText(buffer: Buffer): Promise<MdSection[]> {
  const content = buffer.toString("utf-8");
  const trimmed = content.trim();

  if (!trimmed) {
    return [];
  }

  // 依 ## 或 ### 等標題分割成區段
  const sections = trimmed.split(/(?=^#{1,6}\s)/m).filter((s) => s.trim());

  if (sections.length === 0) {
    return [{ text: trimmed, pageNumber: 1 }];
  }

  return sections.map((section, i) => ({
    text: section.trim(),
    pageNumber: i + 1,
  }));
}
