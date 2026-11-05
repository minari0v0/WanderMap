"use client"

import React from "react"
import {
  getProfileBgClass,
  isCustomImageAvatar,
  getProfileEmoji,
} from "@/lib/auth-service"

export interface UserAvatarProps {
  profileImage?: string | null
  nickname?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  onClick?: () => void
  title?: string
}

const SIZE_CLASSES: Record<
  NonNullable<UserAvatarProps["size"]>,
  { box: string; emoji: string }
> = {
  sm: { box: "size-10", emoji: "text-[22px]" },
  md: { box: "size-12", emoji: "text-[26px]" },
  lg: { box: "size-16", emoji: "text-[34px]" },
  xl: { box: "size-24", emoji: "text-[52px]" },
}

export function UserAvatar({
  profileImage,
  nickname = "여행가",
  size = "md",
  className = "",
  onClick,
  title,
}: UserAvatarProps) {
  const isCustomImg = isCustomImageAvatar(profileImage)
  const bgClass = getProfileBgClass(profileImage)
  const emoji = getProfileEmoji(profileImage)
  const { box, emoji: emojiClass } = SIZE_CLASSES[size]

  return (
    <div
      onClick={onClick}
      title={title}
      className={`rounded-full overflow-hidden flex items-center justify-center shrink-0 select-none transition-colors duration-200 ${box} ${bgClass} ${className}`}
    >
      {isCustomImg && profileImage ? (
        <img
          src={profileImage}
          alt={nickname}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className={`${emojiClass} leading-none translate-y-[1px]`}>
          {emoji}
        </span>
      )}
    </div>
  )
}

