"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: Record<string, string[]>;
  maxSize?: number; // in bytes
  className?: string;
  currentFileUrl?: string;
}

export function FileUpload({
  onFileSelect,
  accept,
  maxSize = 5 * 1024 * 1024,
  className,
  currentFileUrl,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles?.length > 0) {
        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);
        onFileSelect(selectedFile);
      }
    },
    [onFileSelect]
  );

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    onFileSelect(null);
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      maxSize,
      multiple: false,
    });

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive
            ? "border-primary bg-muted/50"
            : "border-muted-foreground/25",
          isDragReject ? "border-destructive/50 bg-destructive/10" : ""
        )}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="bg-background group relative flex w-full items-center gap-4 rounded-md border p-4">
            <div className="bg-primary/10 rounded-full p-2">
              <File className="text-primary h-6 w-6" />
            </div>
            <div className="flex-1 truncate text-left">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-muted-foreground text-xs">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              onClick={removeFile}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-primary/10 mb-2 rounded-full p-4">
              <Upload className="text-primary h-6 w-6" />
            </div>
            <p className="text-sm font-medium">
              {isDragActive
                ? "Drop the file here"
                : "Drag & drop file here, or click to select"}
            </p>
            <p className="text-muted-foreground text-xs">
              PDF files only. Max 5MB.
            </p>
          </>
        )}
      </div>

      {/* Show current file if existing and no new file selected */}
      {!file && currentFileUrl && (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <File className="h-4 w-4" />
          <span>Current file: </span>
          <a
            href={`/${currentFileUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary max-w-[200px] truncate hover:underline"
          >
            {currentFileUrl.split("/").pop()}
          </a>
        </div>
      )}
    </div>
  );
}
