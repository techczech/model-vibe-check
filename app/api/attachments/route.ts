import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { generateId } from "@/lib/utils";
import type { Attachment } from "@/lib/types";

const ATTACHMENTS_DIR = path.join(process.cwd(), "attachments");
const ATTACHMENTS_ROOT = path.resolve(ATTACHMENTS_DIR);

function resolveAttachmentPath(filePath: string): string | null {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const relativePath = path.relative(ATTACHMENTS_ROOT, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }
  return absolutePath;
}

// Ensure attachment directories exist
async function ensureAttachmentDirs() {
  await fs.mkdir(path.join(ATTACHMENTS_DIR, "text"), { recursive: true });
  await fs.mkdir(path.join(ATTACHMENTS_DIR, "images"), { recursive: true });
}

// Determine attachment type from MIME type
function getAttachmentType(mimeType: string): Attachment["type"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("msword") ||
    mimeType.includes("spreadsheet")
  ) {
    return "document";
  }
  return "text";
}

// Get subdirectory for attachment type
function getSubdir(type: Attachment["type"]): string {
  if (type === "image") return "images";
  return "text";
}

export async function POST(request: Request) {
  try {
    await ensureAttachmentDirs();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = path.extname(file.name) || ".txt";
    const id = generateId();
    const filename = `${id}${ext}`;

    // Determine type and path
    const type = getAttachmentType(file.type);
    const subdir = getSubdir(type);
    const relativePath = `attachments/${subdir}/${filename}`;
    const absolutePath = path.join(ATTACHMENTS_DIR, subdir, filename);

    // Write file
    await fs.writeFile(absolutePath, buffer);

    // Create attachment object
    const attachment: Attachment = {
      id,
      type,
      filename: file.name,
      path: relativePath,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.length,
    };

    return NextResponse.json({ success: true, attachment });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    // Security: ensure path is within attachments directory
    const absolutePath = resolveAttachmentPath(filePath);
    if (!absolutePath) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    await fs.unlink(absolutePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
