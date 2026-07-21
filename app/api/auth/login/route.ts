import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_FILE = join(process.cwd(), ".data", "users.json");

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "teacher" | "student" | "parent";
}

interface UsersData {
  users: User[];
}

function loadUsers(): UsersData {
  if (!existsSync(DATA_FILE)) return { users: [] };
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8")) as UsersData;
  } catch {
    return { users: [] };
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const data = loadUsers();
    const user = data.users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate mock JWT token (replace with real signing in production)
    const token = `jwt_${user.id}_${Date.now()}`;

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Login failed" },
      { status: 500 }
    );
  }
}
