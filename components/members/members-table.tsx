"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import type { Member } from "@/types"
import { Eye } from "lucide-react"
import Link from "next/link"
import { calculateAge, formatAge, displayMemberCode } from "@/lib/utils"
import { useSettings } from "@/lib/settings-store"

interface MembersTableProps {
  data: Member[]
}

export function MembersTable({ data }: MembersTableProps) {
  const { getUnitDisplay } = useSettings()

  return (
    <div className="rounded-xl border-0 bg-card shadow-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
            <TableHead className="w-[80px] font-semibold text-foreground/90">ID</TableHead>
            <TableHead className="font-semibold text-foreground/90">Grad</TableHead>
            <TableHead className="font-semibold text-foreground/90">Nume</TableHead>
            <TableHead className="font-semibold text-foreground/90">Prenume</TableHead>
            <TableHead className="font-semibold text-foreground/90">Vârstă</TableHead>
            <TableHead className="font-semibold text-foreground/90">UM</TableHead>
            <TableHead className="font-semibold text-foreground/90">Profil</TableHead>
            <TableHead className="font-semibold text-foreground/90">Telefon</TableHead>
            <TableHead className="font-semibold text-foreground/90">Status</TableHead>
            <TableHead className="text-right font-semibold text-foreground/90">Acțiuni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-sm font-medium">Nu s-au găsit rezultate.</p>
                  <p className="text-xs mt-1">Încearcă să ajustezi filtrele de căutare.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((member) => (
              <TableRow
                key={member.id}
                className="hover:bg-muted/30 transition-colors duration-150 border-b border-border/30"
              >
                <TableCell className="font-medium text-muted-foreground font-mono">{displayMemberCode(member.memberCode) || member.id}</TableCell>
                <TableCell className="font-medium">{member.rank}</TableCell>
                <TableCell className="font-semibold">{member.lastName}</TableCell>
                <TableCell className="font-medium">{member.firstName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatAge(calculateAge(member.dateOfBirth))}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.unit ? getUnitDisplay(member.unit) : "-"}
                </TableCell>
                <TableCell className="text-sm">{member.mainProfile}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{member.phone || "-"}</TableCell>
                <TableCell>
                  {member.status === "Retras" || (!member.status && member.branchWithdrawalYear) ? (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                      Retras
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                      Activ
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 hover:bg-primary/10 hover:text-primary transition-all duration-150"
                    asChild
                  >
                    <Link href={`/members/${member.id}`}>
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Vezi
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
        <div className="text-xs text-muted-foreground font-medium">
          Afișare <span className="font-semibold text-foreground">{data.length}</span> rezultate
        </div>
      </div>
    </div>
  )
}
