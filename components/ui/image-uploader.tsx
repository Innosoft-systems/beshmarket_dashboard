"use client"

import { useState, useRef } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { uploadImageAction } from "@/lib/actions/upload"

interface ImageUploaderProps {
  value?: string
  onChange: (url: string) => void
  className?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export function ImageUploader({ value, onChange, className }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Rasm hajmi 5MB dan oshmasligi kerak")
      return
    }

    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      toast.error("Faqat JPEG, PNG, WebP yoki GIF formatlar")
      return
    }

    setPreview(URL.createObjectURL(file))
    setUploading(true)

    const formData = new FormData()
    formData.append("file", file)

    const result = await uploadImageAction(formData)

    if (result.success) {
      onChange(result.url)
      setPreview(result.url)
      toast.success("Rasm yuklandi")
    } else {
      toast.error(result.error || "Rasm yuklashda xatolik")
      setPreview(value || null)
    }

    setUploading(false)
  }

  const handleRemove = () => {
    setPreview(null)
    onChange("")
    if (inputRef.current) inputRef.current.value = ""
  }

  const imgSrc = preview?.startsWith("blob:") ? preview : preview ? `${API_URL}${preview}` : null

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {imgSrc ? (
        <div className="relative w-full h-32 rounded-lg border overflow-hidden group">
          <img src={imgSrc} alt="Preview" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          <Upload className="h-6 w-6" />
          <span className="text-sm">Rasm yuklash</span>
        </button>
      )}
    </div>
  )
}
