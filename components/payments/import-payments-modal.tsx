"use client";

import React from "react";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMembers } from "@/lib/members-store";
import { usePayments } from "@/lib/payments-store";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  extractMemberCodeNumber,
  displayDateToISO,
  isValidDisplayDate,
} from "@/lib/utils";
import { AuditLogger } from "@/lib/audit-logger";
import { useAuth } from "@/lib/auth-context";
import type { PaymentType, PaymentStatus } from "@/types";

interface ImportRow {
  rowNumber: number;
  member_code: string;
  data_plata: string;
  suma_ron: string;
  metoda_plata: string;
  tip_plata: string;
  status: string;
  an_cotizatie?: string;
  observatii?: string;
  detalii_chitanta?: string;
  // Validation
  errors: string[];
  warnings: string[];
  valid: boolean;
  memberId?: string;
}

interface ImportPaymentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export function ImportPaymentsModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportPaymentsModalProps) {
  const { members } = useMembers();
  const { createPayment } = usePayments();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>("");
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importStats, setImportStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
  });

  const downloadTemplate = () => {
    // Use semicolon delimiter - more compatible with European/Romanian Excel
    // Headers must match exactly what the parser expects
    const headers = [
      "member_code",
      "data_plata",
      "suma_ron",
      "metoda_plata",
      "tip_plata",
      "status",
      "an_cotizatie",
      "observatii",
      "detalii_chitanta",
    ].join(";");

    // Example rows with realistic data
    const exampleRows = [
      "01001;15.01.2025;100;Numerar;Cotizație;Plătită;2025;Plata lunară;Nr. chitanță 123",
      "01002;16.01.2025;50;Transfer Bancar;Taxă de înscriere;Plătită;;Plată inițială;",
      "01003;20.01.2025;75.50;Card / Online;Cotizație;Plătită;2025;;",
    ];

    const template = [headers, ...exampleRows].join("\r\n");

    // Add UTF-8 BOM for proper Excel encoding recognition
    const blob = new Blob(["\uFEFF" + template], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_import_plati.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportComplete(false);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const validatedRows = validateRows(rows);
      setImportRows(validatedRows.slice(0, 200)); // Limit preview to 200 rows
    } catch (error) {
      toast({
        title: "Eroare",
        description:
          error instanceof Error ? error.message : "Nu s-a putut citi fișierul",
        variant: "destructive",
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const parseCSV = (text: string): Partial<ImportRow>[] => {
    // Strip UTF-8 BOM if present (critical for Excel exports)
    let cleanText = text.replace(/^\uFEFF/, "");

    const lines = cleanText.split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error("Fișierul este gol sau nu conține date");
    }

    // Auto-detect delimiter: if header contains semicolon, use semicolon; otherwise use comma
    const headerLine = lines[0];
    const delimiter = headerLine.includes(";") ? ";" : ",";

    // Debug removed - parsing CSV with detected delimiter

    // Parse a single row - handles quoted values properly
    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          // Strip BOM from individual cell values as well (can happen in first cell)
          result.push(
            current
              .trim()
              .replace(/^"|"$/g, "")
              .replace(/^\uFEFF/, "")
          );
          current = "";
        } else {
          current += char;
        }
      }
      // Push last value, also strip BOM
      result.push(
        current
          .trim()
          .replace(/^"|"$/g, "")
          .replace(/^\uFEFF/, "")
      );
      return result;
    };

    // Parse headers and normalize
    const rawHeaders = parseRow(headerLine);
    const headers = rawHeaders.map(h =>
      h
        .toLowerCase()
        .trim()
        .replace(/^\uFEFF/, "")
    );

    // Debug removed - headers parsed

    // Validate required columns
    const requiredColumns = [
      "member_code",
      "data_plata",
      "suma_ron",
      "metoda_plata",
      "tip_plata",
      "status",
    ];
    const missingColumns = requiredColumns.filter(
      col => !headers.includes(col)
    );
    if (missingColumns.length > 0) {
      console.error(
        "Missing columns:",
        missingColumns,
        "from headers:",
        headers
      );
      throw new Error(`Coloane lipsă: ${missingColumns.join(", ")}`);
    }

    const rows: Partial<ImportRow>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = parseRow(line);
      const row: Partial<ImportRow> = {
        rowNumber: i + 1,
      };

      headers.forEach((header, index) => {
        if (header) {
          // Ignore empty trailing columns
          const value = values[index] || "";
          (row as any)[header] = value;
        }
      });

      rows.push(row);
    }

    return rows;
  };

  // Valid payment methods in the app
  const validMethods = ["Numerar", "Transfer Bancar", "Card / Online"];

  // Normalizers for CSV values to canonical enum values
  const normalizeMethod = (input: string): string => {
    const lower = input.toLowerCase().trim();
    if (lower === "numerar" || lower === "cash") return "Numerar";
    if (
      lower === "transfer bancar" ||
      lower === "transfer" ||
      lower === "virament"
    )
      return "Transfer Bancar";
    if (
      lower === "card" ||
      lower === "online" ||
      lower === "card/online" ||
      lower === "card / online"
    )
      return "Card / Online";
    return input; // Return original if no match
  };

  const normalizePaymentType = (input: string): string => {
    const lower = input.toLowerCase().trim();
    if (lower === "cotizație" || lower === "cotizatie") return "Cotizație";
    if (
      lower === "taxă de înscriere" ||
      lower === "taxa de inscriere" ||
      lower === "inscriere"
    )
      return "Taxă de înscriere";
    if (
      lower === "taxă de reînscriere" ||
      lower === "taxa de reinscriere" ||
      lower === "reinscriere"
    )
      return "Taxă de reînscriere";
    return input;
  };

  const normalizeStatus = (input: string): string => {
    const lower = input.toLowerCase().trim();
    if (
      lower === "plătită" ||
      lower === "platita" ||
      lower === "achitata" ||
      lower === "achitată"
    )
      return "Plătită";
    if (lower === "scadentă" || lower === "scadenta") return "Scadentă";
    if (lower === "restanță" || lower === "restanta") return "Restanță";
    return input;
  };

  const validateRows = (rows: Partial<ImportRow>[]): ImportRow[] => {
    const membersNotLoaded = members.length === 0;

    // Debug removed - validating rows

    return rows.map(row => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let memberId: string | undefined;

      // Required fields
      if (!row.member_code) errors.push("Cod membru lipsă");
      if (!row.data_plata) errors.push("Dată plată lipsă");
      if (!row.suma_ron) errors.push("Sumă lipsă");
      if (!row.metoda_plata) errors.push("Metodă plată lipsă");
      if (!row.tip_plata) errors.push("Tip plată lipsă");
      if (!row.status) errors.push("Status lipsă");

      // Validate member exists
      if (row.member_code) {
        if (membersNotLoaded) {
          // Members not loaded yet - add warning but don't mark as error
          warnings.push(
            "Membrii nu sunt încărcați - verificarea codului nu a fost posibilă"
          );
        } else {
          // Normalize member code - accepts "01001", "MEM-01001", "M-01001", "1001"
          const memberNum = extractMemberCodeNumber(row.member_code);
          if (memberNum === null) {
            errors.push(`Cod membru invalid: ${row.member_code}`);
          } else {
            const member = members.find(
              m => extractMemberCodeNumber(m.memberCode) === memberNum
            );
            if (!member) {
              errors.push(`Membru cu codul ${row.member_code} nu există`);
            } else {
              memberId = member.id;
            }
          }
        }
      }

      // Validate date format (dd.mm.yyyy)
      if (row.data_plata && !isValidDisplayDate(row.data_plata)) {
        errors.push("Dată invalidă (format așteptat: dd.mm.yyyy)");
      }

      // Validate amount is a number
      if (row.suma_ron) {
        const amount = Number.parseFloat(row.suma_ron.replace(",", ".")); // Handle comma decimal separator
        if (isNaN(amount) || amount <= 0) {
          errors.push("Sumă invalidă (trebuie să fie un număr pozitiv)");
        }
      }

      // Normalize values for validation
      const normalizedMethodForCheck = row.metoda_plata
        ? normalizeMethod(row.metoda_plata)
        : "";
      const normalizedTypeForCheck = row.tip_plata
        ? normalizePaymentType(row.tip_plata)
        : "";
      const normalizedStatusForCheck = row.status
        ? normalizeStatus(row.status)
        : "";

      // Validate payment method (using normalized value)
      if (
        normalizedMethodForCheck &&
        !validMethods.includes(normalizedMethodForCheck)
      ) {
        errors.push(
          `Metodă plată invalidă: "${row.metoda_plata}" (opțiuni: ${validMethods.join(", ")})`
        );
      }

      // Validate payment type
      const validTypes: PaymentType[] = [
        "Taxă de înscriere",
        "Cotizație",
        "Taxă de reînscriere",
      ];
      if (
        normalizedTypeForCheck &&
        !validTypes.includes(normalizedTypeForCheck as PaymentType)
      ) {
        errors.push(
          `Tip plată invalid: "${row.tip_plata}" (opțiuni: ${validTypes.join(", ")})`
        );
      }

      // Validate status
      const validStatuses: PaymentStatus[] = [
        "Plătită",
        "Scadentă",
        "Restanță",
      ];
      if (
        normalizedStatusForCheck &&
        !validStatuses.includes(normalizedStatusForCheck as PaymentStatus)
      ) {
        errors.push(
          `Status invalid: "${row.status}" (opțiuni: ${validStatuses.join(", ")})`
        );
      }

      // Validate year if provided
      if (row.an_cotizatie) {
        const year = Number.parseInt(row.an_cotizatie);
        if (isNaN(year) || year < 2000 || year > 2100) {
          errors.push("An cotizație invalid");
        }
      }

      // Check for possible duplicates (only if member found)
      if (memberId && row.data_plata && row.suma_ron) {
        const member = members.find(m => m.id === memberId);
        if (member?.payments) {
          const isoDate = displayDateToISO(row.data_plata);
          const amount = Number.parseFloat(row.suma_ron.replace(",", "."));
          const duplicate = member.payments.find(
            p => p.date === isoDate && p.amount === amount
          );
          if (duplicate) {
            warnings.push("Posibil duplicat (același membru, dată și sumă)");
          }
        }
      }

      // Normalize values before returning
      const normalizedMethod = row.metoda_plata
        ? normalizeMethod(row.metoda_plata)
        : "";
      const normalizedType = row.tip_plata
        ? normalizePaymentType(row.tip_plata)
        : "";
      const normalizedStatus = row.status ? normalizeStatus(row.status) : "";

      return {
        ...row,
        rowNumber: row.rowNumber!,
        member_code: row.member_code || "",
        data_plata: row.data_plata || "",
        suma_ron: row.suma_ron || "",
        metoda_plata: normalizedMethod,
        tip_plata: normalizedType,
        status: normalizedStatus,
        an_cotizatie: row.an_cotizatie,
        observatii: row.observatii,
        detalii_chitanta: row.detalii_chitanta,
        errors,
        warnings,
        valid: errors.length === 0,
        memberId,
      } as ImportRow;
    });
  };

  const handleImport = async () => {
    // Check if members are loaded
    if (members.length === 0) {
      toast({
        title: "Membrii nu sunt încărcați",
        description: "Așteptați încărcarea membrilor sau reîmprospătați pagina",
        variant: "destructive",
      });
      return;
    }

    const validRows = importRows.filter(r => r.valid);
    if (validRows.length === 0) {
      toast({
        title: "Nicio plată validă",
        description:
          "Nu există rânduri valide pentru import. Verificați erorile din tabel.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;
    const createdCodes: string[] = [];

    try {
      for (const row of validRows) {
        try {
          const isoDate = displayDateToISO(row.data_plata);

          // Defensive check: skip row if date conversion failed
          if (!isoDate) {
            console.error(
              `Row ${row.rowNumber}: Invalid date "${row.data_plata}"`
            );
            failCount++;
            continue;
          }

          const amount = Number.parseFloat(row.suma_ron.replace(",", "."));
          if (isNaN(amount) || amount <= 0) {
            console.error(
              `Row ${row.rowNumber}: Invalid amount "${row.suma_ron}"`
            );
            failCount++;
            continue;
          }

          if (!row.memberId) {
            console.error(`Row ${row.rowNumber}: No member ID resolved`);
            failCount++;
            continue;
          }

          const contributionYear = row.an_cotizatie
            ? Number.parseInt(row.an_cotizatie)
            : undefined;

          // Combine observatii and detalii_chitanta
          let observations = "";
          if (row.observatii) observations += row.observatii;
          if (row.detalii_chitanta) {
            observations += observations
              ? `\nDetalii chitanță: ${row.detalii_chitanta}`
              : `Detalii chitanță: ${row.detalii_chitanta}`;
          }

          const payment = await createPayment({
            memberId: row.memberId,
            date: isoDate,
            year: parseInt(isoDate.slice(0, 4), 10),
            paymentType: row.tip_plata as PaymentType,
            contributionYear,
            amount,
            method: row.metoda_plata as any,
            status: row.status as PaymentStatus,
            observations: observations || undefined,
          });

          createdCodes.push(payment.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to import row ${row.rowNumber}:`, error);
          failCount++;
        }
      }

      setImportStats({
        total: validRows.length,
        success: successCount,
        failed: failCount,
      });
      setImportComplete(true);

      // Log to audit
      AuditLogger.log({
        user,
        actionType: "IMPORT_PAYMENTS",
        module: "payments",
        entityType: "payment",
        summary: `Import plăți: ${successCount} succes, ${failCount} eșuate din ${validRows.length} total`,
        metadata: {
          fileName,
          totalRows: importRows.length,
          validRows: validRows.length,
          successCount,
          failCount,
          createdCodes: createdCodes.slice(0, 10), // First 10 codes
        },
      });

      toast({
        title: "Import finalizat",
        description: `${successCount} plăți importate cu succes${failCount > 0 ? `, ${failCount} eșuate` : ""}`,
      });

      // Notify parent that import completed successfully
      if (successCount > 0 && onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      toast({
        title: "Eroare la import",
        description:
          error instanceof Error
            ? error.message
            : "Nu s-au putut importa plățile",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setFileName("");
    setImportRows([]);
    setImportComplete(false);
    setImportStats({ total: 0, success: 0, failed: 0 });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      // Opening - just call parent handler, don't reset state
      onOpenChange(true);
    } else {
      // Closing - reset state and call parent handler
      resetState();
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const validCount = importRows.filter(r => r.valid).length;
  const invalidCount = importRows.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Cotizații</DialogTitle>
          <DialogDescription>
            Importă plăți din format CSV. Descarcă șablonul, completează-l și
            încarcă fișierul.
          </DialogDescription>
        </DialogHeader>

        {/* Format instructions */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-1">
          <p className="font-medium text-foreground">Coloane obligatorii:</p>
          <p>
            <code className="bg-muted px-1 rounded">member_code</code> - Codul
            membrului (ex: 01001)
          </p>
          <p>
            <code className="bg-muted px-1 rounded">data_plata</code> - Data
            plății (format: dd.mm.yyyy)
          </p>
          <p>
            <code className="bg-muted px-1 rounded">suma_ron</code> - Suma în
            RON (ex: 100 sau 75.50)
          </p>
          <p>
            <code className="bg-muted px-1 rounded">metoda_plata</code> -
            Numerar / Transfer Bancar / Card / Online
          </p>
          <p>
            <code className="bg-muted px-1 rounded">tip_plata</code> - Cotizație
            / Taxă de înscriere / Taxă de reînscriere
          </p>
          <p>
            <code className="bg-muted px-1 rounded">status</code> - Plătită /
            Scadentă / Restanță
          </p>
          <p className="mt-2 text-orange-600">
            Sfat: Descarcă șablonul și editează-l cu datele tale. Acceptăm
            separatori virgulă (,) sau punct și virgulă (;).
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={downloadTemplate}
              className="bg-transparent"
            >
              <Download className="h-4 w-4 mr-2" />
              Descarcă șablon CSV
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="bg-transparent"
            >
              <Upload className="h-4 w-4 mr-2" />
              Încarcă fișier CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Members not loaded warning */}
          {members.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm">
                Membrii nu sunt încărcați. Așteptați sau reîmprospătați pagina
                înainte de import.
              </span>
            </div>
          )}

          {/* File name */}
          {fileName && (
            <div className="text-sm text-muted-foreground">
              Fișier: <span className="font-medium">{fileName}</span>
            </div>
          )}

          {/* Import complete stats */}
          {importComplete && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-semibold mb-2">Import finalizat</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold">{importStats.total}</div>
                  <div className="text-sm text-muted-foreground">
                    Total procesate
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {importStats.success}
                  </div>
                  <div className="text-sm text-muted-foreground">Succes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {importStats.failed}
                  </div>
                  <div className="text-sm text-muted-foreground">Eșuate</div>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {importRows.length > 0 && !importComplete && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>
                  {validCount}{" "}
                  {validCount === 1 ? "rând valid" : "rânduri valide"}
                </span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>
                    {invalidCount}{" "}
                    {invalidCount === 1 ? "rând cu erori" : "rânduri cu erori"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Preview table */}
          {importRows.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rând</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cod Membru</TableHead>
                      <TableHead>Dată</TableHead>
                      <TableHead>Sumă</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Metodă</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mesaje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.map(row => (
                      <TableRow
                        key={row.rowNumber}
                        className={!row.valid ? "bg-red-50/50" : undefined}
                      >
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          {row.valid ? (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-700 border-green-200"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-red-500/10 text-red-700 border-red-200"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.member_code}
                        </TableCell>
                        <TableCell>{row.data_plata}</TableCell>
                        <TableCell>{row.suma_ron}</TableCell>
                        <TableCell className="text-xs">
                          {row.tip_plata}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.metoda_plata}
                        </TableCell>
                        <TableCell className="text-xs">{row.status}</TableCell>
                        <TableCell>
                          {row.errors.length > 0 && (
                            <div className="space-y-1">
                              {row.errors.map((err, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-1 text-xs text-red-600"
                                >
                                  <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {row.warnings.length > 0 && (
                            <div className="space-y-1">
                              {row.warnings.map((warn, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-1 text-xs text-orange-600"
                                >
                                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                  <span>{warn}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {importRows.length === 0 && !fileName && (
            <div className="text-center py-12 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">
                Încarcă un fișier CSV pentru a începe
              </p>
              <p className="text-sm mt-1">
                Descarcă șablonul pentru a vedea formatul așteptat
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isImporting}
          >
            {importComplete ? "Închide" : "Anulează"}
          </Button>
          {!importComplete && (
            <Button
              onClick={handleImport}
              disabled={isImporting || validCount === 0 || members.length === 0}
            >
              {isImporting ? "Se importă..." : `Importă ${validCount} plăți`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
