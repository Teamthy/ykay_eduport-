import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { found: false, message: "Application ID is required" },
        { status: 400 }
      );
    }

    if (!existsSync(DATA_FILE)) {
      return NextResponse.json(
        { found: false, message: "No applications found" },
        { status: 404 }
      );
    }

    const raw = readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw) as ApplicationsData;
    const app = data.applications.find((a) => a.id === id);

    if (!app) {
      return NextResponse.json(
        {
          found: false,
          message: "Application not found. Please verify your Application ID.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        found: true,
        applicationId: app.id,
        studentName: app.studentName,
        classApplying: app.classApplying,
        status: app.status,
        submittedAt: app.submittedAt,
        message: getStatusMessage(app.status),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { found: false, message: "Error checking application status" },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "Pending Review":
      return "Your application is currently under review by our admissions team. You will be notified via SMS and email once a decision has been made. Expected review time: 3–5 business days.";
    case "Documents Requested":
      return "Our admissions team has reviewed your application and requires additional documents. Please contact the school directly or upload the requested documents through your application portal.";
    case "Approved":
      return "Congratulations! Your application has been approved. Login credentials have been sent to your registered email and phone. Please proceed to the school for enrollment orientation.";
    case "Declined":
      return "We regret to inform you that this application has not been approved. Please contact the admissions office for more information or to discuss alternative options.";
    default:
      return "Status information is being updated.";
  }
}
