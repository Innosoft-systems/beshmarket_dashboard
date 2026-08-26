"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getUploadToken } from "@/lib/actions/upload"
import { IMAGE_ACCEPT, uploadErrorMessage, validateImageFile } from "@/lib/upload"

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
  const abortRef = useRef<AbortController | null>(null)

  // Abort any in-flight upload on unmount
  useEffect(() => () => { abortRef.current?.abort() }, [])

  const handleFile = async (file: File) => {
    const invalid = validateImageFile(file)
    if (invalid) {
      toast.error(invalid)
      return
    }

    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const token = await getUploadToken()
      if (!token) {
        toast.error("Avtorizatsiya muddati tugagan. Qayta login qiling.")
        setPreview(value || null)
        setUploading(false)
        return
      }

      const formData = new FormData()
      formData.append("file", file)

      abortRef.current?.abort()
      abortRef.current = new AbortController()

      const res = await fetch(`${API_URL}/api/v1/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(await uploadErrorMessage(res))

      const json = await res.json()
      const url = json?.data?.url ?? json?.url
      onChange(url)
      setPreview(url)
      toast.success("Rasm yuklandi")
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return
      toast.error(err instanceof Error ? err.message : "Rasm yuklashda xatolik yuz berdi")
      setPreview(value || null)
      if (inputRef.current) inputRef.current.value = ""
    } finally {
      setUploading(false)
    }
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
        accept={IMAGE_ACCEPT}
        className="hidden"
        onClick={(e) => { (e.target as HTMLInputElement).value = "" }}
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
