"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { YearSelect } from "@/components/ui/year-select";
import { useMembers } from "@/lib/members-store";
import { usePayments } from "@/lib/payments-store";
import { useSettings } from "@/lib/settings-store";
import { useToast } from "@/hooks/use-toast";
import type { PaymentType, PaymentStatus } from "@/types";
import { Search, Check, ChevronsUpDown, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuickCashin } from "@/lib/quick-cashin-context";
import { cn, displayMemberCode } from "@/lib/utils";

export function QuickCashinModal() {
  const { isOpen, closeModal } = useQuickCashin();
  const { members } = useMembers();
  const { createPayment } = usePayments();
  const { paymentMethods } = useSettings();
  const { toast } = useToast();

  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keepModalOpen, setKeepModalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  );

  // Find portal container - use dialog content for proper z-index layering
  useEffect(() => {
    if (typeof document === "undefined") return;
    const dialogContent = triggerRef.current?.closest(
      "[data-slot='dialog-content']"
    ) as HTMLElement | null;
    setPortalContainer(dialogContent || document.body);
  }, [isOpen]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    contributionYear: "",
    paymentType: "" as PaymentType | "",
    amount: "",
    method: "",
    status: "Plătită" as PaymentStatus,
    observations: "",
  });

  // Position the dropdown relative to the trigger
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (memberDropdownOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
      // Focus search input after position is set
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [memberDropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!memberDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMemberDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [memberDropdownOpen]);

  // Close dropdown on escape
  useEffect(() => {
    if (!memberDropdownOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMemberDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [memberDropdownOpen]);

  const selectedMember = useMemo(() => {
    return members.find(m => m.id === selectedMemberId);
  }, [members, selectedMemberId]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members.slice(0, 50);

    const search = memberSearch.toLowerCase().trim();
    return members
      .filter(m => {
        const memberCode = m.memberCode?.toLowerCase() || "";
        const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
        return memberCode.includes(search) || fullName.includes(search);
      })
      .slice(0, 50);
  }, [members, memberSearch]);

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setMemberDropdownOpen(false);
    setMemberSearch("");
  };

  const handleReset = () => {
    setSelectedMemberId("");
    setMemberSearch("");
    setMemberDropdownOpen(false);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      contributionYear: "",
      paymentType: "",
      amount: "",
      method: "",
      status: "Plătită",
      observations: "",
    });
  };

  const handleSubmit = async () => {
    // Validate required fields
    const errors: string[] = [];

    if (!selectedMemberId) {
      errors.push("Membru");
    }
    if (!formData.date || formData.date.trim() === "") {
      errors.push("Dată plată");
    }
    if (!formData.paymentType || formData.paymentType.trim() === "") {
      errors.push("Tip plată");
    }
    if (!formData.amount || formData.amount.trim() === "") {
      errors.push("Sumă");
    }
    if (!formData.method || formData.method.trim() === "") {
      errors.push("Metodă de plată");
    }
    if (!formData.status) {
      errors.push("Status");
    }

    if (errors.length > 0) {
      toast({
        title: "Câmpuri lipsă",
        description: `Vă rugăm completați: ${errors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const amount = Number.parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Sumă invalidă",
        description: "Suma trebuie să fie un număr pozitiv",
        variant: "destructive",
      });
      return;
    }

    let contributionYear: number | undefined;
    if (formData.contributionYear && formData.contributionYear.trim() !== "") {
      contributionYear = Number.parseInt(formData.contributionYear);
      if (isNaN(contributionYear)) {
        toast({
          title: "An invalid",
          description: "Anul de cotizație trebuie să fie un număr valid",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await createPayment({
        memberId: selectedMemberId,
        date: formData.date,
        year: new Date(formData.date).getFullYear(),
        paymentType: formData.paymentType as PaymentType,
        contributionYear,
        amount,
        method: formData.method as any,
        status: formData.status,
        observations: formData.observations || undefined,
      });

      toast({
        title: "Plata a fost înregistrată",
        description: `Plata de ${amount} RON pentru ${selectedMember?.firstName} ${selectedMember?.lastName} a fost adăugată cu succes`,
      });

      if (keepModalOpen) {
        handleReset();
      } else {
        handleReset();
        closeModal();
      }
    } catch (error) {
      toast({
        title: "Eroare",
        description:
          error instanceof Error
            ? error.message
            : "Nu s-a putut înregistra plata",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleReset();
      closeModal();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] !grid-rows-[auto_1fr_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Încasează Cotizație</DialogTitle>
          <DialogDescription>
            Înregistrare rapidă a unei plăți. Completați formularul pentru a
            adăuga o nouă cotizație.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-1 min-h-0">
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member">Membru *</Label>
              <div className="flex gap-2">
                <Button
                  ref={triggerRef}
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={memberDropdownOpen}
                  onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                  className="flex-1 justify-between font-normal bg-transparent"
                >
                  {selectedMember ? (
                    <span>
                      {displayMemberCode(selectedMember.memberCode)} -{" "}
                      {selectedMember.firstName} {selectedMember.lastName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Caută după nume sau cod membru...
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                {selectedMember && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedMemberId("");
                      setMemberSearch("");
                    }}
                    className="shrink-0 bg-transparent"
                    title="Șterge selecția"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Portal-rendered dropdown for proper z-index layering */}
              {memberDropdownOpen &&
                portalContainer &&
                createPortal(
                  <div
                    ref={dropdownRef}
                    className="fixed z-[9999] rounded-md border bg-popover shadow-lg pointer-events-auto"
                    style={{
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                      width: dropdownPosition.width,
                    }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <div className="flex items-center border-b px-3 py-2">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Caută membru..."
                        value={memberSearch}
                        onChange={e => {
                          e.stopPropagation();
                          setMemberSearch(e.target.value);
                        }}
                        onKeyDown={e => e.stopPropagation()}
                        onFocus={e => e.stopPropagation()}
                        autoFocus
                        autoComplete="off"
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground pointer-events-auto"
                      />
                      {memberSearch && (
                        <button
                          type="button"
                          onClick={() => setMemberSearch("")}
                          className="ml-2 p-1 hover:bg-accent rounded"
                        >
                          <X className="h-3 w-3 opacity-50" />
                        </button>
                      )}
                    </div>
                    <div className="max-h-[280px] overflow-y-auto p-1">
                      {filteredMembers.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Niciun membru găsit
                        </div>
                      ) : (
                        filteredMembers.map(member => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleSelectMember(member.id)}
                            className={cn(
                              "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground pointer-events-auto",
                              selectedMemberId === member.id && "bg-accent"
                            )}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedMemberId === member.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">
                                {member.firstName} {member.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {displayMemberCode(member.memberCode)}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>,
                  portalContainer
                )}
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Dată plată *</Label>
              <DatePickerInput
                value={formData.date}
                onChange={value => setFormData({ ...formData, date: value })}
                placeholder="dd.mm.yyyy"
                required={true}
              />
            </div>

            {/* Contribution Year */}
            <div className="space-y-2">
              <Label htmlFor="contributionYear">An de cotizație</Label>
              <YearSelect
                value={
                  formData.contributionYear
                    ? Number.parseInt(formData.contributionYear)
                    : undefined
                }
                onChange={value =>
                  setFormData({
                    ...formData,
                    contributionYear: value?.toString() || "",
                  })
                }
                placeholder="Selectează anul (opțional)"
                fromYear={2000}
                toYear={new Date().getFullYear() + 2}
              />
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label htmlFor="paymentType">Tip plată *</Label>
              <Select
                value={formData.paymentType}
                onValueChange={value =>
                  setFormData({
                    ...formData,
                    paymentType: value as PaymentType,
                  })
                }
              >
                <SelectTrigger id="paymentType">
                  <SelectValue placeholder="Selectează tipul plății" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Taxă de înscriere">
                    Taxă de înscriere
                  </SelectItem>
                  <SelectItem value="Cotizație">Cotizație</SelectItem>
                  <SelectItem value="Taxă de reînscriere">
                    Taxă de reînscriere
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Sumă (RON) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={e =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="100.00"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="method">Metodă de plată *</Label>
              <Select
                value={formData.method}
                onValueChange={value =>
                  setFormData({ ...formData, method: value })
                }
              >
                <SelectTrigger id="method">
                  <SelectValue placeholder="Selectează metoda" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm text-muted-foreground">
                Status (implicit: Plătită)
              </Label>
              <Select
                value={formData.status}
                onValueChange={value =>
                  setFormData({ ...formData, status: value as PaymentStatus })
                }
              >
                <SelectTrigger id="status" className="bg-muted/30">
                  <SelectValue placeholder="Plătită" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plătită">Plătită</SelectItem>
                  <SelectItem value="Scadentă">Scadentă</SelectItem>
                  <SelectItem value="Restanță">Restanță</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Modificați doar dacă este necesar (rareori folosit)
              </p>
            </div>

            {/* Observations */}
            <div className="space-y-2">
              <Label htmlFor="observations">
                Observații / Detalii chitanță
              </Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={e =>
                  setFormData({ ...formData, observations: e.target.value })
                }
                placeholder="Detalii chitanță, observații..."
                rows={3}
              />
            </div>

            {/* Keep modal open checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="keepOpen"
                checked={keepModalOpen}
                onCheckedChange={checked => setKeepModalOpen(checked === true)}
              />
              <Label
                htmlFor="keepOpen"
                className="text-sm font-normal cursor-pointer"
              >
                Adaugă altă plată după salvare
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Anulează
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Se salvează..." : "Înregistrează plata"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
