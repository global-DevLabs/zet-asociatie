// Script to restore member data to local SQLite database
// Run with: npx tsx restore-members.ts

import Database from "better-sqlite3"
import path from "path"
import fs from "fs"

// Initialize database
const dataDir = path.join(process.cwd(), "data")
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(path.join(dataDir, "app.db"))

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
  whatsapp_group_ids: null,
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
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO members (
        id, member_code, status, rank, first_name, last_name, date_of_birth,
        cnp, birthplace, unit, main_profile, retirement_year,
        retirement_decision_number, retirement_file_number, branch_enrollment_year,
        branch_withdrawal_year, branch_withdrawal_reason, withdrawal_reason,
        withdrawal_year, provenance, address, phone, email, whatsapp_group_ids,
        organization_involvement, magazine_contributions, branch_needs,
        foundation_needs, other_needs, car_member_status, foundation_member_status,
        foundation_role, has_current_workplace, current_workplace, other_observations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    try {
      insertStmt.run(
        memberFromAuditLog.id,
        memberFromAuditLog.member_code,
        memberFromAuditLog.status,
        memberFromAuditLog.rank,
        memberFromAuditLog.first_name,
        memberFromAuditLog.last_name,
        memberFromAuditLog.date_of_birth,
        memberFromAuditLog.cnp,
        memberFromAuditLog.birthplace,
        memberFromAuditLog.unit,
        memberFromAuditLog.main_profile,
        memberFromAuditLog.retirement_year,
        memberFromAuditLog.retirement_decision_number,
        memberFromAuditLog.retirement_file_number,
        memberFromAuditLog.branch_enrollment_year,
        memberFromAuditLog.branch_withdrawal_year,
        memberFromAuditLog.branch_withdrawal_reason,
        memberFromAuditLog.withdrawal_reason,
        memberFromAuditLog.withdrawal_year,
        memberFromAuditLog.provenance,
        memberFromAuditLog.address,
        memberFromAuditLog.phone,
        memberFromAuditLog.email,
        memberFromAuditLog.whatsapp_group_ids,
        memberFromAuditLog.organization_involvement,
        memberFromAuditLog.magazine_contributions,
        memberFromAuditLog.branch_needs,
        memberFromAuditLog.foundation_needs,
        memberFromAuditLog.other_needs,
        memberFromAuditLog.car_member_status,
        memberFromAuditLog.foundation_member_status,
        memberFromAuditLog.foundation_role,
        memberFromAuditLog.has_current_workplace,
        memberFromAuditLog.current_workplace,
        memberFromAuditLog.other_observations
      )
      console.log("✓ Successfully restored M-001003")
    } catch (error) {
      console.error("Error restoring M-001003:", error)
    }

    // Insert placeholder members
    console.log("\nCreating placeholder members for orphaned records...")
    const placeholderStmt = db.prepare(`
      INSERT OR REPLACE INTO members (id, member_code, status, rank, first_name, last_name, phone, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const member of placeholderMembers) {
      try {
        placeholderStmt.run(
          member.id,
          member.member_code,
          member.status,
          member.rank,
          member.first_name,
          member.last_name,
          member.phone,
          member.email
        )
        console.log(`✓ Created placeholder ${member.member_code}`)
      } catch (error) {
        console.error(`Error creating placeholder ${member.member_code}:`, error)
      }
    }

    // Verify restoration
    const members = db
      .prepare("SELECT member_code, first_name, last_name FROM members ORDER BY member_code")
      .all()

    console.log(`\n✓ Restoration complete! Total members: ${members.length}`)
    console.log("Members in database:")
    members.forEach((m: any) => {
      console.log(`  - ${m.member_code}: ${m.first_name} ${m.last_name}`)
    })
  } catch (error) {
    console.error("Fatal error during restoration:", error)
  } finally {
    db.close()
  }
}

restoreMembers()

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
