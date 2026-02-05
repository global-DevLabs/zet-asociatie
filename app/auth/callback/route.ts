import { NextResponse } from "next/server";

/**
 * OAuth callback route - not used with local authentication
 * Redirects to login page
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  // With local authentication, OAuth is not used
  // Redirect to login page
  return NextResponse.redirect(`${origin}/login`);
}

      return response;
    }
  }

  // If there's an error or no code, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
