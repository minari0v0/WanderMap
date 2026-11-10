"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Table,
  Image as ImageIcon,
  Heading2,
  CheckSquare,
  Quote,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Edit3,
  Check,
  X,
  Loader2,
  Plus,
} from "lucide-react"
import type { EnrichedPlace } from "@/components/trip-detail/itinerary-timeline"
import type { UpdatePlaceDiaryPayload } from "@/lib/trip-service"
import { uploadImageToCloudinary } from "@/lib/cloudinary"
import { TimePicker } from "@/components/ui/time-picker"
import { showToast } from "@/components/ui/system-alert"

export interface PlaceDiaryPanelProps {
  place: EnrichedPlace | null
  dayNumber: number
  readOnly?: boolean
  onBackToList: () => void
  onVote?: (id: string, dir: "up" | "down") => void
  onSaveDiary?: (placeId: string, payload: UpdatePlaceDiaryPayload) => Promise<void>
}

type LineBlockType =
  | "paragraph"
  | "quote"
  | "toggle"
  | "h1"
  | "h2"
  | "h3"
  | "todo"
  | "bullet"

interface LiveLineBlock {
  id: string
  type: LineBlockType
  text: string
  checked?: boolean
  toggleOpen?: boolean
  toggleBody?: string
}

interface ParsedBlock {
  type:
    | "table"
    | "heading"
    | "quote"
    | "toggle"
    | "list"
    | "checklist"
    | "image"
    | "paragraph"
  lines: string[]
  headingLevel?: 1 | 2 | 3
  imageAlt?: string
  imageUrl?: string
}

function makeBlockId(): string {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 한 줄의 마크다운 원문을 LiveLineBlock 상태로 변환합니다.
 */
function parseRawLineToLiveBlock(rawLine: string): LiveLineBlock {
  const trimmedStart = rawLine.replace(/^\s+/, "")

  if (/^###\s+/.test(trimmedStart)) {
    return {
      id: makeBlockId(),
      type: "h3",
      text: trimmedStart.replace(/^###\s+/, ""),
    }
  }
  if (/^##\s+/.test(trimmedStart)) {
    return {
      id: makeBlockId(),
      type: "h2",
      text: trimmedStart.replace(/^##\s+/, ""),
    }
  }
  if (/^#\s+/.test(trimmedStart)) {
    return {
      id: makeBlockId(),
      type: "h1",
      text: trimmedStart.replace(/^#\s+/, ""),
    }
  }
  if (/^(?:>>|▶)\s+/.test(trimmedStart)) {
    return {
      id: makeBlockId(),
      type: "toggle",
      text: trimmedStart.replace(/^(?:>>|▶)\s+/, ""),
      toggleOpen: true,
    }
  }
  if (/^>\s+/.test(trimmedStart)) {
    return {
      id: makeBlockId(),
      type: "quote",
      text: trimmedStart.replace(/^>\s+/, ""),
    }
  }
  if (/^(?:-\s*)?\[([ xX])\]\s+/.test(trimmedStart)) {
    const match = trimmedStart.match(/^(?:-\s*)?\[([ xX])\]\s+(.*)$/)
    const isChecked = match ? match[1].toLowerCase() === "x" : false
    const content = match ? match[2] : trimmedStart
    return {
      id: makeBlockId(),
      type: "todo",
      text: content,
      checked: isChecked,
    }
  }
  if (/^[-*•]\s+/.test(trimmedStart)) {
    return {
      id: makeBlockId(),
      type: "bullet",
      text: trimmedStart.replace(/^[-*•]\s+/, ""),
    }
  }

  return {
    id: makeBlockId(),
    type: "paragraph",
    text: rawLine,
  }
}

/**
 * 전체 마크다운 문자열을 LiveLineBlock 배열로 변환합니다.
 */
function markdownToLiveBlocks(md: string): LiveLineBlock[] {
  if (!md || !md.trim()) {
    return [{ id: makeBlockId(), type: "paragraph", text: "" }]
  }
  const rawLines = md.split(/\r?\n/)
  const result = rawLines.map((line) => parseRawLineToLiveBlock(line))
  return result.length > 0
    ? result
    : [{ id: makeBlockId(), type: "paragraph", text: "" }]
}

/**
 * LiveLineBlock 배열을 저장용 마크다운 문자열로 직렬화합니다.
 */
function liveBlocksToMarkdown(blocks: LiveLineBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "h1":
          return `# ${b.text}`
        case "h2":
          return `## ${b.text}`
        case "h3":
          return `### ${b.text}`
        case "quote":
          return `> ${b.text}`
        case "toggle":
          return `▶ ${b.text}`
        case "todo":
          return `- [${b.checked ? "x" : " "}] ${b.text}`
        case "bullet":
          return `- ${b.text}`
        case "paragraph":
        default:
          return b.text
      }
    })
    .join("\n")
}

/**
 * 일반 텍스트 줄(paragraph)에서 사용자가 마크다운 단축키(`> `, `>> `, `# `, `## `, `[] `, `- `)를
 * 입력하고 스페이스바를 누르는 순간 실시간 블록 스타일로 변환합니다.
 */
function detectLiveMarkdownShortcut(inputVal: string): {
  matched: boolean
  type?: LineBlockType
  restText?: string
  checked?: boolean
} {
  // 1. 토글 블록: `>> ` 또는 `▶ `
  if (/^(?:>>|▶)\s/.test(inputVal)) {
    return {
      matched: true,
      type: "toggle",
      restText: inputVal.replace(/^(?:>>|▶)\s/, ""),
    }
  }
  // 2. 인용구 블록: `> `
  if (/^>\s/.test(inputVal)) {
    return {
      matched: true,
      type: "quote",
      restText: inputVal.replace(/^>\s/, ""),
    }
  }
  // 3. 제목 1~3: `### `, `## `, `# `
  if (/^###\s/.test(inputVal)) {
    return {
      matched: true,
      type: "h3",
      restText: inputVal.replace(/^###\s/, ""),
    }
  }
  if (/^##\s/.test(inputVal)) {
    return {
      matched: true,
      type: "h2",
      restText: inputVal.replace(/^##\s/, ""),
    }
  }
  if (/^#\s/.test(inputVal)) {
    return {
      matched: true,
      type: "h1",
      restText: inputVal.replace(/^#\s/, ""),
    }
  }
  // 4. 체크리스트: `[] `, `[ ] `, `- [ ] `, `[x] `
  const todoMatch = inputVal.match(/^(?:-\s*)?\[([ xX]?)\]\s(.*)$/)
  if (todoMatch) {
    return {
      matched: true,
      type: "todo",
      checked: todoMatch[1].toLowerCase() === "x",
      restText: todoMatch[2] || "",
    }
  }
  // 5. 글머리 기호: `- ` 또는 `* `
  if (/^[-*]\s/.test(inputVal)) {
    return {
      matched: true,
      type: "bullet",
      restText: inputVal.replace(/^[-*]\s/, ""),
    }
  }

  return { matched: false }
}

/**
 * 레거시 photos 배열이나 review가 별도 컬럼에만 저장되어 있던 데이터를
 * 하나의 마크다운 본문(memo)으로 자연스럽게 합쳐줍니다.
 */
function buildInitialMarkdownContent(place: EnrichedPlace): string {
  let base = (place.memo || "").trim()

  if (place.review && place.review.trim() && !base.includes(place.review.trim())) {
    base = base ? `> ${place.review.trim()}\n\n${base}` : `> ${place.review.trim()}`
  }

  if (place.photos && place.photos.length > 0) {
    for (const url of place.photos) {
      if (url && !base.includes(url)) {
        base = base ? `${base}\n\n![사진](${url})` : `![사진](${url})`
      }
    }
  }

  return base
}

/**
 * 마크다운 본문에서 ![...](url) 형태의 이미지 URL들을 추출해 photos 컬럼과도 동기화합니다.
 */
function extractMarkdownImageUrls(markdown: string): string[] {
  const urls: string[] = []
  const regex = /!\[[^\]]*\]\(([^)\s]+)\)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(markdown)) !== null) {
    if (match[1]) urls.push(match[1])
  }
  return urls
}

/**
 * 마크다운 텍스트를 위에서 아래로 작성한 순서 그대로 블록 단위로 파싱합니다.
 */
function parseMarkdownBlocks(raw: string): ParsedBlock[] {
  if (!raw || !raw.trim()) return []
  const lines = raw.split(/\r?\n/)
  const blocks: ParsedBlock[] = []
  let i = 0

  while (i < lines.length) {
    const rawLine = lines[i]
    const line = rawLine.trim()
    if (!line) {
      i++
      continue
    }

    // 1. 마크다운 이미지 ![alt](url) 단독 라인 감지
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/)
    if (imgMatch) {
      blocks.push({
        type: "image",
        lines: [line],
        imageAlt: imgMatch[1] || "첨부 사진",
        imageUrl: imgMatch[2],
      })
      i++
      continue
    }

    // 2. 마크다운 표(| ... |) 감지
    if (line.startsWith("|") && line.endsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim())
        i++
      }
      blocks.push({ type: "table", lines: tableLines })
      continue
    }

    // 3. 제목(#, ##, ###) 감지
    if (/^#{1,3}\s+/.test(line)) {
      const level = line.startsWith("### ") ? 3 : line.startsWith("## ") ? 2 : 1
      blocks.push({ type: "heading", headingLevel: level, lines: [line] })
      i++
      continue
    }

    // 4. 토글(▶ 또는 >>) 감지
    if (/^(?:▶|>>)\s+/.test(line)) {
      blocks.push({
        type: "toggle",
        lines: [line.replace(/^(?:▶|>>)\s+/, "")],
      })
      i++
      continue
    }

    // 5. 인용구(> ) 감지
    if (/^>\s+/.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s+/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s+/, ""))
        i++
      }
      blocks.push({ type: "quote", lines: quoteLines })
      continue
    }

    // 6. 체크리스트(- [ ] 또는 - [x]) 감지
    if (/^(?:-\s*)?\[[ xX]\]\s+/.test(line)) {
      const checkLines: string[] = []
      while (i < lines.length && /^(?:-\s*)?\[[ xX]\]\s+/.test(lines[i].trim())) {
        checkLines.push(lines[i].trim())
        i++
      }
      blocks.push({ type: "checklist", lines: checkLines })
      continue
    }

    // 7. 일반 글머리 기호(- 또는 • 또는 *) 감지
    if (/^[-•*]\s+/.test(line)) {
      const listLines: string[] = []
      while (i < lines.length && /^[-•*]\s+/.test(lines[i].trim())) {
        listLines.push(lines[i].trim())
        i++
      }
      blocks.push({ type: "list", lines: listLines })
      continue
    }

    // 8. 문단 내부에 ![alt](url)이 섞여 있는 경우 분리 처리
    const inlineImgRegex = /!\[([^\]]*)\]\(([^)\s]+)\)/g
    if (inlineImgRegex.test(line)) {
      let lastIndex = 0
      inlineImgRegex.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = inlineImgRegex.exec(line)) !== null) {
        const beforeText = line.slice(lastIndex, m.index).trim()
        if (beforeText) {
          blocks.push({ type: "paragraph", lines: [beforeText] })
        }
        blocks.push({
          type: "image",
          lines: [m[0]],
          imageAlt: m[1] || "첨부 사진",
          imageUrl: m[2],
        })
        lastIndex = m.index + m[0].length
      }
      const afterText = line.slice(lastIndex).trim()
      if (afterText) {
        blocks.push({ type: "paragraph", lines: [afterText] })
      }
      i++
      continue
    }

    // 9. 일반 문단
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("|") &&
      !/^#{1,3}\s+/.test(lines[i].trim()) &&
      !/^(?:▶|>>)\s+/.test(lines[i].trim()) &&
      !/^>\s+/.test(lines[i].trim()) &&
      !/^(?:-\s*)?\[[ xX]\]\s+/.test(lines[i].trim()) &&
      !/^[-•*]\s+/.test(lines[i].trim()) &&
      !/!\[([^\]]*)\]\(([^)\s]+)\)/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paraLines })
    }
  }

  return blocks
}

function FormattedMarkdownView({
  content,
  onClickImage,
}: {
  content: string
  onClickImage?: (url: string) => void
}) {
  const [openToggles, setOpenToggles] = useState<Record<number, boolean>>({})
  const blocks = parseMarkdownBlocks(content)
  if (blocks.length === 0) return null

  return (
    <div className="space-y-3 text-[15px] text-[#27272A] leading-relaxed">
      {blocks.map((block, bIdx) => {
        if (block.type === "image" && block.imageUrl) {
          return (
            <figure key={bIdx} className="my-2.5">
              <img
                src={block.imageUrl}
                alt={block.imageAlt || "첨부 사진"}
                onClick={(e) => {
                  e.stopPropagation()
                  onClickImage?.(block.imageUrl!)
                }}
                className="w-full max-h-[280px] rounded-2xl object-cover border border-[#E2E2DA] cursor-pointer hover:opacity-95 transition shadow-2xs"
              />
            </figure>
          )
        }

        if (block.type === "table") {
          const rows = block.lines
            .filter((l) => !/^\|[\s\-:|]+\|$/.test(l))
            .map((l) =>
              l
                .slice(1, -1)
                .split("|")
                .map((cell) => cell.trim())
            )
          if (rows.length === 0) return null
          const header = rows[0]
          const body = rows.slice(1)

          return (
            <div
              key={bIdx}
              className="overflow-x-auto rounded-xl border border-[#E2E2DA] bg-white shadow-2xs my-2"
            >
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E2E2DA] bg-[#F7F7F2]">
                    {header.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        className="px-3 py-2 font-extrabold text-[#18181B] border-r last:border-r-0 border-[#E2E2DA]"
                      >
                        {col || " "}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="border-b last:border-b-0 border-[#E2E2DA]/80 hover:bg-[#FBFBF9]"
                    >
                      {header.map((_, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3 py-2 font-medium text-[#27272A] border-r last:border-r-0 border-[#E2E2DA]/80"
                        >
                          {row[cIdx] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (block.type === "heading") {
          const text = block.lines[0].replace(/^#{1,3}\s+/, "")
          if (block.headingLevel === 1) {
            return (
              <h3 key={bIdx} className="text-lg font-black text-[#18181B] pt-1">
                {text}
              </h3>
            )
          }
          if (block.headingLevel === 3) {
            return (
              <h5 key={bIdx} className="text-[15px] font-extrabold text-[#18181B] pt-0.5">
                {text}
              </h5>
            )
          }
          return (
            <h4 key={bIdx} className="text-base font-extrabold text-[#18181B] pt-1">
              {text}
            </h4>
          )
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={bIdx}
              className="border-l-4 border-[#1A9E7A] bg-[#F7F7F2] pl-3.5 pr-3 py-2 rounded-r-xl text-sm sm:text-[15px] font-bold text-[#18181B] space-y-1"
            >
              {block.lines.map((qLine, qIdx) => (
                <p key={qIdx}>{qLine}</p>
              ))}
            </blockquote>
          )
        }

        if (block.type === "toggle") {
          const isOpen = openToggles[bIdx] ?? true
          return (
            <div
              key={bIdx}
              onClick={(e) => {
                e.stopPropagation()
                setOpenToggles((prev) => ({ ...prev, [bIdx]: !isOpen }))
              }}
              className="rounded-xl border border-[#E2E2DA] bg-[#FBFBF9] px-3 py-2 cursor-pointer"
            >
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#18181B]">
                {isOpen ? (
                  <ChevronDown className="size-4 text-[#1A9E7A] shrink-0" />
                ) : (
                  <ChevronRight className="size-4 text-[#1A9E7A] shrink-0" />
                )}
                <span>{block.lines[0]}</span>
              </div>
            </div>
          )
        }

        if (block.type === "checklist") {
          return (
            <ul key={bIdx} className="space-y-1.5">
              {block.lines.map((item, lIdx) => {
                const checked = /^(?:-\s*)?\[[xX]\]/.test(item)
                const label = item.replace(/^(?:-\s*)?\[[ xX]\]\s+/, "")
                return (
                  <li key={lIdx} className="flex items-center gap-2.5 text-sm font-medium">
                    <span
                      className={`flex size-4.5 items-center justify-center rounded-md border text-[11px] font-bold ${
                        checked
                          ? "border-[#1A9E7A] bg-[#1A9E7A] text-white"
                          : "border-[#D4D4CD] bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className={checked ? "line-through text-[#8A8A93]" : "text-[#18181B]"}>
                      {label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )
        }

        if (block.type === "list") {
          return (
            <ul key={bIdx} className="list-disc pl-5 space-y-1 text-sm font-medium text-[#27272A]">
              {block.lines.map((item, lIdx) => (
                <li key={lIdx}>{item.replace(/^[-•*]\s+/, "")}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={bIdx} className="whitespace-pre-wrap text-[15px] font-medium text-[#27272A]">
            {block.lines.join("\n")}
          </p>
        )
      })}
    </div>
  )
}

/**
 * 툴바에서 [표] 아이콘을 눌렀을 때만 조용히 열리는 실시간 그리드 표 작성기
 */
function InlineTableGridComposer({
  onInsert,
  onCancel,
}: {
  onInsert: (mdTableLines: string[]) => void
  onCancel: () => void
}) {
  const [grid, setGrid] = useState<string[][]>([
    ["항목", "내용 / 시간", "비고"],
    ["", "", ""],
    ["", "", ""],
  ])

  const colCount = grid[0]?.length || 3

  function updateCell(rIdx: number, cIdx: number, val: string) {
    setGrid((prev) =>
      prev.map((row, ri) =>
        ri === rIdx ? row.map((cell, ci) => (ci === cIdx ? val : cell)) : row
      )
    )
  }

  function addRow() {
    setGrid((prev) => [...prev, Array(colCount).fill("")])
  }

  function removeRow(rIdx: number) {
    if (grid.length <= 1) return
    setGrid((prev) => prev.filter((_, ri) => ri !== rIdx))
  }

  function addColumn() {
    setGrid((prev) => prev.map((row) => [...row, ""]))
  }

  function handleConfirmInsert() {
    const mdLines: string[] = []
    grid.forEach((row, rIdx) => {
      const line = `| ${row.map((c) => (c || "").replace(/\|/g, "/").trim() || " ").join(" | ")} |`
      mdLines.push(line)
      if (rIdx === 0) {
        mdLines.push(`| ${row.map(() => "---").join(" | ")} |`)
      }
    })
    onInsert(mdLines)
  }

  return (
    <div className="rounded-2xl border border-[#D4D4CD] bg-[#FBFBF9] p-3 space-y-2 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-[#18181B]">
          표 작성 (칸을 클릭해 입력 후 삽입)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#6B6B72] hover:bg-slate-200/60 cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirmInsert}
            className="px-3 py-1 rounded-lg bg-[#1A9E7A] hover:bg-[#158063] text-white text-xs font-extrabold cursor-pointer"
          >
            본문에 삽입
          </button>
        </div>
      </div>

      {/* 본체 그리드 + 우측 열 추가(+) 바 */}
      <div className="flex items-stretch gap-1">
        <div className="flex-1 overflow-x-auto rounded-xl border border-[#E2E2DA] bg-white">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {grid.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={`group/row border-b last:border-b-0 border-[#E2E2DA] ${
                    rIdx === 0 ? "bg-[#F7F7F2]" : "bg-white"
                  }`}
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="border-r last:border-r-0 border-[#E2E2DA] p-0 focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#1A9E7A]"
                    >
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && rIdx === grid.length - 1) {
                            e.preventDefault()
                            addRow()
                          }
                        }}
                        placeholder={rIdx === 0 ? "열 제목" : ""}
                        className={`w-full bg-transparent px-2.5 py-2 outline-none ${
                          rIdx === 0
                            ? "font-extrabold text-[#18181B]"
                            : "font-medium text-[#27272A]"
                        }`}
                      />
                    </td>
                  ))}
                  {grid.length > 1 && (
                    <td className="w-6 text-center bg-[#FBFBF9] border-l border-[#E2E2DA]">
                      <button
                        type="button"
                        onClick={() => removeRow(rIdx)}
                        className="text-[#8A8A93] hover:text-rose-500 p-0.5 cursor-pointer"
                        title="행 삭제"
                      >
                        <X className="size-3 mx-auto" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 우측 열 추가(+) 바 */}
        <button
          type="button"
          onClick={addColumn}
          className="w-6 rounded-xl border border-[#E2E2DA] bg-white hover:bg-[#EDFAF4] hover:border-[#1A9E7A]/50 text-[#6B6B72] hover:text-[#1A9E7A] flex items-center justify-center transition cursor-pointer"
          title="새로운 열 추가"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* 하단 행 추가(+) 가로 바 + 호버 툴팁 */}
      <div className="relative group/addrow">
        <button
          type="button"
          onClick={addRow}
          className="w-full h-6 rounded-xl border border-[#E2E2DA] bg-white hover:bg-[#EDFAF4] hover:border-[#1A9E7A]/50 text-[#6B6B72] hover:text-[#1A9E7A] flex items-center justify-center transition cursor-pointer"
        >
          <Plus className="size-3.5" />
        </button>
        <div className="pointer-events-none invisible opacity-0 group-hover/addrow:visible group-hover/addrow:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
          새로운 행을 추가하려면 <span className="text-[#34D399]">클릭하세요</span>
        </div>
      </div>
    </div>
  )
}

export function PlaceDiaryPanel({
  place,
  dayNumber,
  readOnly = false,
  onBackToList,
  onVote,
  onSaveDiary,
}: PlaceDiaryPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftTime, setDraftTime] = useState("14:00")
  const [liveBlocks, setLiveBlocks] = useState<LiveLineBlock[]>(() => [
    { id: makeBlockId(), type: "paragraph", text: "" },
  ])
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
  const [showTableComposer, setShowTableComposer] = useState(false)

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null)

  const lineInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setIsEditing(false)
    setShowTableComposer(false)
    if (place) {
      setDraftTime(place.time || "14:00")
      const initialMd = buildInitialMarkdownContent(place)
      setLiveBlocks(markdownToLiveBlocks(initialMd))
    }
  }, [place?.id, place?.memo, place?.review, place?.photos])

  if (!place) return null

  const combinedViewContent = buildInitialMarkdownContent(place)
  const hasContent = Boolean(combinedViewContent.trim())

  function focusLineAt(idx: number, cursorPos: "start" | "end" | number = "end") {
    setTimeout(() => {
      const el = lineInputRefs.current[idx]
      if (!el) return
      el.focus()
      const pos =
        cursorPos === "start"
          ? 0
          : cursorPos === "end"
            ? el.value.length
            : Math.min(cursorPos, el.value.length)
      try {
        el.setSelectionRange(pos, pos)
      } catch {}
    }, 15)
  }

  /**
   * 각 줄 입력 변경 시:
   * `> `, `>> `, `# `, `## `, `### `, `[] `, `- ` 등 마크다운 프리픽스 + 스페이스 감지 시
   * 즉시 해당 줄을 인용구/토글/제목/체크리스트 블록으로 실시간 렌더링 전환!
   */
  function handleLineChange(idx: number, rawVal: string) {
    setLiveBlocks((prev) => {
      const current = prev[idx]
      if (!current) return prev

      if (current.type === "paragraph") {
        const shortcut = detectLiveMarkdownShortcut(rawVal)
        if (shortcut.matched && shortcut.type) {
          const updated = [...prev]
          updated[idx] = {
            ...current,
            type: shortcut.type,
            text: shortcut.restText ?? "",
            checked: shortcut.checked ?? false,
            toggleOpen: true,
          }
          focusLineAt(idx, 0)
          return updated
        }
      }

      const updated = [...prev]
      updated[idx] = { ...current, text: rawVal }
      return updated
    })
  }

  /**
   * 키보드 이벤트 처리:
   * 1) Backspace (커서가 맨 앞 index 0일 때):
   *    - 현재 줄이 인용구(quote), 토글(toggle), 제목(h1~h3), 체크리스트(todo), 글머리(bullet) 등
   *      프리뷰 블록 상태라면 즉시 일반 텍스트(paragraph)로 되돌림!
   *    - 이미 일반 텍스트(paragraph)라면 이전 줄과 자연스럽게 병합!
   * 2) Enter:
   *    - 커서 위치 기준으로 아랫줄 블록 생성 (체크리스트/불릿 작성 중에는 다음 줄도 동일 스타일 유지, 빈 줄에서 Enter 치면 일반 문단으로 복귀)
   * 3) ArrowUp / ArrowDown:
   *    - 위아래 줄로 부드럽게 포커스 이동
   */
  function handleLineKeyDown(
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    const el = e.currentTarget
    const selStart = el.selectionStart ?? 0
    const selEnd = el.selectionEnd ?? 0
    const block = liveBlocks[idx]
    if (!block) return

    if (e.key === "Backspace" && selStart === 0 && selEnd === 0) {
      // 1. 프리뷰 렌더링 중인 블록(인용구, 토글, 제목, 체크리스트, 리스트)이면 먼저 일반 문단으로 해제!
      if (block.type !== "paragraph") {
        e.preventDefault()
        setLiveBlocks((prev) =>
          prev.map((item, i) =>
            i === idx
              ? {
                  ...item,
                  type: "paragraph",
                  checked: false,
                }
              : item
          )
        )
        focusLineAt(idx, 0)
        return
      }

      // 2. 일반 문단이고 첫 번째 줄이 아니면 윗줄과 병합
      if (idx > 0) {
        e.preventDefault()
        const prevLine = liveBlocks[idx - 1]
        const prevLen = prevLine.text.length
        setLiveBlocks((prev) => {
          const next = [...prev]
          next[idx - 1] = {
            ...next[idx - 1],
            text: `${next[idx - 1].text}${block.text}`,
          }
          next.splice(idx, 1)
          return next
        })
        setFocusedIndex(idx - 1)
        focusLineAt(idx - 1, prevLen)
      }
      return
    }

    if (e.key === "Enter") {
      e.preventDefault()
      // 체크리스트나 불릿이나 인용구에서 내용 없이 빈 줄에서 Enter를 누르면 일반 문단으로 전환
      if (block.type !== "paragraph" && block.text.trim() === "") {
        setLiveBlocks((prev) =>
          prev.map((item, i) => (i === idx ? { ...item, type: "paragraph" } : item))
        )
        focusLineAt(idx, 0)
        return
      }

      const beforeCursor = block.text.slice(0, selStart)
      const afterCursor = block.text.slice(selEnd)
      const nextBlockType: LineBlockType =
        block.type === "todo" || block.type === "bullet" ? block.type : "paragraph"

      const newBlock: LiveLineBlock = {
        id: makeBlockId(),
        type: nextBlockType,
        text: afterCursor,
        checked: false,
        toggleOpen: true,
      }

      setLiveBlocks((prev) => {
        const next = [...prev]
        next[idx] = { ...next[idx], text: beforeCursor }
        next.splice(idx + 1, 0, newBlock)
        return next
      })
      setFocusedIndex(idx + 1)
      focusLineAt(idx + 1, 0)
      return
    }

    if (e.key === "ArrowUp" && idx > 0) {
      e.preventDefault()
      setFocusedIndex(idx - 1)
      focusLineAt(idx - 1, selStart)
      return
    }

    if (e.key === "ArrowDown" && idx < liveBlocks.length - 1) {
      e.preventDefault()
      setFocusedIndex(idx + 1)
      focusLineAt(idx + 1, selStart)
      return
    }
  }

  /**
   * 여러 줄 텍스트 붙여넣기(Ctrl+V) 시 각 줄의 마크다운 문법을 자동 파싱하여 블록으로 삽입
   */
  function handleLinePaste(
    idx: number,
    e: React.ClipboardEvent<HTMLInputElement>
  ) {
    const pasted = e.clipboardData.getData("text/plain")
    if (!pasted || !pasted.includes("\n")) return

    e.preventDefault()
    const pastedLines = pasted.split(/\r?\n/)
    const parsedNewBlocks = pastedLines.map((l) => parseRawLineToLiveBlock(l))

    setLiveBlocks((prev) => {
      const next = [...prev]
      const current = next[idx]
      if (current && !current.text.trim() && current.type === "paragraph") {
        next.splice(idx, 1, ...parsedNewBlocks)
      } else {
        next.splice(idx + 1, 0, ...parsedNewBlocks)
      }
      return next
    })
    const targetIdx = idx + parsedNewBlocks.length - 1
    setFocusedIndex(targetIdx)
    focusLineAt(targetIdx, "end")
  }

  /**
   * 현재 포커스된 줄(또는 다음 줄)에 블록이나 마크다운 라인들을 삽입합니다.
   */
  function insertLinesAtFocused(rawLines: string[]) {
    const newBlocks = rawLines.map((l) => parseRawLineToLiveBlock(l))
    setLiveBlocks((prev) => {
      const next = [...prev]
      const targetIdx = Math.min(Math.max(0, focusedIndex), next.length - 1)
      const current = next[targetIdx]
      if (current && !current.text.trim() && current.type === "paragraph") {
        next.splice(targetIdx, 1, ...newBlocks, {
          id: makeBlockId(),
          type: "paragraph",
          text: "",
        })
        setFocusedIndex(targetIdx + newBlocks.length)
        focusLineAt(targetIdx + newBlocks.length, 0)
      } else {
        next.splice(targetIdx + 1, 0, ...newBlocks, {
          id: makeBlockId(),
          type: "paragraph",
          text: "",
        })
        setFocusedIndex(targetIdx + newBlocks.length + 1)
        focusLineAt(targetIdx + newBlocks.length + 1, 0)
      }
      return next
    })
  }

  function applyQuickLineFormat(type: LineBlockType) {
    setLiveBlocks((prev) => {
      const targetIdx = Math.min(Math.max(0, focusedIndex), prev.length - 1)
      return prev.map((item, i) =>
        i === targetIdx
          ? {
              ...item,
              type: item.type === type ? "paragraph" : type,
              toggleOpen: true,
            }
          : item
      )
    })
    focusLineAt(focusedIndex, "end")
  }

  function moveBlockOrder(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= liveBlocks.length) return
    setLiveBlocks((prev) => {
      const next = [...prev]
      const temp = next[idx]
      next[idx] = next[target]
      next[target] = temp
      return next
    })
    setFocusedIndex(target)
    focusLineAt(target, "end")
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsUploadingPhoto(true)
    try {
      const mdImages: string[] = []
      for (const file of files) {
        const url = await uploadImageToCloudinary(file, {
          maxDimension: 1600,
          quality: 0.82,
        })
        mdImages.push(`![사진](${url})`)
      }
      insertLinesAtFocused(mdImages)
    } finally {
      setIsUploadingPhoto(false)
      if (photoInputRef.current) {
        photoInputRef.current.value = ""
      }
    }
  }

  async function handleSave() {
    if (!onSaveDiary || !place) return
    setIsSaving(true)
    try {
      const serialized = liveBlocksToMarkdown(liveBlocks).trim()
      const extractedPhotos = extractMarkdownImageUrls(serialized)
      await onSaveDiary(place.id, {
        name: place.name,
        address: place.address,
        expectedVisitTime: draftTime,
        memo: serialized,
        review: "",
        photos: extractedPhotos,
      })
      setIsEditing(false)
      setShowTableComposer(false)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleQuickTimeChange(newTime: string) {
    if (readOnly) {
      showToast("로그인이 필요한 기능입니다.", "warning")
      return
    }
    setDraftTime(newTime)
    if (onSaveDiary && place) {
      await onSaveDiary(place.id, {
        expectedVisitTime: newTime,
      })
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-white text-[#18181B]">
      {/* 1. 상단 네비게이션 바: [← Day N 일정 목록으로] + [편집 / 완료] */}
      <div className="px-4 py-3 border-b border-[#E2E2DA] bg-[#FBFBF9] flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={onBackToList}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-200/60 text-xs sm:text-sm font-extrabold text-[#18181B] transition cursor-pointer"
        >
          <ArrowLeft className="size-4 text-[#1A9E7A]" />
          <span>Day {dayNumber} 일정 목록</span>
        </button>

        <div className="flex items-center gap-1.5">
          {isEditing && !readOnly ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setShowTableComposer(false)
                  setLiveBlocks(markdownToLiveBlocks(combinedViewContent))
                }}
                className="px-3 py-1.5 rounded-xl border border-[#E2E2DA] bg-white hover:bg-slate-50 text-xs font-bold text-[#52525B] cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isSaving || isUploadingPhoto}
                onClick={handleSave}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#1A9E7A] hover:bg-[#158063] text-xs font-extrabold text-white transition disabled:opacity-50 cursor-pointer"
              >
                <Check className="size-3.5" />
                <span>{isSaving ? "저장 중..." : "저장"}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (readOnly) {
                  showToast("로그인이 필요한 기능입니다.", "warning")
                  return
                }
                setIsEditing(true)
                focusLineAt(0, "end")
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-extrabold transition cursor-pointer"
            >
              <Edit3 className="size-3.5" />
              <span>{hasContent ? "메모 수정" : "메모 작성"}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 장소 핵심 요약 헤더 (순서 · 장소명 · 주소 · WanderMap 타임피커 · 찬반 투표) */}
      <div className="p-4 border-b border-[#E2E2DA] bg-white space-y-3 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1A9E7A] text-white text-sm font-extrabold mt-0.5">
              {place.order}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-[#18181B] leading-snug">
                  {place.name}
                </h3>
                <span className="px-2 py-0.5 rounded-lg bg-[#EDFAF4] text-[#1A9E7A] text-[11px] font-extrabold">
                  {place.category}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#6B6B72] flex items-center gap-1.5 mt-1">
                <MapPin className="size-3.5 text-[#1A9E7A] shrink-0" />
                <span className="truncate">{place.address || "위치 미지정"}</span>
              </p>
            </div>
          </div>

          {/* 방문 시간 WanderMap 전용 타임피커 */}
          <div className="shrink-0">
            <TimePicker
              value={draftTime}
              onChange={handleQuickTimeChange}
              disabled={false}
              align="right"
              direction="down"
            />
          </div>
        </div>

        {/* 찬반 투표 바 */}
        {onVote && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onVote(place.id, "up")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                place.myVote === "UP"
                  ? "border-[#1A9E7A] bg-[#1A9E7A] text-white"
                  : "border-[#E2E2DA] bg-[#F8F8F6] hover:border-[#1A9E7A]/50 text-[#27272A]"
              }`}
            >
              <ThumbsUp className="size-3.5" />
              <span>찬성 {place.votesUp}</span>
            </button>
            <button
              type="button"
              onClick={() => onVote(place.id, "down")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                place.myVote === "DOWN"
                  ? "border-rose-500 bg-rose-500 text-white"
                  : "border-[#E2E2DA] bg-[#F8F8F6] hover:border-rose-300 text-[#6B6B72]"
              }`}
            >
              <ThumbsDown className="size-3.5" />
              <span>반대 {place.votesDown}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. 메인 영역: 마크다운 노트 보기 / 노션식 실시간 프리뷰 블록 에디터 */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
        {!isEditing ? (
          hasContent ? (
            <div
              onClick={() => {
                if (readOnly) {
                  showToast("로그인이 필요한 기능입니다.", "warning")
                  return
                }
                setIsEditing(true)
                focusLineAt(0, "end")
              }}
              className="cursor-text"
              title={!readOnly ? "클릭하여 메모 수정" : undefined}
            >
              <FormattedMarkdownView
                content={combinedViewContent}
                onClickImage={(url) => setPreviewPhotoUrl(url)}
              />
            </div>
          ) : (
            <div
              onClick={() => {
                if (readOnly) {
                  showToast("로그인이 필요한 기능입니다.", "warning")
                  return
                }
                setIsEditing(true)
                focusLineAt(0, "end")
              }}
              className="h-full min-h-[240px] rounded-2xl border border-dashed border-[#E2E2DA] hover:border-[#1A9E7A]/60 bg-[#FBFBF9] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition"
            >
              <p className="text-sm font-extrabold text-[#52525B]">
                아직 이 장소에 작성된 메모가 없습니다
              </p>
              <p className="text-xs font-medium text-[#8A8A93] mt-1.5">
                여기를 클릭해 이동 팁, 인용구(&gt; ), 체크리스트([] ), 표, 사진을 자유롭게 기록해 보세요.
              </p>
            </div>
          )
        ) : (
          /* 편집 모드: 타이핑 즉시 블록으로 렌더링되는 라이브 마크다운 에디터 */
          <div className="flex flex-col h-full min-h-[320px] space-y-2.5">
            {/* 조용한 미니 툴바 */}
            <div className="flex items-center justify-between border-b border-[#E2E2DA] pb-2">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyQuickLineFormat("h2")}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 text-xs font-bold text-[#52525B] hover:text-[#18181B] transition cursor-pointer"
                  title="제목 (## + 스페이스)"
                >
                  <Heading2 className="size-3.5" />
                  <span>제목</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyQuickLineFormat("quote")}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 text-xs font-bold text-[#52525B] hover:text-[#18181B] transition cursor-pointer"
                  title="인용구 (> + 스페이스)"
                >
                  <Quote className="size-3.5" />
                  <span>인용구</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyQuickLineFormat("todo")}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 text-xs font-bold text-[#52525B] hover:text-[#18181B] transition cursor-pointer"
                  title="체크리스트 ([] + 스페이스)"
                >
                  <CheckSquare className="size-3.5" />
                  <span>체크</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTableComposer((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    showTableComposer
                      ? "bg-[#EDFAF4] text-[#1A9E7A]"
                      : "hover:bg-slate-100 text-[#52525B] hover:text-[#18181B]"
                  }`}
                  title="표 만들어 넣기"
                >
                  <Table className="size-3.5" />
                  <span>표</span>
                </button>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 text-xs font-bold text-[#52525B] hover:text-[#18181B] transition cursor-pointer disabled:opacity-50"
                  title="현재 커서 줄에 사진 마크다운 삽입"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="size-3.5 animate-spin text-[#1A9E7A]" />
                  ) : (
                    <ImageIcon className="size-3.5" />
                  )}
                  <span>{isUploadingPhoto ? "업로드 중" : "사진"}</span>
                </button>
              </div>
            </div>

            {/* [표] 아이콘을 눌렀을 때만 열리는 그리드 표 작성기 */}
            {showTableComposer && (
              <InlineTableGridComposer
                onInsert={(mdTableLines) => {
                  insertLinesAtFocused(mdTableLines)
                  setShowTableComposer(false)
                }}
                onCancel={() => setShowTableComposer(false)}
              />
            )}

            {/* 실시간 마크다운 블록 에디터 본체 */}
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  focusLineAt(liveBlocks.length - 1, "end")
                }
              }}
              className="flex-1 w-full min-h-[260px] rounded-2xl border border-[#E2E2DA] bg-[#FBFBF9] focus-within:bg-white focus-within:border-[#1A9E7A] p-3.5 space-y-1.5 overflow-y-auto custom-scrollbar cursor-text transition"
            >
              {liveBlocks.map((block, idx) => {
                const imgMatch = block.text.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/)

                return (
                  <div key={block.id} className="group/line space-y-1.5">
                    {/* 1) 인용구(> + 스페이스) 실시간 프리뷰 렌더링 */}
                    {block.type === "quote" ? (
                      <div className="flex items-center border-l-4 border-[#1A9E7A] bg-[#EDFAF4]/50 pl-3 pr-2 py-1.5 rounded-r-xl">
                        <input
                          ref={(el) => {
                            lineInputRefs.current[idx] = el
                          }}
                          type="text"
                          value={block.text}
                          onFocus={() => setFocusedIndex(idx)}
                          onChange={(e) => handleLineChange(idx, e.target.value)}
                          onKeyDown={(e) => handleLineKeyDown(idx, e)}
                          onPaste={(e) => handleLinePaste(idx, e)}
                          placeholder="인용구 입력 (맨 앞에서 백스페이스 시 해제)"
                          className="w-full bg-transparent text-sm sm:text-[15px] font-bold text-[#18181B] placeholder:text-[#8A8A93] outline-none"
                        />
                      </div>
                    ) : block.type === "toggle" ? (
                      /* 2) 토글(>> + 스페이스) 실시간 프리뷰 렌더링 */
                      <div className="flex items-center gap-1.5 rounded-xl border border-[#E2E2DA] bg-white px-2.5 py-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setLiveBlocks((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, toggleOpen: !item.toggleOpen } : item
                              )
                            )
                          }
                          className="text-[#1A9E7A] p-0.5 cursor-pointer shrink-0"
                        >
                          {block.toggleOpen ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                        <input
                          ref={(el) => {
                            lineInputRefs.current[idx] = el
                          }}
                          type="text"
                          value={block.text}
                          onFocus={() => setFocusedIndex(idx)}
                          onChange={(e) => handleLineChange(idx, e.target.value)}
                          onKeyDown={(e) => handleLineKeyDown(idx, e)}
                          onPaste={(e) => handleLinePaste(idx, e)}
                          placeholder="토글 제목 입력 (맨 앞에서 백스페이스 시 해제)"
                          className="w-full bg-transparent text-sm font-extrabold text-[#18181B] placeholder:text-[#8A8A93] outline-none"
                        />
                      </div>
                    ) : block.type === "h1" || block.type === "h2" || block.type === "h3" ? (
                      /* 3) 제목(# / ## / ### + 스페이스) 실시간 프리뷰 렌더링 */
                      <div className="pt-1">
                        <input
                          ref={(el) => {
                            lineInputRefs.current[idx] = el
                          }}
                          type="text"
                          value={block.text}
                          onFocus={() => setFocusedIndex(idx)}
                          onChange={(e) => handleLineChange(idx, e.target.value)}
                          onKeyDown={(e) => handleLineKeyDown(idx, e)}
                          onPaste={(e) => handleLinePaste(idx, e)}
                          placeholder="제목 입력 (맨 앞에서 백스페이스 시 일반 글로 복귀)"
                          className={`w-full bg-transparent text-[#18181B] placeholder:text-[#9CA3AF] outline-none ${
                            block.type === "h1"
                              ? "text-lg font-black"
                              : block.type === "h2"
                                ? "text-base font-extrabold"
                                : "text-[15px] font-extrabold"
                          }`}
                        />
                      </div>
                    ) : block.type === "todo" ? (
                      /* 4) 체크리스트([] + 스페이스) 실시간 프리뷰 렌더링 */
                      <div className="flex items-center gap-2.5 py-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setLiveBlocks((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, checked: !item.checked } : item
                              )
                            )
                          }
                          className={`flex size-4.5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition cursor-pointer ${
                            block.checked
                              ? "border-[#1A9E7A] bg-[#1A9E7A] text-white"
                              : "border-[#D4D4CD] bg-white text-transparent"
                          }`}
                        >
                          ✓
                        </button>
                        <input
                          ref={(el) => {
                            lineInputRefs.current[idx] = el
                          }}
                          type="text"
                          value={block.text}
                          onFocus={() => setFocusedIndex(idx)}
                          onChange={(e) => handleLineChange(idx, e.target.value)}
                          onKeyDown={(e) => handleLineKeyDown(idx, e)}
                          onPaste={(e) => handleLinePaste(idx, e)}
                          placeholder="할 일 입력 (맨 앞에서 백스페이스 시 해제)"
                          className={`w-full bg-transparent text-sm font-medium outline-none ${
                            block.checked
                              ? "line-through text-[#8A8A93]"
                              : "text-[#18181B]"
                          }`}
                        />
                      </div>
                    ) : block.type === "bullet" ? (
                      /* 5) 글머리 기호(- + 스페이스) 실시간 프리뷰 렌더링 */
                      <div className="flex items-center gap-2.5 pl-1 py-0.5">
                        <span className="size-1.5 rounded-full bg-[#1A9E7A] shrink-0" />
                        <input
                          ref={(el) => {
                            lineInputRefs.current[idx] = el
                          }}
                          type="text"
                          value={block.text}
                          onFocus={() => setFocusedIndex(idx)}
                          onChange={(e) => handleLineChange(idx, e.target.value)}
                          onKeyDown={(e) => handleLineKeyDown(idx, e)}
                          onPaste={(e) => handleLinePaste(idx, e)}
                          placeholder="항목 입력 (맨 앞에서 백스페이스 시 해제)"
                          className="w-full bg-transparent text-sm sm:text-[15px] font-medium text-[#18181B] placeholder:text-[#9CA3AF] outline-none"
                        />
                      </div>
                    ) : (
                      /* 6) 일반 텍스트 문단 (인라인 이미지 ![사진](url) 포함 시 실시간 이미지 미리보기 & 위치 이동 지원) */
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <input
                            ref={(el) => {
                              lineInputRefs.current[idx] = el
                            }}
                            type="text"
                            value={block.text}
                            onFocus={() => setFocusedIndex(idx)}
                            onChange={(e) => handleLineChange(idx, e.target.value)}
                            onKeyDown={(e) => handleLineKeyDown(idx, e)}
                            onPaste={(e) => handleLinePaste(idx, e)}
                            placeholder={
                              idx === 0 && liveBlocks.length === 1
                                ? "글 작성 (예: '> ' 인용구, '>> ' 토글, '## ' 제목, '[] ' 체크리스트)"
                                : ""
                            }
                            className="w-full bg-transparent text-sm sm:text-[15px] font-medium text-[#18181B] placeholder:text-[#9CA3AF] outline-none leading-relaxed"
                          />
                          {imgMatch && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveBlockOrder(idx, -1)}
                                disabled={idx === 0}
                                className="p-1 rounded-md hover:bg-slate-200/70 text-[#6B6B72] disabled:opacity-30 cursor-pointer"
                                title="사진 위치 위로 이동"
                              >
                                <ArrowUp className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveBlockOrder(idx, 1)}
                                disabled={idx === liveBlocks.length - 1}
                                className="p-1 rounded-md hover:bg-slate-200/70 text-[#6B6B72] disabled:opacity-30 cursor-pointer"
                                title="사진 위치 아래로 이동"
                              >
                                <ArrowDown className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* ![사진](url) 줄일 경우 에디터 안에서도 즉시 이미지 미리보기 표시 */}
                        {imgMatch && imgMatch[2] && (
                          <div className="relative rounded-2xl overflow-hidden border border-[#E2E2DA] bg-white max-h-[200px]">
                            <img
                              src={imgMatch[2]}
                              alt={imgMatch[1] || "첨부 사진"}
                              className="w-full max-h-[200px] object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 사진 원본 확대 모달 */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img
              src={previewPhotoUrl}
              alt="원본 사진"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute -top-3 -right-3 size-9 rounded-full bg-white text-[#18181B] shadow-lg flex items-center justify-center cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
