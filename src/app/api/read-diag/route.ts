import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const diagPath = "/tmp/vps-diag.txt";
    if (fs.existsSync(diagPath)) {
      const content = fs.readFileSync(diagPath, "utf8");
      return new NextResponse(content, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    
    const publicDiagPath = path.join(process.cwd(), "public", "vps-diag.txt");
    if (fs.existsSync(publicDiagPath)) {
      const content = fs.readFileSync(publicDiagPath, "utf8");
      return new NextResponse(content, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    
    return NextResponse.json({
      success: false,
      error: "Diagnostic file not found in /tmp/vps-diag.txt or public/vps-diag.txt",
      cwd: process.cwd(),
      filesInCwd: fs.readdirSync(process.cwd()),
      filesInPublic: fs.existsSync(path.join(process.cwd(), "public")) ? fs.readdirSync(path.join(process.cwd(), "public")) : []
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
