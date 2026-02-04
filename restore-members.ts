// Script to restore member data from audit log
// Run with: npx tsx restore-members.ts

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Member data recovered from audit log
const memberFromAuditLog = {
  id: "c8787ddb-eb81-476b-9910-6612628d0d76",
  member_code: "M-001003",
  status: "Activ",
  rank: "Viceamiral",
  first_name: "Gheorghe",
  last_name: "Dumitrescu",
  date_of_birth: "1985-06-07",
  cnp: "1850607345678",
  birthplace: "",
  unit: "U.M. 0123",
  main_profile: "Administrativ",
  retirement_year: null,
  retirement_decision_number: "",
  retirement_file_number: "",
  branch_enrollment_year: null,
  branch_withdrawal_year: null,
  branch_withdrawal_reason: "",
  withdrawal_reason: "",
  withdrawal_year: null,
  provenance: "",
  address: "",
  phone: "0721234569",
  email: "gheorghe.d@email.ro",
  whatsapp_group_ids: [],
  organization_involvement: "",
  magazine_contributions: "",
  branch_needs: "",
  foundation_needs: "",
  other_needs: "",
  car_member_status: null,
  foundation_member_status: null,
  foundation_role: null,
  has_current_workplace: null,
  current_workplace: "",
  other_observations: "",
}

// Placeholder members for IDs found in payments and activities
const placeholderMembers = [
  {
    id: "ddfd3662-3b4a-4a9b-8069-37d0dae53b08",
    member_code: "M-RECOVERY-001",
    status: "Activ",
    rank: "",
    first_name: "RECUPERARE",
    last_name: "NECESARĂ 001",
    phone: "",
    email: "",
  },
  {
    id: "577b768f-706e-499b-aaf0-587db8cc1690",
    member_code: "M-RECOVERY-002",
    status: "Activ",
    rank: "",
    first_name: "RECUPERARE",
    last_name: "NECESARĂ 002",
    phone: "",
    email: "",
  },
  {
    id: "6c682d8d-b489-404f-9de0-0d75e1e61685",
    member_code: "M-RECOVERY-003",
    status: "Activ",
    rank: "",
    first_name: "RECUPERARE",
    last_name: "NECESARĂ 003",
    phone: "",
    email: "",
  },
]

async function restoreMembers() {
  console.log("Starting member restoration...")

  try {
    // Insert the member from audit log
    console.log("Restoring member from audit log: M-001003 (Gheorghe Dumitrescu)")
    const { error: error1 } = await supabase
      .from("members")
      .insert(memberFromAuditLog)

    if (error1) {
      console.error("Error restoring M-001003:", error1)
    } else {
      console.log("✓ Successfully restored M-001003")
    }

    // Insert placeholder members
    console.log("\nCreating placeholder members for orphaned records...")
    for (const member of placeholderMembers) {
      const { error } = await supabase
        .from("members")
        .insert(member)

      if (error) {
        console.error(`Error creating placeholder ${member.member_code}:`, error)
      } else {
        console.log(`✓ Created placeholder ${member.member_code}`)
      }
    }

    // Verify restoration
    const { data: members, error: countError } = await supabase
      .from("members")
      .select("member_code, first_name, last_name")
      .order("member_code")

    if (countError) {
      console.error("Error verifying restoration:", countError)
    } else {
      console.log("\n=== Restored Members ===")
      members?.forEach(m => {
        console.log(`${m.member_code}: ${m.first_name} ${m.last_name}`)
      })
      console.log(`\nTotal: ${members?.length || 0} members`)
    }

    console.log("\n⚠️  IMPORTANT: The placeholder members (M-RECOVERY-xxx) need to be updated with correct data.")
    console.log("These were created to maintain data integrity for existing payments and activities.")
    console.log("Please update them with the correct member information or delete and re-import your member database.")
  } catch (error) {
    console.error("Restoration failed:", error)
  }
}

restoreMembers()
