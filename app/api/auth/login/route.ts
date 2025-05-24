// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
// import bcrypt from 'bcryptjs'; // Use bcrypt for password hashing in a real app

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // In a real app, compare hashed passwords:
    // const passwordIsValid = await bcrypt.compare(password, user.password);
    // For this example, using plain text comparison (INSECURE for production):
    const passwordIsValid = user.password === password;

    if (!passwordIsValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Do not send password back to client
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ message: 'Login successful', user: userWithoutPassword }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}