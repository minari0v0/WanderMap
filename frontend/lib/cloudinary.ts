const DEFAULT_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "wblqcogo"
const DEFAULT_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "wandermap_uploads"

/**
 * 이미지 파일 또는 DataURL을 HTML5 Canvas를 사용해 지정된 최대 해상도 이하의 WebP DataURL로 경량화합니다.
 */
export async function compressImageToWebpDataUrl(
  source: File | string,
  maxDimension = 1600,
  quality = 0.82
): Promise<string> {
  const dataUrl =
    typeof source === "string"
      ? source
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error("이미지 파일을 읽을 수 없습니다."))
          reader.readAsDataURL(source)
        })

  if (typeof window === "undefined") {
    return dataUrl
  }

  return new Promise<string>((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, width)
      canvas.height = Math.max(1, height)
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(dataUrl)
        return
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const compressed = canvas.toDataURL("image/webp", quality)
      resolve(compressed)
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/**
 * 이미지를 WebP로 경량화한 뒤 Cloudinary에 업로드하고 영구 URL(secure_url)을 반환합니다.
 * 네트워크 오류 등으로 업로드에 실패할 경우 경량화된 DataURL을 폴백으로 반환합니다.
 */
export async function uploadImageToCloudinary(
  source: File | string,
  options?: {
    maxDimension?: number
    quality?: number
  }
): Promise<string> {
  const compressedDataUrl = await compressImageToWebpDataUrl(
    source,
    options?.maxDimension ?? 1600,
    options?.quality ?? 0.82
  )

  const cloudName = DEFAULT_CLOUD_NAME.trim()
  const uploadPreset = DEFAULT_UPLOAD_PRESET.trim()

  if (!cloudName || !uploadPreset) {
    return compressedDataUrl
  }

  try {
    const formData = new FormData()
    formData.append("file", compressedDataUrl)
    formData.append("upload_preset", uploadPreset)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error(`Cloudinary 업로드 실패 (${response.status})`)
    }

    const result = await response.json()
    if (result && typeof result.secure_url === "string") {
      return result.secure_url
    }
    return compressedDataUrl
  } catch (err) {
    console.warn("Cloudinary 업로드 폴백 처리:", err)
    return compressedDataUrl
  }
}

