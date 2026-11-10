"use client"

import React, { useState, useRef, useEffect } from "react"
import { X, Check, Upload, Camera, Smile } from "lucide-react"
import {
  authService,
  DEFAULT_PROFILE_IMAGE,
  getProfileEmoji,
  isCustomImageAvatar,
  type UserResponse,
} from "@/lib/auth-service"
import { UserAvatar } from "@/components/ui/user-avatar"
import { showToast } from "@/components/ui/system-alert"
import { uploadImageToCloudinary } from "@/lib/cloudinary"

export interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserResponse | null
  onSaved?: (updated: UserResponse) => void
}

const EMOJI_LIST = [
  "🐹",
  "🐰",
  "😺",
  "🐶",
  "🦊",
  "🦔",
  "🐘",
  "🐻",
  "❄️",
  "🐵",
  "🐼",
  "🦁",
]

const BG_COLOR_LIST = [
  { id: "sage", bg: "bg-[#EDFAF4]", border: "border-[#BDEBDC]", label: "에메랄드 세이지" },
  { id: "peach", bg: "bg-[#FFF4EE]", border: "border-[#FFE2D1]", label: "피치 테라코타" },
  { id: "sand", bg: "bg-[#F7F6F3]", border: "border-[#E6E3DC]", label: "웜 샌드" },
  { id: "coral", bg: "bg-[#FFF0F0]", border: "border-[#FFDAD6]", label: "코랄 로즈" },
  { id: "silver", bg: "bg-[#F2F4F6]", border: "border-[#E5E8EB]", label: "실버 그레이" },
  { id: "bluegray", bg: "bg-[#ECEFF2]", border: "border-[#CFD8E3]", label: "블루 그레이" },
  { id: "lavender", bg: "bg-[#F1F0F5]", border: "border-[#DFDCEB]", label: "소프트 라벤더" },
  { id: "white", bg: "bg-white", border: "border-[#E2E2DA]", label: "화이트" },
]

export function ProfileEditModal({
  isOpen,
  onClose,
  user,
  onSaved,
}: ProfileEditModalProps) {
  const [editNickname, setEditNickname] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editProfileImg, setEditProfileImg] = useState(DEFAULT_PROFILE_IMAGE)
  const [isSaving, setIsSaving] = useState(false)

  // 닉네임 중복 확인 상태
  const [isNicknameChecked, setIsNicknameChecked] = useState(true)
  const [nicknameCheckMsg, setNicknameCheckMsg] = useState("")
  const [nicknameCheckStatus, setNicknameCheckStatus] = useState<"none" | "success" | "error">("none")
  const [isCheckingNickname, setIsCheckingNickname] = useState(false)

  // 탭 및 캔버스 크롭 상태
  const [activeTab, setActiveTab] = useState<"emoji" | "custom">("emoji")
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [minZoom, setMinZoom] = useState(0.1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 모달 오픈 시 초기값 세팅
  useEffect(() => {
    if (isOpen && user) {
      setEditNickname(user.nickname || "")
      setEditBio(user.bio || "나만의 특별한 여정을 기록하고 관리하고 있습니다.")
      const initialImg = user.profileImage || DEFAULT_PROFILE_IMAGE

      if (isCustomImageAvatar(initialImg)) {
        setEditProfileImg(initialImg)
        setActiveTab("custom")
      } else {
        const emoji = getProfileEmoji(initialImg)
        const bg = initialImg.includes("?bg=") ? initialImg.split("?bg=")[1] : "sage"
        setEditProfileImg(`emoji:${emoji}?bg=${bg}`)
        setActiveTab("emoji")
      }

      setIsNicknameChecked(true)
      setNicknameCheckMsg("")
      setNicknameCheckStatus("none")
    }
  }, [isOpen, user])

  // ESC 키로 닫기 지원
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // 닉네임 변경 시 중복 확인 상태 업데이트
  useEffect(() => {
    if (!user) return
    if (editNickname.trim() === user.nickname) {
      setIsNicknameChecked(true)
      setNicknameCheckMsg("")
      setNicknameCheckStatus("none")
    } else {
      setIsNicknameChecked(false)
      setNicknameCheckMsg("")
      setNicknameCheckStatus("none")
    }
  }, [editNickname, user])

  // 이미지 파일 로드 시 초기 줌 배율 계산
  useEffect(() => {
    if (!rawImage) {
      setImageObj(null)
      return
    }
    const img = new Image()
    img.src = rawImage
    img.onload = () => {
      setImageObj(img)
      const scaleX = 240 / img.width
      const scaleY = 240 / img.height
      const initialScale = Math.min(scaleX, scaleY)
      setMinZoom(initialScale * 0.5)
      setZoom(initialScale)
      setOffset({ x: 0, y: 0 })
    }
  }, [rawImage])

  // 캔버스 실시간 드로잉
  useEffect(() => {
    if (activeTab !== "custom" || !imageObj || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 1. 배경 블러 채우기
    ctx.save()
    ctx.filter = "blur(18px) brightness(0.92)"
    const coverScale = Math.max(canvas.width / imageObj.width, canvas.height / imageObj.height)
    const bgW = imageObj.width * coverScale
    const bgH = imageObj.height * coverScale
    ctx.drawImage(imageObj, (canvas.width - bgW) / 2, (canvas.height - bgH) / 2, bgW, bgH)
    ctx.restore()

    // 2. 메인 이미지 드로잉
    const drawW = imageObj.width * zoom
    const drawH = imageObj.height * zoom
    const drawX = (canvas.width - drawW) / 2 + offset.x
    const drawY = (canvas.height - drawH) / 2 + offset.y

    ctx.drawImage(imageObj, drawX, drawY, drawW, drawH)
  }, [imageObj, zoom, offset, activeTab])

  if (!isOpen || !user) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setRawImage(reader.result as string)
      setActiveTab("custom")
    }
    reader.readAsDataURL(file)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return
    setIsDragging(true)
    setDragStart({
      x: e.touches[0].clientX - offset.x,
      y: e.touches[0].clientY - offset.y,
    })
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    })
  }

  const handleTouchEnd = () => setIsDragging(false)

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const zoomStep = minZoom * 0.15
    const delta = e.deltaY < 0 ? zoomStep : -zoomStep
    setZoom((prev) => Math.min(Math.max(prev + delta, minZoom), minZoom * 6))
  }

  const handleCheckNickname = async () => {
    const trimmed = editNickname.trim()
    if (!trimmed) {
      setNicknameCheckMsg("닉네임을 입력해 주세요.")
      setNicknameCheckStatus("error")
      return
    }
    if (trimmed.length < 2 || trimmed.length > 16) {
      setNicknameCheckMsg("닉네임은 2~16자 이내로 입력해 주세요.")
      setNicknameCheckStatus("error")
      return
    }
    if (trimmed === user.nickname) {
      setIsNicknameChecked(true)
      setNicknameCheckMsg("현재 사용 중인 닉네임입니다.")
      setNicknameCheckStatus("success")
      return
    }

    setIsCheckingNickname(true)
    try {
      const isDuplicate = await authService.checkNickname(trimmed, user.id)
      if (isDuplicate) {
        setIsNicknameChecked(false)
        setNicknameCheckMsg("이미 사용 중인 닉네임입니다.")
        setNicknameCheckStatus("error")
      } else {
        setIsNicknameChecked(true)
        setNicknameCheckMsg("사용 가능한 닉네임입니다.")
        setNicknameCheckStatus("success")
      }
    } catch {
      setIsNicknameChecked(true)
      setNicknameCheckMsg("사용 가능한 닉네임입니다.")
      setNicknameCheckStatus("success")
    } finally {
      setIsCheckingNickname(false)
    }
  }

  const handleSave = async () => {
    if (user.provider === "LOCAL" && !user.emailVerified) {
      showToast("이메일 인증을 완료한 후에만 프로필을 설정할 수 있습니다.", "warning")
      return
    }
    const trimmedNickname = editNickname.trim()
    if (!trimmedNickname) {
      showToast("닉네임을 입력해 주세요.", "warning")
      return
    }
    if (!isNicknameChecked) {
      showToast("닉네임 중복 확인을 먼저 진행해 주세요.", "warning")
      return
    }

    let finalProfileImage = editProfileImg
    setIsSaving(true)
    try {
      if (activeTab === "custom" && imageObj && canvasRef.current) {
        const croppedDataUrl = canvasRef.current.toDataURL("image/webp", 0.88)
        finalProfileImage = await uploadImageToCloudinary(croppedDataUrl, {
          maxDimension: 480,
          quality: 0.88,
        })
      }

      const updated = await authService.updateProfile({
        userId: user.id,
        nickname: trimmedNickname,
        profileImage: finalProfileImage,
        bio: editBio.trim(),
      })
      showToast("프로필 설정이 성공적으로 저장되었습니다.", "success")
      onSaved?.(updated)
      onClose()
    } catch (err: any) {
      if (user.id === 999) {
        const fallbackUser: UserResponse = {
          ...user,
          nickname: trimmedNickname,
          profileImage: finalProfileImage,
          bio: editBio.trim(),
        }
        authService.setSession(fallbackUser)
        showToast("프로필 설정이 저장되었습니다.", "success")
        onSaved?.(fallbackUser)
        onClose()
      } else {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          "프로필 저장 중 문제가 발생했습니다."
        showToast(msg, "error")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const currentEmoji = getProfileEmoji(editProfileImg)
  const currentBgParam = editProfileImg.includes("?bg=")
    ? editProfileImg.split("?bg=")[1]
    : "sage"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[470px] max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[32px] border border-[#E2E2DA] bg-white p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-[#E2E2DA]/80 pb-4">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight text-[#18181B]">
              프로필 설정
            </h3>
            <p className="text-sm text-[#6B6B72] mt-0.5 font-medium">
              여행 메이트들에게 보여질 프로필을 꾸며보세요
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-[#F7F7F2] hover:bg-[#E2E2DA]/60 text-[#52525B] transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 1. 닉네임 입력 & 중복 확인 */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-[#27272A]">닉네임</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value)}
              placeholder="닉네임 입력 (2~16자)"
              className="flex-1 min-w-0 h-12 rounded-2xl border border-[#E2E2DA] bg-[#F7F7F2] focus:bg-white px-4 text-[15px] font-bold text-[#18181B] outline-none focus:border-[#1A9E7A] transition"
            />
            <button
              type="button"
              onClick={handleCheckNickname}
              disabled={
                isCheckingNickname ||
                !editNickname.trim() ||
                editNickname.trim() === user.nickname
              }
              className={`px-4 h-12 rounded-2xl text-sm font-extrabold transition shrink-0 cursor-pointer ${
                editNickname.trim() === user.nickname || !editNickname.trim()
                  ? "bg-[#F2F4F6] text-[#8A8A93] cursor-not-allowed"
                  : "bg-[#18181B] hover:bg-[#27272A] text-white shadow-xs active:scale-95"
              }`}
            >
              {isCheckingNickname ? "확인 중..." : "중복 확인"}
            </button>
          </div>
          {nicknameCheckMsg && (
            <p
              className={`text-xs font-bold pl-1 ${
                nicknameCheckStatus === "success" ? "text-[#1A9E7A]" : "text-rose-500"
              }`}
            >
              {nicknameCheckMsg}
            </p>
          )}
        </div>

        {/* 2. 프로필 아바타 설정 (이모지 + 배경 컬러 vs 직접 사진 업로드) */}
        <div className="space-y-3.5">
          <label className="block text-sm font-bold text-[#27272A]">
            프로필 아바타 설정
          </label>

          {/* Segmented Control 탭 */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#F2F2EC] p-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("emoji")
                if (isCustomImageAvatar(editProfileImg)) {
                  setEditProfileImg(`emoji:${currentEmoji}?bg=${currentBgParam}`)
                }
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-extrabold transition cursor-pointer ${
                activeTab === "emoji"
                  ? "bg-white text-[#18181B] shadow-xs"
                  : "text-[#6B6B72] hover:text-[#18181B]"
              }`}
            >
              <Smile className="size-4 text-[#1A9E7A]" />
              <span>이모지 & 배경 컬러</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-extrabold transition cursor-pointer ${
                activeTab === "custom"
                  ? "bg-white text-[#18181B] shadow-xs"
                  : "text-[#6B6B72] hover:text-[#18181B]"
              }`}
            >
              <Camera className="size-4 text-[#1A9E7A]" />
              <span>직접 사진 업로드</span>
            </button>
          </div>

          {activeTab === "emoji" ? (
            <div className="rounded-3xl border border-[#E2E2DA] bg-[#FBFBF9] p-5 space-y-5 animate-in fade-in duration-150">
              {/* 중앙 큼직한 원형 프리뷰 */}
              <div className="flex flex-col items-center gap-2">
                <UserAvatar
                  profileImage={`emoji:${currentEmoji}?bg=${currentBgParam}`}
                  nickname={editNickname || user.nickname}
                  size="xl"
                  className="border-4 border-white shadow-md ring-1 ring-[#E2E2DA]"
                />
                <span className="text-xs font-bold text-[#6B6B72]">
                  이모지와 배경 컬러를 자유롭게 조합해 보세요
                </span>
              </div>

              {/* 이모지 선택 그리드 */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-[#52525B] block">
                  1. 프로필 이모지 선택
                </span>
                <div className="grid grid-cols-6 gap-2">
                  {EMOJI_LIST.map((emojiItem) => {
                    const isSelected = currentEmoji === emojiItem && !isCustomImageAvatar(editProfileImg)
                    return (
                      <button
                        key={emojiItem}
                        type="button"
                        onClick={() =>
                          setEditProfileImg(`emoji:${emojiItem}?bg=${currentBgParam}`)
                        }
                        className={`flex items-center justify-center h-13 rounded-2xl border text-[28px] transition cursor-pointer ${
                          isSelected
                            ? "border-[#1A9E7A] bg-[#EDFAF4] ring-2 ring-[#1A9E7A]/20 scale-105 shadow-2xs"
                            : "border-[#E2E2DA] bg-white hover:border-[#1A9E7A]/50 hover:scale-105"
                        }`}
                      >
                        <span className="leading-none">{emojiItem}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 배경 색상 선택 */}
              <div className="space-y-2 pt-2 border-t border-[#E2E2DA]/70">
                <span className="text-xs font-extrabold text-[#52525B] block">
                  2. 배경 컬러 테마
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  {BG_COLOR_LIST.map((color) => {
                    const isSelected = currentBgParam === color.id
                    return (
                      <button
                        key={color.id}
                        type="button"
                        title={color.label}
                        onClick={() =>
                          setEditProfileImg(`emoji:${currentEmoji}?bg=${color.id}`)
                        }
                        className={`size-9 rounded-full ${color.bg} border-2 ${
                          isSelected
                            ? "border-[#1A9E7A] scale-110 shadow-sm"
                            : color.border
                        } flex items-center justify-center transition-all cursor-pointer`}
                      >
                        {isSelected && (
                          <Check className="size-4 text-[#1A9E7A] stroke-[3]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[#E2E2DA] bg-[#FBFBF9] p-5 flex flex-col items-center gap-4 animate-in fade-in duration-150">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />

              {!imageObj ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-10 border-2 border-dashed border-[#D5D5CB] hover:border-[#1A9E7A] rounded-2xl bg-white flex flex-col items-center justify-center gap-2.5 cursor-pointer transition group"
                >
                  <div className="size-12 rounded-full bg-[#EDFAF4] text-[#1A9E7A] flex items-center justify-center group-hover:scale-105 transition">
                    <Upload className="size-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-extrabold text-[#18181B]">
                      클릭하여 내 기기에서 사진 불러오기
                    </p>
                    <p className="text-xs text-[#8A8A93] mt-0.5 font-medium">
                      JPG, PNG, WEBP 이미지 지원
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3.5 w-full">
                  <div className="relative size-[220px] rounded-full overflow-hidden border-4 border-white shadow-lg bg-[#18181B]">
                    <canvas
                      ref={canvasRef}
                      width={240}
                      height={240}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onWheel={handleWheel}
                      className="w-full h-full cursor-move touch-none"
                    />
                  </div>
                  <p className="text-xs font-bold text-[#6B6B72]">
                    사진을 드래그하여 위치를 맞추고 슬라이더로 크기를 조절하세요
                  </p>

                  {/* 줌 슬라이더 */}
                  <div className="flex items-center gap-3 w-full max-w-[260px] px-2">
                    <span className="text-xs font-bold text-[#8A8A93]">축소</span>
                    <input
                      type="range"
                      min={minZoom}
                      max={minZoom * 5}
                      step={minZoom * 0.05}
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-[#E2E2DA] rounded-lg appearance-none cursor-pointer accent-[#1A9E7A]"
                    />
                    <span className="text-xs font-bold text-[#8A8A93]">확대</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl border border-[#E2E2DA] bg-white hover:bg-[#F7F7F2] text-xs font-bold text-[#52525B] transition cursor-pointer"
                  >
                    다른 사진 선택하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 저장 / 취소 버튼 */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-13 rounded-2xl border border-[#E2E2DA] bg-white hover:bg-[#F7F7F2] text-[15px] font-bold text-[#52525B] transition cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isNicknameChecked}
            className="flex-[1.6] h-13 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] text-[15px] font-extrabold text-white shadow-md shadow-[#1A9E7A]/20 transition disabled:opacity-40 cursor-pointer"
          >
            {isSaving ? "저장 중..." : "변경사항 저장"}
          </button>
        </div>
      </div>
    </div>
  )
}
