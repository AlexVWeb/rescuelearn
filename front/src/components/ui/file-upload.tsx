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

export function FileUpload({ onFileSelect, accept, maxSize = 5 * 1024 * 1024, className, currentFileUrl }: FileUploadProps) {
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

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
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
                    "border-2 border-dashed rounded-lg p-8 transition-colors hover:bg-muted/50 cursor-pointer flex flex-col items-center justify-center text-center gap-2",
                    isDragActive ? "border-primary bg-muted/50" : "border-muted-foreground/25",
                    isDragReject ? "border-destructive/50 bg-destructive/10" : ""
                )}
            >
                <input {...getInputProps()} />

                {file ? (
                    <div className="flex items-center gap-4 bg-background border rounded-md p-4 w-full relative group">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <File className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 text-left truncate">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={removeFile}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="bg-primary/10 p-4 rounded-full mb-2">
                            <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium">
                            {isDragActive
                                ? "Drop the file here"
                                : "Drag & drop file here, or click to select"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            PDF files only. Max 5MB.
                        </p>
                    </>
                )}
            </div>

            {/* Show current file if existing and no new file selected */}
            {!file && currentFileUrl && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <File className="h-4 w-4" />
                    <span>Current file: </span>
                    <a href={`/${currentFileUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px]">
                        {currentFileUrl.split('/').pop()}
                    </a>
                </div>
            )}
        </div>
    );
}
