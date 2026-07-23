import { randomBytes, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
const schema=z.object({email:z.string().trim().toLowerCase().email()});const generic={message:"If this email is registered, you will receive a reset link shortly."};
export async function POST(request:NextRequest){try{const {email}=schema.parse(await request.json());const user=await prisma.user.findUnique({where:{email}});if(user&&user.isActive&&!user.isSuspended){const token=randomBytes(32).toString("base64url");await prisma.passwordResetToken.create({data:{userId:user.id,tokenHash:createHash("sha256").update(token).digest("hex"),expiresAt:new Date(Date.now()+30*60*1000)}});await sendPasswordResetEmail({to:user.email,name:user.name,token});}return NextResponse.json(generic);}catch{return NextResponse.json(generic);}}
