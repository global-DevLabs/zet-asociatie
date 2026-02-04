import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Member } from "@/types"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { members } = body as { members: Partial<Member>[] }

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: "No members provided" },
        { status: 400 }
      )
    }

    // Get member codes for members that don't have one
    const membersNeedingCodes = members.filter((m) => !m.memberCode).length
    let generatedCodes: string[] = []
    
    if (membersNeedingCodes > 0) {
      // Generate member codes in bulk
      const { data: codes, error: codeError } = await supabase.rpc(
        "get_next_member_codes",
        { count: membersNeedingCodes }
      )
      
      if (codeError) {
        // Fallback to single code generation if bulk is not available
        for (let i = 0; i < membersNeedingCodes; i++) {
          const { data: code } = await supabase.rpc("get_next_member_code")
          if (code) generatedCodes.push(code)
        }
      } else {
        generatedCodes = codes || []
      }
    }
    
    let codeIndex = 0
    
    // Prepare members for insert
    const membersToInsert = members.map((member) => {
      const memberCode = member.memberCode || generatedCodes[codeIndex++] || null
      
      return {
        member_code: memberCode,
        status: member.status || "Activ",
        rank: member.rank,
        first_name: member.firstName,
        last_name: member.lastName,
        date_of_birth: member.dateOfBirth || null,
        cnp: member.cnp || null,
        birthplace: member.birthplace || null,
        unit: member.unit,
        main_profile: member.mainProfile,
        retirement_year: member.retirementYear || null,
        retirement_decision_number: member.retirementDecisionNumber || null,
        retirement_file_number: member.retirementFileNumber || null,
        branch_enrollment_year: member.branchEnrollmentYear || null,
        branch_withdrawal_year: member.branchWithdrawalYear || null,
        branch_withdrawal_reason: member.branchWithdrawalReason || null,
        withdrawal_reason: member.withdrawalReason || null,
        withdrawal_year: member.withdrawalYear || null,
        provenance: member.provenance || null,
        address: member.address || null,
        phone: member.phone || null,
        email: member.email || null,
        whatsapp_group_ids: member.whatsappGroupIds || [],
        organization_involvement: member.organizationInvolvement || null,
        magazine_contributions: member.magazineContributions || null,
        branch_needs: member.branchNeeds || null,
        foundation_needs: member.foundationNeeds || null,
        other_needs: member.otherNeeds || null,
        car_member_status: member.carMemberStatus || null,
        foundation_member_status: member.foundationMemberStatus || null,
        foundation_role: member.foundationRole || null,
        has_current_workplace: member.hasCurrentWorkplace || null,
        current_workplace: member.currentWorkplace || null,
        other_observations: member.otherObservations || null,
      }
    })

    // Check for duplicate member codes
    const providedCodes = membersToInsert
      .map((m) => m.member_code)
      .filter((c) => c !== null)
    
    if (providedCodes.length > 0) {
      const { data: existing } = await supabase
        .from("members")
        .select("member_code")
        .in("member_code", providedCodes)
      
      if (existing && existing.length > 0) {
        const duplicates = existing.map((m) => m.member_code).join(", ")
        return NextResponse.json(
          { error: `Coduri membre duplicate detectate: ${duplicates}. Șterge sau modifică aceste intrări.` },
          { status: 400 }
        )
      }
    }
    
    // Insert members
    const { data, error } = await supabase
      .from("members")
      .insert(membersToInsert)
      .select("member_code")

    if (error) {
      console.error("Insert error:", error)
      return NextResponse.json(
        { error: "Failed to import members: " + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
    })
  } catch (error) {
    console.error("Import API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
