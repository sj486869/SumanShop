"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  preview?: string
  onRemove?: () => void
}

export function FileUpload({ onFileSelect, preview, onRemove }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      onFileSelect(file)
    }
  }

  return (
    <div className="space-y-4">
      {preview ? (
        <Card className="relative overflow-hidden">
          <div className="aspect-video relative bg-muted">
            <img src={preview || "/placeholder.svg"} alt="Payment proof" className="w-full h-full object-contain" />
          </div>
          {onRemove && (
            <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </Card>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={handleChange} />
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Upload Payment Proof</p>
              <p className="text-sm text-muted-foreground">Drag and drop or click to select an image</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
