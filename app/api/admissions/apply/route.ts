import { NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_FILE = join(process.cwd(), ".data", "admissions.json");

interface Application {
  id: string;
  studentName: string;
  parentName: string;
  email: string;
  phone: string;
  classApplying: string;
  previousSchool: string;
  status: string;
  submittedAt: string;
  documentCount: number;
}

interface ApplicationsData {
  applications: Application[];
}

function ensureDir() {
  const dir = join(process.cwd(), ".data");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

function loadData(): ApplicationsData {
  ensureDir();
  if (!existsSync(DATA_FILE)) {
    return { applications: [] };
  }
  try {
    const raw = readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw) as ApplicationsData;
  } catch {
    return { applications: [] };
  }
}

function saveData(data: ApplicationsData) {
  ensureDir();
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const appId = `YKC-APP-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 9000) + 1000
    )}`;

    const application: Application = {
      id: appId,
      studentName: body.studentName ?? "",
      parentName: body.parentName ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      classApplying: body.classApplying ?? "",
      previousSchool: body.previousSchool ?? "",
      status: "Pending Review",
      submittedAt: new Date().toISOString(),
      documentCount: Array.isArray(body.documents) ? body.documents.length : 0,
    };

    const data = loadData();
    data.applications.push(application);
    saveData(data);

    return NextResponse.json(
      {
        success: true,
        applicationId: appId,
        message: "Application received",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Application submission failed" },
      { status: 500 }
    );
  }
}
