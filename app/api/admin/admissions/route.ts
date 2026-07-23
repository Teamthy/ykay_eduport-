import { ApplicationStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendAdmissionDecisionEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";

const roles=[UserRole.ADMIN,UserRole.DIRECTOR,UserRole.COORDINATOR];
const updateSchema=z.object({applicationId:z.string().min(1),status:z.enum(["PENDING_REVIEW","DOCUMENTS_REQUESTED","APPROVED","DECLINED","WAITLISTED"]),note:z.string().trim().max(1000).optional()});

export async function GET(){const user=await requireRole(roles);if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const applications=await prisma.admissionApplication.findMany({where:{schoolId:user.schoolId,status:{not:"DRAFT"}},orderBy:{submittedAt:"desc"},include:{documents:{select:{id:true,type:true,fileName:true,sizeBytes:true}},payment:{select:{status:true,reference:true}}}});return NextResponse.json({applications});}

export async function PATCH(request:NextRequest){const user=await requireRole(roles);if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});try{const input=updateSchema.parse(await request.json());const application=await prisma.admissionApplication.findFirst({where:{schoolId:user.schoolId,applicationId:input.applicationId}});if(!application)return NextResponse.json({error:"Application not found."},{status:404});const updated=await prisma.admissionApplication.update({where:{id:application.id},data:{status:input.status as ApplicationStatus,statusNote:input.note||null,reviewedAt:new Date()}});await prisma.auditLog.create({data:{schoolId:user.schoolId,actorUserId:user.id,action:`ADMISSION_${input.status}`,entityType:"AdmissionApplication",entityId:application.applicationId,ipAddress:getClientIp(request),metadata:{note:input.note||null}}});await sendAdmissionDecisionEmail({to:updated.parentEmail,studentName:`${updated.firstName} ${updated.lastName}`,status:updated.status,note:updated.statusNote}).catch(console.error);return NextResponse.json({application:updated});}catch{return NextResponse.json({error:"Unable to update application."},{status:400});}}
