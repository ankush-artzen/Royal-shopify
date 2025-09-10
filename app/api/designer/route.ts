import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Missing name or email" },
        { status: 400 },
      );
    }

    const designer = await prisma.designer.create({
      data: {
        name,
        email,
      },
    });

    return NextResponse.json({ designer }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating designer:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
