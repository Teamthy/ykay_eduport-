import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { sessionCookie, signSession } from "@/lib/session";

const schema=z.object({email:z.string().trim().toLowerCase().email(),password:z.string().min(1)});
export async function POST(request:NextRequest){
 try { const {email,password}=schema.parse(await request.json()); const user=await prisma.user.findUnique({where:{email}}); const valid=!!user && user.isActive && !user.isSuspended && await bcrypt.compare(password,user.passwordHash); if(!valid) return NextResponse.json({error:"Invalid email or password."},{status:401}); const token=await signSession({id:user.id,schoolId:user.schoolId,role:user.role,name:user.name,email:user.email,mustChangePassword:user.mustChangePassword}); await prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}}); await prisma.auditLog.create({data:{schoolId:user.schoolId,actorUserId:user.id,action:"USER_SIGNED_IN",entityType:"User",entityId:user.id,ipAddress:getClientIp(request)}}); const response=NextResponse.json({user:{name:user.name,email:user.email,role:user.role,mustChangePassword:user.mustChangePassword}}); const cookie=sessionCookie(token); response.cookies.set(cookie.name,cookie.value,cookie.options); return response; } catch { return NextResponse.json({error:"Invalid email or password."},{status:401}); }
}
