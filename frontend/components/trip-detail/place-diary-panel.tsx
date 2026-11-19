"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Info,
  FileText,
  Copy,
  ExternalLink,
  Clock,
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
  activeTab?: "info" | "diary"
  onChangeTab?: (tab: "info" | "diary") => void
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
  | "h4"
  | "todo"
  | "bullet"
  | "table"

interface LiveLineBlock {
  id: string
  type: LineBlockType
  text: string
  checked?: boolean
  toggleOpen?: boolean
  toggleBody?: string
  tableRows?: string[][]
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
  headingLevel?: 1 | 2 | 3 | 4
  toggleBody?: string
  imageAlt?: string
  imageUrl?: string
}

interface SelectionRect {
  rMin: number
  rMax: number
  cMin: number
  cMax: number
}

function makeBlockId(): string {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function cloneLiveBlocks(blocks: LiveLineBlock[]): LiveLineBlock[] {
  return blocks.map((b) => ({
    ...b,
    tableRows: b.tableRows ? b.tableRows.map((row) => [...row]) : undefined,
  }))
}

function isMarkdownTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim()
  return /^\|[\s\-:|]+\|$/.test(trimmed) && /-/.test(trimmed)
}

function parseTableRowCells(line: string): string[] {
  const trimmed = line.trim()
  const withoutStart = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed
  const withoutEnd = withoutStart.endsWith("|") ? withoutStart.slice(0, -1) : withoutStart
  return withoutEnd.split("|").map((cell) => cell.trim())
}

function normalizeTableRows(rows: string[][]): string[][] {
  const safeRows = rows.length > 0 ? rows : [["", ""]]
  const colCount = Math.max(1, ...safeRows.map((r) => r.length))
  return safeRows.map((r) => {
    if (r.length === colCount) return [...r]
    const padded = [...r]
    while (padded.length < colCount) padded.push("")
    return padded.slice(0, colCount)
  })
}

/**
 * 한 줄의 마크다운 원문을 LiveLineBlock 상태로 변환합니다.
 */
function parseRawLineToLiveBlock(rawLine: string): LiveLineBlock {
  const trimmedStart = rawLine.replace(/^\s+/, "")

  if (/^####\s+/.test(trimmedStart)) {
    return {
      id: makeBlockId(),
      type: "h4",
      text: trimmedStart.replace(/^####\s+/, ""),
    }
  }
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
  if (/^(?:>>|▶)(?:\s|$)/.test(trimmedStart)) {
    return {
      id: makeBlockId(),
      type: "toggle",
      text: trimmedStart.replace(/^(?:>>|▶)\s*/, ""),
      toggleOpen: true,
      toggleBody: "",
    }
  }
  if (/^>\s+/.test(trimmedStart)) {
    return {
      id: makeBlockId(),
      type: "quote",
      text: trimmedStart.replace(/^>\s+/, ""),
    }
  }
  const todoMatch = trimmedStart.match(/^(?:-\s*)?\[([ xX]?)\](?:\s(.*)|$)$/)
  if (todoMatch) {
    return {
      id: makeBlockId(),
      type: "todo",
      text: todoMatch[2] ?? "",
      checked: todoMatch[1].toLowerCase() === "x",
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
  const result: LiveLineBlock[] = []
  let i = 0

  while (i < rawLines.length) {
    const trimmed = rawLines[i].trim()
    const nextTrimmed = rawLines[i + 1]?.trim() ?? ""
    const looksLikeTableStart =
      trimmed.startsWith("|") &&
      (trimmed.endsWith("|") || nextTrimmed.startsWith("|"))

    if (looksLikeTableStart) {
      const tableLines: string[] = []
      while (i < rawLines.length && rawLines[i].trim().startsWith("|")) {
        tableLines.push(rawLines[i].trim())
        i++
      }
      const dataRows = tableLines
        .filter((l) => !isMarkdownTableSeparatorLine(l))
        .map((l) => parseTableRowCells(l))

      if (dataRows.length > 0) {
        result.push({
          id: makeBlockId(),
          type: "table",
          text: "",
          tableRows: normalizeTableRows(dataRows),
        })
      } else {
        for (const tl of tableLines) {
          result.push(parseRawLineToLiveBlock(tl))
        }
      }
      continue
    }

    const trimmedStart = rawLines[i].replace(/^\s+/, "")
    const toggleMatch = trimmedStart.match(/^(?:>>|▶)(?:\s(.*)|$)$/)
    if (toggleMatch) {
      i++
      const bodyLines: string[] = []
      while (
        i < rawLines.length &&
        (rawLines[i].startsWith("  ") || rawLines[i].startsWith("\t"))
      ) {
        bodyLines.push(
          rawLines[i].startsWith("\t") ? rawLines[i].slice(1) : rawLines[i].slice(2)
        )
        i++
      }
      result.push({
        id: makeBlockId(),
        type: "toggle",
        text: toggleMatch[1] ?? "",
        toggleOpen: true,
        toggleBody: bodyLines.join("\n"),
      })
      continue
    }

    result.push(parseRawLineToLiveBlock(rawLines[i]))
    i++
  }

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
        case "h4":
          return `#### ${b.text}`
        case "quote":
          return `> ${b.text}`
        case "toggle": {
          const header = `▶ ${b.text}`
          if (b.toggleBody && b.toggleBody.length > 0) {
            const indentedBody = b.toggleBody
              .split("\n")
              .map((line) => `  ${line}`)
              .join("\n")
            return `${header}\n${indentedBody}`
          }
          return header
        }
        case "todo":
          return `- [${b.checked ? "x" : " "}] ${b.text}`
        case "bullet":
          return `- ${b.text}`
        case "table": {
          const normalizedRows = normalizeTableRows(
            b.tableRows && b.tableRows.length > 0
              ? b.tableRows
              : [
                  ["항목", "내용", "비고"],
                  ["", "", ""],
                ]
          )
          const mdLines: string[] = []
          normalizedRows.forEach((row, rIdx) => {
            const cells = row.map(
              (c) => (c || "").replace(/\|/g, "/").trim() || " "
            )
            mdLines.push(`| ${cells.join(" | ")} |`)
            if (rIdx === 0) {
              mdLines.push(`| ${cells.map(() => "---").join(" | ")} |`)
            }
          })
          return mdLines.join("\n")
        }
        case "paragraph":
        default:
          return b.text
      }
    })
    .join("\n")
}

/**
 * 일반 텍스트 줄(paragraph)에서 사용자가 마크다운 단축키(`> `, `>> `, `# `, `## `, `- [ ] `, `- `)를
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
  // 3. 제목 1~4: `#### `, `### `, `## `, `# `
  if (/^####\s/.test(inputVal)) {
    return {
      matched: true,
      type: "h4",
      restText: inputVal.replace(/^####\s/, ""),
    }
  }
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
  // 4. 체크리스트: `[] `, `[ ] `, `- [ ] `, `- [x] `, `[x] `
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

    // 3. 제목(#, ##, ###, ####) 감지
    if (/^#{1,4}\s+/.test(line)) {
      const level: 1 | 2 | 3 | 4 = line.startsWith("#### ")
        ? 4
        : line.startsWith("### ")
          ? 3
          : line.startsWith("## ")
            ? 2
            : 1
      blocks.push({ type: "heading", headingLevel: level, lines: [line] })
      i++
      continue
    }

    // 4. 토글(▶ 또는 >>) 감지 (2칸 들여쓰기 본문 포함)
    if (/^(?:▶|>>)(?:\s|$)/.test(line)) {
      const title = line.replace(/^(?:▶|>>)\s*/, "")
      i++
      const bodyLines: string[] = []
      while (
        i < lines.length &&
        (lines[i].startsWith("  ") || lines[i].startsWith("\t"))
      ) {
        bodyLines.push(
          lines[i].startsWith("\t") ? lines[i].slice(1) : lines[i].slice(2)
        )
        i++
      }
      blocks.push({
        type: "toggle",
        lines: [title],
        toggleBody: bodyLines.join("\n"),
      })
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
    if (/^(?:-\s*)?\[[ xX]?\](?:\s+|$)/.test(line)) {
      const checkLines: string[] = []
      while (
        i < lines.length &&
        /^(?:-\s*)?\[[ xX]?\](?:\s+|$)/.test(lines[i].trim())
      ) {
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
      !/^#{1,4}\s+/.test(lines[i].trim()) &&
      !/^(?:▶|>>)(?:\s|$)/.test(lines[i].trim()) &&
      !/^>\s+/.test(lines[i].trim()) &&
      !/^(?:-\s*)?\[[ xX]?\](?:\s+|$)/.test(lines[i].trim()) &&
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
            .filter((l) => !isMarkdownTableSeparatorLine(l))
            .map((l) => parseTableRowCells(l))
          if (rows.length === 0) return null
          const normalized = normalizeTableRows(rows)
          const header = normalized[0]
          const body = normalized.slice(1)

          return (
            <div
              key={bIdx}
              className="overflow-x-auto border border-[#E2E2DA] bg-white shadow-2xs my-2"
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
          const text = block.lines[0].replace(/^#{1,4}\s+/, "")
          if (block.headingLevel === 1) {
            return (
              <h1
                key={bIdx}
                className="text-2xl font-black tracking-tight text-[#18181B] pt-2 leading-tight"
              >
                {text}
              </h1>
            )
          }
          if (block.headingLevel === 2) {
            return (
              <h2
                key={bIdx}
                className="text-xl font-extrabold tracking-tight text-[#18181B] pt-1.5 leading-snug"
              >
                {text}
              </h2>
            )
          }
          if (block.headingLevel === 3) {
            return (
              <h3
                key={bIdx}
                className="text-lg font-extrabold text-[#18181B] pt-1 leading-snug"
              >
                {text}
              </h3>
            )
          }
          return (
            <h4
              key={bIdx}
              className="text-[15px] font-extrabold text-[#27272A] pt-0.5 leading-snug"
            >
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
          const isOpen = openToggles[bIdx] ?? false
          const hasBody = Boolean(block.toggleBody && block.toggleBody.trim())
          return (
            <div
              key={bIdx}
              className="rounded-xl border border-[#E2E2DA] bg-[#FBFBF9] px-3 py-2"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenToggles((prev) => ({ ...prev, [bIdx]: !isOpen }))
                }}
                className="w-full flex items-center gap-2 text-left text-sm font-extrabold text-[#18181B] cursor-pointer"
              >
                {isOpen ? (
                  <ChevronDown className="size-4 text-[#1A9E7A] shrink-0" />
                ) : (
                  <ChevronRight className="size-4 text-[#1A9E7A] shrink-0" />
                )}
                <span>{block.lines[0]}</span>
              </button>
              {isOpen && hasBody && (
                <div className="mt-2 ml-2 pl-4 border-l-2 border-[#E2E2DA]">
                  <FormattedMarkdownView
                    content={block.toggleBody!}
                    onClickImage={onClickImage}
                  />
                </div>
              )}
            </div>
          )
        }

        if (block.type === "checklist") {
          return (
            <ul key={bIdx} className="space-y-1.5">
              {block.lines.map((item, lIdx) => {
                const checked = /^(?:-\s*)?\[[xX]\]/.test(item)
                const label = item.replace(/^(?:-\s*)?\[[ xX]?\]\s*/, "")
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
 * Obsidian 스타일 인라인 표 블록 에디터
 * - 맨 끝 열/행 바로 바깥에 마우스를 올렸을 때만 + 추가 바 노출
 * - 셀 마우스 드래그 범위 선택 후 Delete / Backspace로 행·열 삭제 또는 셀 비우기
 * - 셀 input 포커스 상태에서는 Backspace / Delete가 셀 내부 텍스트만 수정
 */
function ObsidianTableBlock({
  blockId,
  rows,
  autoFocusCell = false,
  onConsumeAutoFocus,
  onChangeRows,
  onDeleteTable,
  onFocusTable,
}: {
  blockId: string
  rows: string[][]
  autoFocusCell?: boolean
  onConsumeAutoFocus?: () => void
  onChangeRows: (nextRows: string[][], meta?: { coalesceKey?: string }) => void
  onDeleteTable: () => void
  onFocusTable?: () => void
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const cellInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const dragAnchorRef = useRef<{ r: number; c: number } | null>(null)
  const isDraggingRef = useRef(false)
  const hasDraggedMultiRef = useRef(false)

  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null)

  const grid = normalizeTableRows(rows)
  const rowCount = grid.length
  const colCount = grid[0]?.length ?? 1

  useEffect(() => {
    if (!autoFocusCell) return
    const timer = setTimeout(() => {
      cellInputRefs.current["0-0"]?.focus()
      onConsumeAutoFocus?.()
    }, 20)
    return () => clearTimeout(timer)
  }, [autoFocusCell, onConsumeAutoFocus])

  useEffect(() => {
    if (!selectionRect) return
    if (selectionRect.rMax >= rowCount || selectionRect.cMax >= colCount) {
      setSelectionRect(null)
    }
  }, [rowCount, colCount, selectionRect])

  useEffect(() => {
    function handleWindowMouseUp() {
      isDraggingRef.current = false
      dragAnchorRef.current = null
      hasDraggedMultiRef.current = false
    }
    window.addEventListener("mouseup", handleWindowMouseUp)
    return () => window.removeEventListener("mouseup", handleWindowMouseUp)
  }, [])

  useEffect(() => {
    if (!selectionRect) return
    function handleOutsideMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSelectionRect(null)
      }
    }
    document.addEventListener("mousedown", handleOutsideMouseDown)
    return () => document.removeEventListener("mousedown", handleOutsideMouseDown)
  }, [selectionRect])

  function focusCell(r: number, c: number) {
    setTimeout(() => {
      cellInputRefs.current[`${r}-${c}`]?.focus()
    }, 10)
  }

  function updateCell(rIdx: number, cIdx: number, val: string) {
    onChangeRows(
      grid.map((row, ri) =>
        ri === rIdx ? row.map((cell, ci) => (ci === cIdx ? val : cell)) : row
      ),
      { coalesceKey: `table-cell:${blockId}:${rIdx}:${cIdx}` }
    )
  }

  function addRow() {
    setSelectionRect(null)
    onChangeRows([...grid, Array(colCount).fill("")])
  }

  function addColumn() {
    setSelectionRect(null)
    onChangeRows(grid.map((row) => [...row, ""]))
  }

  function activateSelection(rect: SelectionRect) {
    setSelectionRect(rect)
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLInputElement
    ) {
      document.activeElement.blur()
    }
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges()
    }
    onFocusTable?.()
    setTimeout(() => {
      wrapperRef.current?.focus({ preventScroll: true })
    }, 0)
  }

  function applySelectionDeletion() {
    if (!selectionRect) return
    const { rMin, rMax, cMin, cMax } = selectionRect
    const allRowsSelected = rMin === 0 && rMax === rowCount - 1
    const allColsSelected = cMin === 0 && cMax === colCount - 1

    if (allRowsSelected && allColsSelected) {
      setSelectionRect(null)
      onDeleteTable()
      return
    }

    if (allColsSelected) {
      const nextRows = grid.filter((_, ri) => ri < rMin || ri > rMax)
      setSelectionRect(null)
      if (nextRows.length === 0) {
        onDeleteTable()
      } else {
        onChangeRows(nextRows)
      }
      return
    }

    if (allRowsSelected) {
      const nextRows = grid.map((row) =>
        row.filter((_, ci) => ci < cMin || ci > cMax)
      )
      setSelectionRect(null)
      if ((nextRows[0]?.length ?? 0) === 0) {
        onDeleteTable()
      } else {
        onChangeRows(nextRows)
      }
      return
    }

    // Partial rectangle -> clear cell contents, keep table structure intact
    const clearedRows = grid.map((row, ri) =>
      row.map((cell, ci) =>
        ri >= rMin && ri <= rMax && ci >= cMin && ci <= cMax ? "" : cell
      )
    )
    onChangeRows(clearedRows)
    setSelectionRect(null)
  }

  function handleWrapperKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return
    }
    if (!selectionRect) return

    if (e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
      setSelectionRect(null)
      return
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault()
      e.stopPropagation()
      applySelectionDeletion()
    }
  }

  function handleCellKeyDown(
    rIdx: number,
    cIdx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Tab") {
      if (e.shiftKey) {
        if (cIdx > 0) {
          e.preventDefault()
          focusCell(rIdx, cIdx - 1)
        } else if (rIdx > 0) {
          e.preventDefault()
          focusCell(rIdx - 1, colCount - 1)
        }
      } else {
        if (cIdx + 1 < colCount) {
          e.preventDefault()
          focusCell(rIdx, cIdx + 1)
        } else if (rIdx + 1 < rowCount) {
          e.preventDefault()
          focusCell(rIdx + 1, 0)
        }
      }
      return
    }

    if (e.key === "Enter") {
      e.preventDefault()
      if (rIdx + 1 < rowCount) {
        focusCell(rIdx + 1, cIdx)
      } else {
        onChangeRows([...grid, Array(colCount).fill("")])
        focusCell(rIdx + 1, cIdx)
      }
    }
  }

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      onKeyDown={handleWrapperKeyDown}
      className="relative my-1.5 outline-none"
    >
      {/* Inline selection hint / action pill */}
      {selectionRect && (
        <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-[#1A9E7A]/30 bg-[#EDFAF4] px-2.5 py-1 text-[11px] font-bold text-[#158063]">
          <span>선택됨 · Delete: 비우기/삭제 · Esc: 해제</span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                applySelectionDeletion()
              }}
              className="px-1.5 py-0.5 rounded-md bg-white/95 hover:bg-rose-50 text-rose-600 border border-[#E2E2DA] text-[10px] font-extrabold cursor-pointer transition"
            >
              삭제/비우기
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSelectionRect(null)
              }}
              className="px-1.5 py-0.5 rounded-md bg-white/95 hover:bg-white text-[#52525B] border border-[#E2E2DA] text-[10px] font-extrabold cursor-pointer transition"
            >
              해제
            </button>
          </div>
        </div>
      )}

      {/* 직각 Grid + 맨 끝 열 바깥 호버 전용 '+' 바 */}
      <div className="flex items-stretch">
        <div className="flex-1 min-w-0 overflow-x-auto border border-[#E2E2DA] bg-white shadow-2xs">
          <table
            className={`w-full border-collapse text-xs ${
              selectionRect ? "select-none" : ""
            }`}
          >
            <tbody>
              {grid.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={`border-b last:border-b-0 border-[#E2E2DA] ${
                    rIdx === 0 ? "bg-[#F7F7F2]" : "bg-white"
                  }`}
                >
                  {row.map((cell, cIdx) => {
                    const isCellSelected = Boolean(
                      selectionRect &&
                        rIdx >= selectionRect.rMin &&
                        rIdx <= selectionRect.rMax &&
                        cIdx >= selectionRect.cMin &&
                        cIdx <= selectionRect.cMax
                    )

                    return (
                      <td
                        key={cIdx}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return
                          dragAnchorRef.current = { r: rIdx, c: cIdx }
                          isDraggingRef.current = true
                          hasDraggedMultiRef.current = false
                          setSelectionRect(null)
                        }}
                        onMouseEnter={() => {
                          if (!isDraggingRef.current || !dragAnchorRef.current) return
                          const anchor = dragAnchorRef.current
                          if (
                            hasDraggedMultiRef.current ||
                            rIdx !== anchor.r ||
                            cIdx !== anchor.c
                          ) {
                            hasDraggedMultiRef.current = true
                            activateSelection({
                              rMin: Math.min(anchor.r, rIdx),
                              rMax: Math.max(anchor.r, rIdx),
                              cMin: Math.min(anchor.c, cIdx),
                              cMax: Math.max(anchor.c, cIdx),
                            })
                          }
                        }}
                        className={`min-w-[82px] border-r last:border-r-0 border-[#E2E2DA] p-0 transition-colors ${
                          isCellSelected
                            ? "bg-[#1A9E7A]/15 ring-1 ring-inset ring-[#1A9E7A]"
                            : "focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#1A9E7A]"
                        }`}
                      >
                        <input
                          ref={(el) => {
                            cellInputRefs.current[`${rIdx}-${cIdx}`] = el
                          }}
                          type="text"
                          value={cell}
                          onFocus={() => {
                            setSelectionRect(null)
                            onFocusTable?.()
                          }}
                          onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(rIdx, cIdx, e)}
                          placeholder={rIdx === 0 ? "열 제목" : ""}
                          className={`w-full bg-transparent px-2.5 py-2 outline-none ${
                            rIdx === 0
                              ? "font-extrabold text-[#18181B]"
                              : "font-medium text-[#27272A]"
                          }`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 맨 끝 열 아주 살짝 바깥쪽 영역 호버 시에만 노출되는 세로 '+' 바 */}
        <div className="relative group/addcol -ml-px w-6 shrink-0 flex items-stretch">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              addColumn()
            }}
            aria-label="열 추가"
            className="w-full border border-dashed border-[#E2E2DA] hover:border-[#1A9E7A] bg-[#FBFBF9] hover:bg-[#EDFAF4] text-[#8A8A93] hover:text-[#1A9E7A] flex items-center justify-center transition-opacity duration-150 opacity-0 group-hover/addcol:opacity-100 focus-visible:opacity-100 cursor-pointer"
          >
            <Plus className="size-3.5" />
          </button>
          <div className="pointer-events-none invisible opacity-0 group-hover/addcol:visible group-hover/addcol:opacity-100 transition-all duration-150 absolute right-0 top-full mt-1.5 z-30 whitespace-nowrap rounded-lg bg-[#18181B] px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
            열 추가
          </div>
        </div>
      </div>

      {/* 맨 끝 행 아주 살짝 바깥쪽 영역 호버 시에만 노출되는 가로 '+' 바 */}
      <div className="pr-6 -mt-px">
        <div className="relative group/addrow h-6 flex items-start">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              addRow()
            }}
            aria-label="행 추가"
            className="w-full h-5 border border-dashed border-[#E2E2DA] hover:border-[#1A9E7A] bg-[#FBFBF9] hover:bg-[#EDFAF4] text-[#8A8A93] hover:text-[#1A9E7A] flex items-center justify-center transition-opacity duration-150 opacity-0 group-hover/addrow:opacity-100 focus-visible:opacity-100 cursor-pointer"
          >
            <Plus className="size-3.5" />
          </button>
          <div className="pointer-events-none invisible opacity-0 group-hover/addrow:visible group-hover/addrow:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-30 whitespace-nowrap rounded-lg bg-[#18181B] px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
            행 추가
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleBodyTextarea({
  value,
  inputRef,
  onFocus,
  onChange,
  onKeyDown,
}: {
  value: string
  inputRef: (el: HTMLTextAreaElement | null) => void
  onFocus: () => void
  onChange: (nextVal: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}) {
  const elRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.max(el.scrollHeight, 24)}px`
  }, [value])

  return (
    <textarea
      ref={(el) => {
        elRef.current = el
        inputRef(el)
      }}
      rows={1}
      value={value}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="토글 내용"
      className="w-full resize-none overflow-hidden bg-transparent text-sm font-medium text-[#27272A] placeholder:text-[#9CA3AF] leading-relaxed outline-none"
    />
  )
}

export function PlaceDiaryPanel({
  place,
  dayNumber,
  readOnly = false,
  activeTab,
  onChangeTab,
  onBackToList,
  onVote,
  onSaveDiary,
}: PlaceDiaryPanelProps) {
  const [internalTab, setInternalTab] = useState<"info" | "diary">("info")
  const [isEditing, setIsEditing] = useState(false)
  const [draftTime, setDraftTime] = useState("14:00")
  const [liveBlocks, setLiveBlocks] = useState<LiveLineBlock[]>(() => [
    { id: makeBlockId(), type: "paragraph", text: "" },
  ])
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
  const [newlyInsertedTableId, setNewlyInsertedTableId] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null)

  const lineInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const toggleBodyRefs = useRef<(HTMLTextAreaElement | null)[]>([])
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  const liveBlocksRef = useRef<LiveLineBlock[]>(liveBlocks)
  const undoStackRef = useRef<LiveLineBlock[][]>([])
  const redoStackRef = useRef<LiveLineBlock[][]>([])
  const lastTypingCommitRef = useRef<{ key: string; at: number } | null>(null)

  function resetHistory(nextBlocks: LiveLineBlock[]) {
    const cloned = cloneLiveBlocks(nextBlocks)
    undoStackRef.current = []
    redoStackRef.current = []
    lastTypingCommitRef.current = null
    liveBlocksRef.current = cloned
    setLiveBlocks(cloned)
  }

  function commitLiveBlocks(
    updater: (prev: LiveLineBlock[]) => LiveLineBlock[],
    options?: { coalesceKey?: string }
  ) {
    const prev = liveBlocksRef.current
    const next = updater(prev)
    if (next === prev) return

    const now = Date.now()
    const key = options?.coalesceKey
    const canCoalesce = Boolean(
      key &&
        lastTypingCommitRef.current?.key === key &&
        now - lastTypingCommitRef.current.at < 500 &&
        undoStackRef.current.length > 0
    )

    if (!canCoalesce) {
      undoStackRef.current.push(cloneLiveBlocks(prev))
      if (undoStackRef.current.length > 60) {
        undoStackRef.current.shift()
      }
    }

    redoStackRef.current = []
    lastTypingCommitRef.current = key ? { key, at: now } : null
    liveBlocksRef.current = next
    setLiveBlocks(next)
  }

  function handleUndo() {
    const previous = undoStackRef.current.pop()
    if (!previous) return
    redoStackRef.current.push(cloneLiveBlocks(liveBlocksRef.current))
    lastTypingCommitRef.current = null
    const restored = cloneLiveBlocks(previous)
    liveBlocksRef.current = restored
    setLiveBlocks(restored)
    setFocusedIndex((idx) => Math.min(idx, Math.max(0, restored.length - 1)))
  }

  function handleRedo() {
    const nextState = redoStackRef.current.pop()
    if (!nextState) return
    undoStackRef.current.push(cloneLiveBlocks(liveBlocksRef.current))
    lastTypingCommitRef.current = null
    const restored = cloneLiveBlocks(nextState)
    liveBlocksRef.current = restored
    setLiveBlocks(restored)
    setFocusedIndex((idx) => Math.min(idx, Math.max(0, restored.length - 1)))
  }

  const currentTab = activeTab !== undefined ? activeTab : internalTab

  function handleTabChange(nextTab: "info" | "diary") {
    if (activeTab === undefined) {
      setInternalTab(nextTab)
    }
    onChangeTab?.(nextTab)
  }

  useEffect(() => {
    setInternalTab("info")
    setCopiedAddress(false)
  }, [place?.id])

  useEffect(() => {
    if (place) {
      setDraftTime(place.time || "14:00")
    }
  }, [place?.id, place?.time])

  useEffect(() => {
    setIsEditing(false)
    setNewlyInsertedTableId(null)
    if (place) {
      setDraftTime(place.time || "14:00")
      const initialMd = buildInitialMarkdownContent(place)
      resetHistory(markdownToLiveBlocks(initialMd))
    }
  }, [place?.id, place?.memo, place?.review, place?.photos])

  if (!place) return null

  const combinedViewContent = buildInitialMarkdownContent(place)
  const hasContent = Boolean(combinedViewContent.trim())

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [place.name, place.address].filter(Boolean).join(" ")
  )}`

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

  function focusToggleBodyAt(
    idx: number,
    cursorPos: "start" | "end" | number = "start"
  ) {
    setTimeout(() => {
      const el = toggleBodyRefs.current[idx]
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

  async function handleCopyAddress() {
    if (!place?.address) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(place.address)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = place.address
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopiedAddress(true)
      showToast("주소를 복사했습니다.", "success")
      setTimeout(() => setCopiedAddress(false), 1800)
    } catch {
      showToast("주소 복사에 실패했습니다.", "error")
    }
  }

  /**
   * 각 줄 입력 변경 시:
   * - 글머리(`bullet`) 상태에서 `[ ] `, `[x] `, `[] ` 입력 시 즉시 체크리스트(`todo`)로 전환
   * - 일반 문단(`paragraph`) 상태에서 `> `, `>> `, `# `, `## `, `### `, `- [ ] `, `- ` 등 감지 시 즉시 전환
   */
  function handleLineChange(idx: number, rawVal: string) {
    const current = liveBlocksRef.current[idx]
    if (!current) return

    if (current.type === "bullet") {
      const bulletTodoMatch = rawVal.match(/^\[([ xX]?)\]\s(.*)$/)
      if (bulletTodoMatch) {
        commitLiveBlocks((prev) => {
          const item = prev[idx]
          if (!item) return prev
          const updated = [...prev]
          updated[idx] = {
            ...item,
            type: "todo",
            checked: bulletTodoMatch[1].toLowerCase() === "x",
            text: bulletTodoMatch[2],
          }
          return updated
        })
        focusLineAt(idx, 0)
        return
      }
    }

    if (current.type === "paragraph") {
      const shortcut = detectLiveMarkdownShortcut(rawVal)
      if (shortcut.matched && shortcut.type) {
        commitLiveBlocks((prev) => {
          const item = prev[idx]
          if (!item) return prev
          const updated = [...prev]
          updated[idx] = {
            ...item,
            type: shortcut.type!,
            text: shortcut.restText ?? "",
            checked: shortcut.checked ?? false,
            toggleOpen: true,
            toggleBody:
              shortcut.type === "toggle" ? item.toggleBody ?? "" : item.toggleBody,
          }
          return updated
        })
        focusLineAt(idx, 0)
        return
      }
    }

    commitLiveBlocks(
      (prev) => {
        const item = prev[idx]
        if (!item) return prev
        const updated = [...prev]
        updated[idx] = { ...item, text: rawVal }
        return updated
      },
      { coalesceKey: `line:${current.id}` }
    )
  }

  function handleToggleBodyChange(idx: number, rawVal: string) {
    const current = liveBlocksRef.current[idx]
    if (!current) return
    commitLiveBlocks(
      (prev) => {
        const item = prev[idx]
        if (!item) return prev
        const updated = [...prev]
        updated[idx] = { ...item, toggleBody: rawVal }
        return updated
      },
      { coalesceKey: `toggle-body:${current.id}` }
    )
  }

  function handleToggleBodyKeyDown(
    idx: number,
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (e.nativeEvent.isComposing) return

    if (
      e.key === "Escape" ||
      ((e.ctrlKey || e.metaKey) && e.key === "Enter")
    ) {
      e.preventDefault()
      const nextSibling = liveBlocksRef.current[idx + 1]
      if (nextSibling && nextSibling.type === "paragraph" && !nextSibling.text) {
        setFocusedIndex(idx + 1)
        focusLineAt(idx + 1, 0)
      } else {
        commitLiveBlocks((prev) => {
          const next = [...prev]
          next.splice(idx + 1, 0, {
            id: makeBlockId(),
            type: "paragraph",
            text: "",
          })
          return next
        })
        setFocusedIndex(idx + 1)
        focusLineAt(idx + 1, 0)
      }
      return
    }

    if (e.key === "Backspace" && e.currentTarget.value === "") {
      e.preventDefault()
      focusLineAt(idx, "end")
      return
    }

    if (e.key === "ArrowUp") {
      const selStart = e.currentTarget.selectionStart ?? 0
      if (!e.currentTarget.value.slice(0, selStart).includes("\n")) {
        e.preventDefault()
        focusLineAt(idx, selStart)
      }
      return
    }

    if (e.key === "ArrowDown") {
      const selEnd = e.currentTarget.selectionEnd ?? 0
      if (!e.currentTarget.value.slice(selEnd).includes("\n")) {
        let target = idx + 1
        while (
          target < liveBlocksRef.current.length &&
          liveBlocksRef.current[target]?.type === "table"
        ) {
          target++
        }
        if (target < liveBlocksRef.current.length) {
          e.preventDefault()
          setFocusedIndex(target)
          focusLineAt(target, 0)
        }
      }
      return
    }
  }

  /**
   * 키보드 이벤트 처리:
   * 1) Backspace (커서가 맨 앞 index 0일 때):
   *    - 현재 줄이 프리뷰 블록 상태라면 즉시 일반 텍스트(paragraph)로 되돌림
   *    - 일반 문단이고 이전 줄이 table이 아니면 윗줄과 병합
   * 2) Enter / Shift+Enter:
   *    - 토글 제목에서 Shift+Enter 시 토글 내부 본문 에디터로 진입
   *    - 일반 Enter 시 커서 위치 기준으로 아랫줄 블록 생성
   * 3) ArrowUp / ArrowDown:
   *    - 토글 내부 본문 및 위아래 텍스트 블록으로 부드럽게 포커스 이동
   */
  function handleLineKeyDown(
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    const el = e.currentTarget
    const selStart = el.selectionStart ?? 0
    const selEnd = el.selectionEnd ?? 0
    const block = liveBlocksRef.current[idx]
    if (!block) return

    if (e.key === "Backspace" && selStart === 0 && selEnd === 0) {
      // 1. 프리뷰 렌더링 중인 블록(인용구, 토글, 제목, 체크리스트, 리스트)이면 먼저 일반 문단으로 해제!
      if (block.type === "toggle") {
        e.preventDefault()
        if (block.toggleBody && block.toggleBody.trim().length > 0) {
          const childBlocks = markdownToLiveBlocks(block.toggleBody)
          commitLiveBlocks((prev) => {
            const next = [...prev]
            next.splice(
              idx,
              1,
              {
                ...block,
                type: "paragraph",
                checked: false,
                toggleBody: undefined,
                toggleOpen: undefined,
              },
              ...childBlocks
            )
            return next
          })
        } else {
          commitLiveBlocks((prev) =>
            prev.map((item, i) =>
              i === idx
                ? {
                    ...item,
                    type: "paragraph",
                    checked: false,
                    toggleBody: undefined,
                    toggleOpen: undefined,
                  }
                : item
            )
          )
        }
        focusLineAt(idx, 0)
        return
      }

      if (block.type !== "paragraph") {
        e.preventDefault()
        commitLiveBlocks((prev) =>
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

      // 2. 일반 문단이고 첫 번째 줄이 아니면 윗줄과 병합 (단, 윗줄이 표(table)일 때는 병합하지 않음)
      if (idx > 0) {
        const prevLine = liveBlocksRef.current[idx - 1]
        if (prevLine.type === "table") {
          return
        }
        if (
          prevLine.type === "toggle" &&
          prevLine.toggleBody &&
          prevLine.toggleBody.length > 0
        ) {
          e.preventDefault()
          const prevBody = prevLine.toggleBody
          const cursorOffset = prevBody.length
          commitLiveBlocks((prev) => {
            const next = [...prev]
            next[idx - 1] = {
              ...next[idx - 1],
              toggleOpen: true,
              toggleBody: `${prevBody}${block.text}`,
            }
            next.splice(idx, 1)
            return next
          })
          setFocusedIndex(idx - 1)
          focusToggleBodyAt(idx - 1, cursorOffset)
          return
        }
        e.preventDefault()
        const prevLen = prevLine.text.length
        commitLiveBlocks((prev) => {
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
      if (block.type === "toggle" && e.shiftKey) {
        const beforeCursor = block.text.slice(0, selStart)
        const afterCursor = block.text.slice(selEnd)
        const nextBody = afterCursor
          ? block.toggleBody
            ? `${afterCursor}\n${block.toggleBody}`
            : afterCursor
          : (block.toggleBody ?? "")
        commitLiveBlocks((prev) =>
          prev.map((item, i) =>
            i === idx
              ? {
                  ...item,
                  text: beforeCursor,
                  toggleOpen: true,
                  toggleBody: nextBody,
                }
              : item
          )
        )
        focusToggleBodyAt(idx, 0)
        return
      }

      if (block.type === "toggle") {
        if (
          block.text.trim() === "" &&
          !(block.toggleBody && block.toggleBody.trim())
        ) {
          commitLiveBlocks((prev) =>
            prev.map((item, i) =>
              i === idx
                ? {
                    ...item,
                    type: "paragraph",
                    toggleBody: undefined,
                    toggleOpen: undefined,
                  }
                : item
            )
          )
          focusLineAt(idx, 0)
          return
        }
      } else if (block.type !== "paragraph" && block.text.trim() === "") {
        commitLiveBlocks((prev) =>
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

      commitLiveBlocks((prev) => {
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
      let target = idx - 1
      while (target >= 0 && liveBlocksRef.current[target]?.type === "table") {
        target--
      }
      if (target >= 0) {
        e.preventDefault()
        setFocusedIndex(target)
        const targetBlock = liveBlocksRef.current[target]
        if (targetBlock?.type === "toggle" && targetBlock.toggleOpen !== false) {
          focusToggleBodyAt(target, "end")
        } else {
          focusLineAt(target, selStart)
        }
      }
      return
    }

    if (e.key === "ArrowDown") {
      if (block.type === "toggle" && block.toggleOpen !== false) {
        e.preventDefault()
        focusToggleBodyAt(idx, 0)
        return
      }
      if (idx < liveBlocksRef.current.length - 1) {
        let target = idx + 1
        while (
          target < liveBlocksRef.current.length &&
          liveBlocksRef.current[target]?.type === "table"
        ) {
          target++
        }
        if (target < liveBlocksRef.current.length) {
          e.preventDefault()
          setFocusedIndex(target)
          focusLineAt(target, selStart)
        }
      }
      return
    }
  }

  /**
   * 여러 줄 텍스트 붙여넣기(Ctrl+V) 시 각 줄의 마크다운 문법 및 표를 자동 파싱하여 블록으로 삽입
   */
  function handleLinePaste(
    idx: number,
    e: React.ClipboardEvent<HTMLInputElement>
  ) {
    const pasted = e.clipboardData.getData("text/plain")
    if (!pasted || !pasted.includes("\n")) return

    e.preventDefault()
    const parsedNewBlocks = markdownToLiveBlocks(pasted)

    commitLiveBlocks((prev) => {
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
    if (parsedNewBlocks[parsedNewBlocks.length - 1]?.type !== "table") {
      focusLineAt(targetIdx, "end")
    }
  }

  /**
   * 현재 포커스된 줄(또는 다음 줄)에 블록이나 마크다운 라인들을 삽입합니다.
   */
  function insertLinesAtFocused(rawLines: string[]) {
    const newBlocks = rawLines.map((l) => parseRawLineToLiveBlock(l))
    let nextFocusTarget = 0
    commitLiveBlocks((prev) => {
      const next = [...prev]
      const targetIdx = Math.min(Math.max(0, focusedIndex), next.length - 1)
      const current = next[targetIdx]
      if (current && !current.text.trim() && current.type === "paragraph") {
        next.splice(targetIdx, 1, ...newBlocks, {
          id: makeBlockId(),
          type: "paragraph",
          text: "",
        })
        nextFocusTarget = targetIdx + newBlocks.length
      } else {
        next.splice(targetIdx + 1, 0, ...newBlocks, {
          id: makeBlockId(),
          type: "paragraph",
          text: "",
        })
        nextFocusTarget = targetIdx + newBlocks.length + 1
      }
      return next
    })
    setFocusedIndex(nextFocusTarget)
    focusLineAt(nextFocusTarget, 0)
  }

  /**
   * 툴바에서 [표] 클릭 시 즉시 인라인 표 블록과 후행 빈 문단을 삽입합니다.
   */
  function insertTableAtFocused() {
    const tableId = makeBlockId()
    const tableBlock: LiveLineBlock = {
      id: tableId,
      type: "table",
      text: "",
      tableRows: [
        ["항목", "내용", "비고"],
        ["", "", ""],
        ["", "", ""],
      ],
    }
    const trailingParagraph: LiveLineBlock = {
      id: makeBlockId(),
      type: "paragraph",
      text: "",
    }

    setNewlyInsertedTableId(tableId)
    let nextTableIdx = 0
    commitLiveBlocks((prev) => {
      const next = [...prev]
      if (next.length === 0) {
        nextTableIdx = 0
        return [tableBlock, trailingParagraph]
      }
      const targetIdx = Math.min(Math.max(0, focusedIndex), next.length - 1)
      const current = next[targetIdx]
      if (current && current.type === "paragraph" && !current.text.trim()) {
        next.splice(targetIdx, 1, tableBlock, trailingParagraph)
        nextTableIdx = targetIdx
      } else {
        next.splice(targetIdx + 1, 0, tableBlock, trailingParagraph)
        nextTableIdx = targetIdx + 1
      }
      return next
    })
    setFocusedIndex(nextTableIdx)
  }

  function deleteBlockAt(idx: number) {
    commitLiveBlocks((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      if (next.length === 0) {
        return [{ id: makeBlockId(), type: "paragraph", text: "" }]
      }
      return next
    })
    const nextFocusIdx = Math.max(0, idx - 1)
    setFocusedIndex(nextFocusIdx)
    focusLineAt(nextFocusIdx, "end")
  }

  function applyQuickLineFormat(type: LineBlockType) {
    if (type === "table") {
      insertTableAtFocused()
      return
    }
    let nextFocusTarget = Math.max(0, focusedIndex)
    let cursorEnd = true
    commitLiveBlocks((prev) => {
      const targetIdx = Math.min(Math.max(0, focusedIndex), prev.length - 1)
      const current = prev[targetIdx]
      if (!current) return prev
      if (current.type === "table") {
        const newBlock: LiveLineBlock = {
          id: makeBlockId(),
          type,
          text: "",
          toggleOpen: true,
          toggleBody: type === "toggle" ? "" : undefined,
        }
        const next = [...prev]
        next.splice(targetIdx + 1, 0, newBlock)
        nextFocusTarget = targetIdx + 1
        cursorEnd = false
        return next
      }
      nextFocusTarget = targetIdx
      cursorEnd = true
      return prev.map((item, i) =>
        i === targetIdx
          ? {
              ...item,
              type: item.type === type ? "paragraph" : type,
              toggleOpen: true,
              toggleBody:
                type === "toggle" && item.type !== "toggle"
                  ? (item.toggleBody ?? "")
                  : item.toggleBody,
            }
          : item
      )
    })
    setFocusedIndex(nextFocusTarget)
    focusLineAt(nextFocusTarget, cursorEnd ? "end" : 0)
  }

  function moveBlockOrder(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= liveBlocksRef.current.length) return
    commitLiveBlocks((prev) => {
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
      {/* 1. 상단 네비게이션 바: [← Day N 일정 목록] + (기록·메모 탭일 때만 [편집 / 완료]) */}
      <div className="px-4 py-3 border-b border-[#E2E2DA] bg-[#FBFBF9] flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={onBackToList}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-200/60 text-xs sm:text-sm font-extrabold text-[#18181B] transition cursor-pointer"
        >
          <ArrowLeft className="size-4 text-[#1A9E7A]" />
          <span>Day {dayNumber} 일정 목록</span>
        </button>

        {currentTab === "diary" && (
          <div className="flex items-center gap-1.5">
            {isEditing && !readOnly ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setNewlyInsertedTableId(null)
                    resetHistory(markdownToLiveBlocks(combinedViewContent))
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
                  resetHistory(markdownToLiveBlocks(combinedViewContent))
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
        )}
      </div>

      {/* 2. 2-Tab Bar: 장소 정보 | 기록 · 메모 */}
      <div className="px-4 py-2 border-b border-[#E2E2DA] bg-[#FBFBF9] shrink-0">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F8F8F6] border border-[#E2E2DA] p-1">
          <button
            type="button"
            onClick={() => handleTabChange("info")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              currentTab === "info"
                ? "bg-white text-[#18181B] shadow-2xs border border-[#E2E2DA]/70"
                : "text-[#6B6B72] hover:text-[#18181B]"
            }`}
          >
            <Info className={`size-3.5 ${currentTab === "info" ? "text-[#1A9E7A]" : ""}`} />
            <span>장소 정보</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("diary")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              currentTab === "diary"
                ? "bg-white text-[#18181B] shadow-2xs border border-[#E2E2DA]/70"
                : "text-[#6B6B72] hover:text-[#18181B]"
            }`}
          >
            <FileText
              className={`size-3.5 ${currentTab === "diary" ? "text-[#1A9E7A]" : ""}`}
            />
            <span>기록 · 메모</span>
            {hasContent && (
              <span
                className="size-1.5 rounded-full bg-[#1A9E7A] shrink-0"
                aria-label="작성된 메모 있음"
              />
            )}
          </button>
        </div>
      </div>

      {/* 3. 탭 본문 */}
      {currentTab === "info" ? (
        /* ===============================================================
           TAB 1: 장소 정보
           =============================================================== */
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar flex flex-col justify-between gap-4">
          <div className="space-y-4">
            {/* 순서 + 장소명 + 카테고리 + 타임피커 */}
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

                  {/* 주소 + 원클릭 복사 버튼 */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <MapPin className="size-3.5 text-[#1A9E7A] shrink-0" />
                    <span className="text-xs font-semibold text-[#6B6B72] break-words min-w-0">
                      {place.address || "위치 미지정"}
                    </span>
                    {place.address && (
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        title="주소 복사"
                        aria-label="주소 복사"
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-[#E2E2DA] bg-[#F8F8F6] hover:bg-[#EDFAF4] hover:border-[#1A9E7A]/40 px-1.5 py-0.5 text-[10px] font-extrabold text-[#52525B] hover:text-[#1A9E7A] transition cursor-pointer"
                      >
                        {copiedAddress ? (
                          <Check className="size-3 text-[#1A9E7A]" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        <span>{copiedAddress ? "복사됨" : "복사"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

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

            {/* 찬반 투표 + Google Maps 외부 열기 */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {onVote ? (
                <div className="flex items-center gap-2">
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
              ) : (
                <div />
              )}

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E2DA] bg-[#FBFBF9] hover:border-[#1A9E7A] hover:bg-[#EDFAF4] text-xs font-extrabold text-[#18181B] hover:text-[#1A9E7A] transition"
              >
                <ExternalLink className="size-3.5 text-[#1A9E7A]" />
                <span>Google Maps에서 보기</span>
              </a>
            </div>

            {/* 구조화된 장소 요약 카드 */}
            <div className="rounded-2xl border border-[#E2E2DA] bg-[#FBFBF9] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#6B6B72]">방문 예정 시간</span>
                <span className="font-extrabold text-[#18181B] tabular-nums">
                  {draftTime}
                </span>
              </div>
              <div className="h-px bg-[#E2E2DA]/70" />
              <div className="flex items-start justify-between gap-3 text-xs">
                <span className="font-bold text-[#6B6B72] shrink-0">위치 / 주소</span>
                <span className="font-semibold text-[#18181B] text-right break-words">
                  {place.address || "위치 미지정"}
                </span>
              </div>
              <div className="h-px bg-[#E2E2DA]/70" />
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#6B6B72]">카테고리</span>
                <span className="px-2 py-0.5 rounded-md bg-[#EDFAF4] text-[#1A9E7A] font-extrabold">
                  {place.category}
                </span>
              </div>

              <div className="pt-2 border-t border-dashed border-[#E2E2DA] flex items-start gap-2 text-[11px] font-medium text-[#8A8A93] leading-relaxed">
                <Info className="size-3.5 text-[#1A9E7A] shrink-0 mt-0.5" />
                <span>
                  영업시간 · 구글 평점 · 사진 등 상세 데이터는 Google Places 연동으로 확장됩니다.
                </span>
              </div>
            </div>
          </div>

          {/* 하단 CTA: 기록 · 메모 탭으로 전환 */}
          <button
            type="button"
            onClick={() => handleTabChange("diary")}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] py-3 px-4 text-sm font-extrabold text-white shadow-xs transition cursor-pointer shrink-0"
          >
            <span>기록 · 메모 보기</span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      ) : (
        /* ===============================================================
           TAB 2: 기록 · 메모
           =============================================================== */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* 컴팩트 1줄 요약 스트립 */}
          <div className="px-4 py-2.5 border-b border-[#E2E2DA] bg-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1A9E7A] text-white text-xs font-extrabold">
                {place.order}
              </span>
              <h3 className="text-sm font-extrabold text-[#18181B] truncate">
                {place.name}
              </h3>
              <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#EDFAF4] text-[#1A9E7A] text-[11px] font-extrabold">
                {place.category}
              </span>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-[#6B6B72] tabular-nums">
              <Clock className="size-3 text-[#1A9E7A]" />
              {draftTime}
            </span>
          </div>

          {/* 메인 영역: 마크다운 노트 보기 / Obsidian 스타일 실시간 프리뷰 블록 에디터 */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
            {!isEditing ? (
              hasContent ? (
                <div
                  onClick={() => {
                    if (readOnly) {
                      showToast("로그인이 필요한 기능입니다.", "warning")
                      return
                    }
                    resetHistory(markdownToLiveBlocks(combinedViewContent))
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
                    resetHistory(markdownToLiveBlocks(combinedViewContent))
                    setIsEditing(true)
                    focusLineAt(0, "end")
                  }}
                  className="h-full min-h-[240px] rounded-2xl border border-dashed border-[#E2E2DA] hover:border-[#1A9E7A]/60 bg-[#FBFBF9] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition"
                >
                  <p className="text-sm font-extrabold text-[#52525B]">
                    아직 이 장소에 작성된 메모가 없어요
                  </p>
                  <p className="text-xs font-medium text-[#8A8A93] mt-1.5">
                    여기를 클릭해 자유롭게 기록해 보세요.
                  </p>
                </div>
              )
            ) : (
              /* 편집 모드: 타이핑 즉시 블록으로 렌더링되는 라이브 마크다운 에디터 */
              <div
                onKeyDownCapture={(e) => {
                  if (e.nativeEvent.isComposing || e.altKey) return
                  if (!(e.ctrlKey || e.metaKey)) return
                  const key = e.key.toLowerCase()
                  if (key === "z") {
                    e.preventDefault()
                    e.stopPropagation()
                    if (e.shiftKey) {
                      handleRedo()
                    } else {
                      handleUndo()
                    }
                  } else if (key === "y") {
                    e.preventDefault()
                    e.stopPropagation()
                    handleRedo()
                  }
                }}
                className="flex flex-col h-full min-h-[320px] space-y-2.5"
              >
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
                      onClick={() => applyQuickLineFormat("toggle")}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 text-xs font-bold text-[#52525B] hover:text-[#18181B] transition cursor-pointer"
                      title="토글 (>> + 스페이스)"
                    >
                      <ChevronRight className="size-3.5" />
                      <span>토글</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyQuickLineFormat("todo")}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 text-xs font-bold text-[#52525B] hover:text-[#18181B] transition cursor-pointer"
                      title="체크리스트 (- [ ] + 스페이스)"
                    >
                      <CheckSquare className="size-3.5" />
                      <span>체크</span>
                    </button>

                    <button
                      type="button"
                      onClick={insertTableAtFocused}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 text-xs font-bold text-[#52525B] hover:text-[#18181B] transition cursor-pointer"
                      title="인라인 표 삽입"
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

                {/* 실시간 마크다운 블록 에디터 본체 */}
                <div
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      const lastIdx = liveBlocks.length - 1
                      const lastBlock = liveBlocks[lastIdx]
                      if (
                        !lastBlock ||
                        lastBlock.type === "table" ||
                        lastBlock.type === "toggle"
                      ) {
                        const newPara: LiveLineBlock = {
                          id: makeBlockId(),
                          type: "paragraph",
                          text: "",
                        }
                        const targetIdx = liveBlocks.length
                        commitLiveBlocks((prev) => [...prev, newPara])
                        setFocusedIndex(targetIdx)
                        focusLineAt(targetIdx, 0)
                      } else {
                        focusLineAt(lastIdx, "end")
                      }
                    }
                  }}
                  className="flex-1 w-full min-h-[260px] rounded-2xl border border-[#E2E2DA] bg-[#FBFBF9] focus-within:bg-white focus-within:border-[#1A9E7A] p-3.5 space-y-1.5 overflow-y-auto custom-scrollbar cursor-text transition"
                >
                  {liveBlocks.map((block, idx) => {
                    if (block.type === "table") {
                      return (
                        <ObsidianTableBlock
                          key={block.id}
                          blockId={block.id}
                          rows={block.tableRows || [["항목", "내용", "비고"], ["", "", ""]]}
                          autoFocusCell={newlyInsertedTableId === block.id}
                          onConsumeAutoFocus={() => setNewlyInsertedTableId(null)}
                          onFocusTable={() => setFocusedIndex(idx)}
                          onChangeRows={(nextRows, meta) => {
                            commitLiveBlocks(
                              (prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, tableRows: nextRows } : item
                                ),
                              meta
                            )
                          }}
                          onDeleteTable={() => deleteBlockAt(idx)}
                        />
                      )
                    }

                    const imgMatch = block.text
                      .trim()
                      .match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/)

                    return (
                      <div key={block.id} className="group/line space-y-1.5">
                        {/* 1) 인용구 실시간 프리뷰 렌더링 */}
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
                              placeholder="인용구"
                              className="w-full bg-transparent text-sm sm:text-[15px] font-bold text-[#18181B] placeholder:text-[#8A8A93] outline-none"
                            />
                          </div>
                        ) : block.type === "toggle" ? (
                          /* 2) 토글 실시간 프리뷰 렌더링 (접기/펼치기 가능한 본문 블록 포함) */
                          <div className="rounded-xl border border-[#E2E2DA] bg-white px-2.5 py-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label={
                                  block.toggleOpen !== false
                                    ? "토글 접기"
                                    : "토글 펼치기"
                                }
                                onClick={() =>
                                  commitLiveBlocks((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            toggleOpen: !(item.toggleOpen ?? true),
                                          }
                                        : item
                                    )
                                  )
                                }
                                className="text-[#1A9E7A] p-0.5 cursor-pointer shrink-0"
                              >
                                {block.toggleOpen !== false ? (
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
                                placeholder="토글 제목"
                                className="w-full bg-transparent text-sm font-extrabold text-[#18181B] placeholder:text-[#8A8A93] outline-none"
                              />
                            </div>
                            {block.toggleOpen !== false && (
                              <div className="mt-1.5 ml-2 pl-4 border-l-2 border-[#E2E2DA]">
                                <ToggleBodyTextarea
                                  value={block.toggleBody ?? ""}
                                  inputRef={(el) => {
                                    toggleBodyRefs.current[idx] = el
                                  }}
                                  onFocus={() => setFocusedIndex(idx)}
                                  onChange={(val) =>
                                    handleToggleBodyChange(idx, val)
                                  }
                                  onKeyDown={(e) => handleToggleBodyKeyDown(idx, e)}
                                />
                              </div>
                            )}
                          </div>
                        ) : block.type === "h1" ||
                          block.type === "h2" ||
                          block.type === "h3" ||
                          block.type === "h4" ? (
                          /* 3) 제목 1~4 실시간 프리뷰 렌더링 */
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
                              placeholder="제목"
                              className={`w-full bg-transparent text-[#18181B] placeholder:text-[#9CA3AF] outline-none ${
                                block.type === "h1"
                                  ? "text-2xl font-black tracking-tight leading-tight"
                                  : block.type === "h2"
                                    ? "text-xl font-extrabold tracking-tight leading-snug"
                                    : block.type === "h3"
                                      ? "text-lg font-extrabold leading-snug"
                                      : "text-[15px] font-extrabold text-[#27272A] leading-snug"
                              }`}
                            />
                          </div>
                        ) : block.type === "todo" ? (
                          /* 4) 체크리스트 실시간 프리뷰 렌더링 */
                          <div className="flex items-center gap-2.5 py-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                commitLiveBlocks((prev) =>
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
                              placeholder="할 일"
                              className={`w-full bg-transparent text-sm font-medium outline-none ${
                                block.checked
                                  ? "line-through text-[#8A8A93]"
                                  : "text-[#18181B]"
                              }`}
                            />
                          </div>
                        ) : block.type === "bullet" ? (
                          /* 5) 글머리 기호 실시간 프리뷰 렌더링 */
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
                              placeholder="항목"
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
                                    ? "메모를 작성해 보세요"
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
        </div>
      )}

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
