import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q") || ""
  
  const supabase = await createClient()
  
  try {
    if (!query.trim()) {
      // Return empty array for empty queries - let client handle showing all members
      return NextResponse.json({ memberIds: [], error: null })
    }
    
    // Call the search function
    const { data, error } = await supabase.rpc("search_members_fulltext", {
      search_query: query,
    })
    
    if (error) {
      console.error(" Search error:", error)
      // Fallback to client-side search if server search fails
      return NextResponse.json({ memberIds: null, error: error.message, fallback: true })
    }
    
    // Return just the member IDs ordered by relevance
    const memberIds = data?.map((row: { id: string }) => row.id) || []
    
    return NextResponse.json({ memberIds, error: null })
  } catch (err) {
    console.error(" Search API error:", err)
    return NextResponse.json({ memberIds: null, error: "Search failed", fallback: true })
  }
}

// Endpoint to refresh the search index
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase.rpc("refresh_member_search_index")
    
    if (error) {
      console.error(" Refresh index error:", error)
      return NextResponse.json({ success: false, error: error.message })
    }
    
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(" Refresh index API error:", err)
    return NextResponse.json({ success: false, error: "Refresh failed" })
  }
}
