"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, ClipboardList, ExternalLink, EyeOff, HandCoins, Lock, LockOpen, Mail, MessageSquare, Phone, Plus, RotateCcw, Star, Store, Trash2, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import type { Order } from "@/lib/types";
import { cn, formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, usePartnerRatings } from "@/lib/mock/hooks";
import { isOverdue, walletLedger } from "@/lib/mock/selectors";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Avatar, Switch } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/tabs";
import { EmptyState, Stars, StatusBadge, useConfirm } from "@/components/shared/bits";
import { Icon } from "@/components/shared/icon";
import { WalletLedger } from "@/components/shared/wallet-ledger";
import { MoneyDocDialog, type MoneyDoc } from "@/components/shared/money-doc";
import { RowActions } from "@/components/admin/row-actions";
import { DL, KpiCard, Mono, PageHeader } from "@/components/admin/ui";
import { CreditDialog, TopUpDialog } from "@/components/admin/wallet-actions";
import { DocStateBadge } from "@/components/admin/doc-state";
import { CompanyDocuments, ContactCompanyDialog } from "@/components/admin/company-docs";
import { FileManager } from "@/components/admin/file-manager";

export default function PartnerDetailPage() {
  return (
    <Suspense>
      <PartnerDetail />
    </Suspense>
  );
}

const TABS = ["overview", "documents", "bookings", "wallet", "reviews", "files", "messages"];

function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  // lists elsewhere link straight to a tab, e.g. ?tab=wallet
  const tabParam = useSearchParams().get("tab");
  const initialTab = tabParam && TABS.includes(tabParam) ? tabParam : "overview";
  const t = useTranslations();
  const tp = useTranslations("admin.partners");
  const tb = useTranslations("admin.partners.bookings");
  const L = useL();
  const lang = useLang();
  const p = useStore((s) => s.partners.find((x) => x.id === id));
  const db = useStore();
  const patch = useStore((s) => s.patch);
  const removeItem = useStore((s) => s.remove);
  const setExecuted = (o: Order, executed: boolean) => {
    patch("orders", o.id, { executed });
    toast.success(t(executed ? "admin.rows.markedDone" : "admin.rows.markedNotDone", { id: o.offerId }));
  };
  const decideReview = (id: string, status: "approved" | "rejected") => {
    patch("reviews", id, { status });
    toast.success(t(`common.status.${status}`));
  };
  const issueRefund = useStore((s) => s.issueRefund);
  const partnerLogin = useStore((s) => s.partnerLogin);
  const router = useRouter();
  const ratings = usePartnerRatings();
  const { confirm, dialog } = useConfirm();
  const [contact, setContact] = useState(false);
  const [topUp, setTopUp] = useState(false);
  const [credit, setCredit] = useState(false);
  const [doc, setDoc] = useState<MoneyDoc | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [addSvc, setAddSvc] = useState("");
  const [stars, setStars] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");

  const offerMap = useMemo(() => Object.fromEntries(db.offers.map((o) => [o.id, o])), [db.offers]);
  if (!p) return <Card><EmptyState title={t("common.notFound.title")} /></Card>;

  const ledger = walletLedger(db, p.id);
  const orders = db.orders.filter((o) => o.partnerId === p.id);
  const reports = db.fakeReports.filter((r) => orders.some((o) => o.id === r.orderId));
  // a booking is "fake" once its offer was cancelled as fake, or while the company has reported it
  const isFakeBooking = (o: Order) => offerMap[o.offerId]?.cancelReason === "fake" || reports.some((r) => r.orderId === o.id && r.status !== "canceled");
  const fakeBookings = orders.filter(isFakeBooking);
  const bookings = orders.filter((o) => !isFakeBooking(o));
  const refundOf = (o: Order) => db.refunds.find((r) => r.orderId === o.id && r.status !== "rejected");
  const reviews = db.reviews.filter((r) => r.target === p.id && (stars === "all" || r.stars === Number(stars)) && (reviewStatus === "all" || r.status === reviewStatus));
  const allReviews = db.reviews.filter((r) => r.target === p.id);
  const invoices = db.invoices.filter((i) => i.partnerId === p.id);
  const messages = db.messages.filter((m) => m.partnerId === p.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const missing = db.services.filter((s) => s.active && !p.serviceIds.includes(s.id));
  const val = (k: keyof typeof p) => form[k as string] ?? String(p[k] ?? "");
  const userName = (uid?: string) => db.users.find((u) => u.id === uid)?.name ?? "Kompass";

  const saveProfile = async () => {
    await mock(() =>
      patch("partners", p.id, {
        name: val("name"),
        ownerName: val("ownerName"),
        email: val("email"),
        phone: val("phone"),
        mobile: val("mobile"),
        website: val("website"),
        address: val("address"),
        zip: val("zip"),
        city: val("city"),
      }),
    );
    setForm({});
    toast.success(t("common.toast.saved"));
  };

  // Refund policy: only bookings whose offer is confirmed fake can be refunded, and only once.
  const refund = (o: Order) =>
    confirm({
      title: t("admin.refunds.approveTitle", { amount: o.price, name: p.name }),
      body: t("admin.refunds.approveWallet"),
      tone: "success",
      confirmLabel: tb("refund"),
      onConfirm: () => {
        issueRefund({ partnerId: p.id, amount: o.price, reason: "fake_lead", orderId: o.id, note: "Booking of an offer confirmed fake." });
        toast.success(t("admin.refunds.refunded", { amount: o.price, name: p.name }));
      },
    });

  const bookingTable = (rows: Order[], fake: boolean) =>
    rows.length ? (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-start">{t("admin.shop.order")}</th>
              <th className="px-4 py-2.5 text-start">{t("admin.leads.id")}</th>
              <th className="px-4 py-2.5 text-start">{t("admin.leads.route")}</th>
              <th className="px-4 py-2.5 text-start">{t("admin.shop.channel")}</th>
              <th className="px-4 py-2.5 text-start">{t("common.fields.price")}</th>
              <th className="px-4 py-2.5 text-start">{t("common.fields.date")}</th>
              <th className="px-4 py-2.5 text-start">{t("common.fields.status")}</th>
              {fake && <th className="px-4 py-2.5 text-end">{tb("refundCol")}</th>}
              <th className="w-px px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const offer = offerMap[o.offerId];
              const confirmedFake = offer?.cancelReason === "fake";
              const r = refundOf(o);
              return (
                <tr key={o.id} className="border-t">
                  <td className="px-4 py-2.5"><Mono>{o.id}</Mono></td>
                  <td className="px-4 py-2.5"><Link href={`/admin/leads/${o.offerId}`} className="font-mono text-[13px] font-semibold text-primary hover:underline">{o.offerId}</Link></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{offer?.from.city} → {offer?.to.city}</td>
                  <td className="px-4 py-2.5">{t(`admin.shop.${o.channel}`)}</td>
                  <td className="px-4 py-2.5 font-semibold">{formatCHF(o.price, lang)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(o.createdAt, lang)}</td>
                  <td className="px-4 py-2.5">{offer && <StatusBadge status={offer.status} />}</td>
                  {fake && (
                    <td className="px-4 py-2.5 text-end">
                      {r?.status === "refunded" ? (
                        <Badge tone="success"><CheckCircle2 /> {tb("refunded")}</Badge>
                      ) : r?.status === "pending" && !confirmedFake ? (
                        <span className="text-xs text-warning">{t("admin.refunds.notFakeYet")}</span>
                      ) : confirmedFake ? (
                        <Button size="sm" variant="success" onClick={() => refund(o)}><RotateCcw /> {tb("refund")}</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground" title={tb("refundHint")}>{tb("notConfirmed")}</span>
                      )}
                    </td>
                  )}
                  <td className="px-2 py-2.5">
                    <RowActions
                      viewHref={`/admin/leads/${o.offerId}`}
                      actions={[
                        { label: t(o.executed ? "admin.rows.markNotDone" : "admin.rows.markDone"), icon: o.executed ? <RotateCcw /> : <CheckCircle2 />, onSelect: () => setExecuted(o, !o.executed) },
                        { label: t("admin.leads.detail.customerPage"), icon: <ExternalLink />, href: `/requests/${o.offerId}` },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState title={fake ? tb("noFake") : t("common.table.noResults")} className="py-8" />
    );

  return (
    <>
      <PageHeader
        crumbs={[{ label: tp("title"), href: "/admin/partners" }, { label: p.name }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={p.name} square className="size-11 rounded-xl text-sm" />
            {p.name}
            <StatusBadge status={p.banned ? "banned" : p.status} />
            <DocStateBadge partner={p} />
          </span>
        }
        subtitle={`${p.address}, ${p.zip} ${p.city} (${p.canton}) · ${p.regNumber}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setContact(true)}><Mail /> {tp("contactCo.button")}</Button>
            <Button asChild variant="outline">
              <Link href={`/companies/${p.id}`} target="_blank"><ExternalLink /> {t("admin.cms.viewOnSite")}</Link>
            </Button>
            <Button variant="outline" onClick={() => { partnerLogin(p.id); router.push("/portal"); }}>
              <Store /> {tp("openPortal")}
            </Button>
            <Button
              variant={p.banned ? "success" : "danger-soft"}
              onClick={() =>
                confirm({
                  title: t(p.banned ? "admin.partners.unbanTitle" : "admin.partners.banTitle", { name: p.name }),
                  body: t(p.banned ? "admin.partners.unbanBody" : "admin.partners.banBody"),
                  tone: p.banned ? "success" : "danger",
                  onConfirm: () => {
                    patch("partners", p.id, { banned: !p.banned });
                    toast.success(t("common.toast.updated"));
                  },
                })
              }
            >
              {p.banned ? <LockOpen /> : <Lock />} {tp(p.banned ? "unban" : "ban")}
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={tp("wallet")} value={formatCHF(p.wallet, lang)} icon={<Wallet />} footer={<button className="font-semibold text-primary hover:underline" onClick={() => setTopUp(true)}>{t("admin.wallets.topUp")}</button>} />
        <KpiCard label={tp("leadsBought")} value={ledger.leads} icon={<CheckCircle2 />} tone="info" footer={fakeBookings.length ? tb("fakeCount", { count: fakeBookings.length }) : undefined} />
        <KpiCard label={tp("spent")} value={formatCHF(ledger.spent, lang)} icon={<Wallet />} tone="accent" footer={ledger.creditDue ? `${t("admin.wallets.creditDue")}: ${formatCHF(ledger.creditDue, lang)}` : undefined} />
        <KpiCard label={tp("avgRating")} value={ratings[p.id]?.avg.toFixed(1) ?? "–"} icon={<Star />} tone="warning" footer={`${ratings[p.id]?.count ?? 0} ${tp("reviews")}`} />
      </div>

      <Tabs defaultValue={initialTab}>
        <UnderlineTabsList className="mb-4 overflow-x-auto">
          <UnderlineTabsTrigger value="overview">{tp("tabs.overview")}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="documents">{tp("docs.title")} <DocStateBadge partner={p} /></UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="bookings">{tp("tabs.bookings")} <Badge>{orders.length}</Badge></UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="wallet">{tp("tabs.wallet")}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="reviews">{tp("reviews")} <Badge>{allReviews.length}</Badge></UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="files">{tp("tabs.files")}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="messages">{tp("tabs.messages")} <Badge>{messages.length}</Badge></UnderlineTabsTrigger>
        </UnderlineTabsList>

        {/* overview: all company data, editable by admin (the company itself may only change its phone) */}
        <TabsContent value="overview" className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Card>
              <CardHeader title={tp("profile")} description={tp("adminEditsHint")} action={Object.keys(form).length > 0 && <Button size="sm" onClick={saveProfile}>{t("common.actions.save")}</Button>} />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["name", t("site.partner.companyName")],
                    ["ownerName", t("site.partner.owner")],
                    ["email", t("common.fields.email")],
                    ["phone", t("common.fields.phone")],
                    ["mobile", t("common.fields.mobile")],
                    ["website", t("common.fields.website")],
                    ["address", t("common.fields.street")],
                    ["zip", t("common.fields.zip")],
                    ["city", t("common.fields.city")],
                  ] as const
                ).map(([k, label]) => (
                  <Field key={k} label={label}>
                    <Input value={val(k)} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
                  </Field>
                ))}
                <Field label={t("site.partner.about")} className="sm:col-span-2">
                  <Textarea value={L(p.about)} readOnly rows={3} className="bg-surface-2" />
                </Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={tp("servicesOffered")} />
              <CardBody>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {p.serviceIds.map((sid) => {
                    const s = db.services.find((x) => x.id === sid);
                    return (
                      <li key={sid} className="flex items-center gap-3 rounded-xl border p-3">
                        <Icon name={s?.icon ?? "Truck"} className="size-5 text-primary" />
                        <span className="flex-1 text-sm font-semibold">{L(s?.name)}</span>
                        <Button variant="ghost" size="icon-sm" aria-label={tp("removeService")} onClick={() => patch("partners", p.id, { serviceIds: p.serviceIds.filter((x) => x !== sid) })}>
                          <X />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                {missing.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    <Select value={addSvc} onValueChange={setAddSvc} placeholder={tp("addService")} options={missing.map((s) => ({ value: s.id, label: L(s.name) }))} />
                    <Button variant="outline" disabled={!addSvc} onClick={() => { patch("partners", p.id, { serviceIds: [...p.serviceIds, addSvc] }); setAddSvc(""); toast.success(t("common.toast.updated")); }}>
                      <Plus /> {t("common.actions.add")}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader title={tp("contact")} />
              <CardBody className="space-y-2 text-sm">
                <a href={`tel:${p.phone}`} className="flex items-center gap-2 hover:text-primary"><Phone className="size-4 text-muted-foreground" />{p.phone}</a>
                <a href={`mailto:${p.email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="size-4 text-muted-foreground" />{p.email}</a>
                <p className="text-xs text-muted-foreground">{t("common.fields.lastSeen")}: {formatDateTime(p.lastSeen, lang)}</p>
                <label className="mt-2 flex items-center justify-between gap-3 rounded-xl border p-3 font-medium">
                  {tp("featured")}
                  <Switch checked={p.featured} onCheckedChange={(v) => patch("partners", p.id, { featured: v })} />
                </label>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={tp("bank")} />
              <CardBody>
                <DL cols={1} items={[{ label: t("site.partner.bankName"), value: p.bank.name }, { label: t("site.partner.bankOwner"), value: p.bank.owner }, { label: "IBAN", value: p.bank.iban, ltr: true }]} />
              </CardBody>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader title={tp("docs.title")} description={tp("docs.hint")} />
            <CardBody>
              <CompanyDocuments partner={p} as="admin" />
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title={tb("title")} description={tb("count", { count: bookings.length })} />
            <div className="mt-4 border-t">{bookingTable(bookings, false)}</div>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title={<span className="flex items-center gap-2"><AlertTriangle className="size-4 text-danger" /> {tb("fakeTitle")}</span>} description={tb("refundHint")} />
            <div className="mt-4 border-t">{bookingTable(fakeBookings, true)}</div>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="grid gap-4 xl:grid-cols-[1fr_400px]">
          <Card className="overflow-hidden">
            <CardHeader
              title={t("admin.wallets.history")}
              description={`${t("admin.wallets.toppedUp")} ${formatCHF(ledger.toppedUp, lang)} · ${t("admin.wallets.credit")} ${formatCHF(ledger.credit, lang)} · ${t("admin.wallets.refunded")} ${formatCHF(ledger.refunded, lang)}`}
              action={
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setTopUp(true)}><Plus /> {t("admin.wallets.topUp")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCredit(true)}><HandCoins /> {t("admin.wallets.addCredit")}</Button>
                </div>
              }
            />
            <WalletLedger entries={ledger.entries} className="mt-4 max-h-[520px] overflow-y-auto border-t" />
          </Card>
          <Card className="h-fit overflow-hidden">
            <CardHeader title={t("admin.invoices.creditTab")} />
            <div className="mt-4 divide-y border-t">
              {invoices.length ? (
                invoices.map((i) => {
                  const st = i.status === "paid" ? "paid" : isOverdue(i) ? "overdue" : "due";
                  return (
                    <button
                      key={i.id}
                      onClick={() => setDoc({ kind: "invoice", id: i.id, date: i.issuedAt, partner: p, line: t("admin.invoices.creditLine"), amount: i.amount, status: st, dueAt: i.dueAt, paidAt: i.paidAt })}
                      className="flex w-full items-center gap-3 px-5 py-3 text-start text-sm hover:bg-surface-2/60"
                    >
                      <Mono>{i.id}</Mono>
                      <span className="flex-1 font-semibold">{formatCHF(i.amount, lang)}</span>
                      <StatusBadge status={st} />
                    </button>
                  );
                })
              ) : (
                <EmptyState title={t("portal.payments.noInvoices")} className="py-8" />
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="w-40">
              <Select value={stars} onValueChange={setStars} options={[{ value: "all", label: tp("allRatings") }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: tp("starsN", { n }) }))]} />
            </div>
            <div className="w-40">
              <Select value={reviewStatus} onValueChange={setReviewStatus} options={[{ value: "all", label: t("common.table.all") }, ...(["approved", "pending", "rejected"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) }))]} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.length ? (
              reviews.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Stars value={r.stars} />
                    <span className="flex items-center gap-1">
                      <StatusBadge status={r.status} />
                      <RowActions
                        actions={[
                          { label: t("common.actions.approve"), icon: <CheckCircle2 />, onSelect: () => decideReview(r.id, "approved"), hidden: r.status === "approved" },
                          { label: t(r.status === "approved" ? "admin.rows.unpublish" : "common.actions.reject"), icon: <EyeOff />, onSelect: () => decideReview(r.id, "rejected"), hidden: r.status === "rejected" },
                          { label: t("admin.rows.openBooking"), icon: <ClipboardList />, href: r.offerId ? `/admin/leads/${r.offerId}` : undefined, hidden: !r.offerId, separated: true },
                          {
                            label: t("common.actions.delete"),
                            icon: <Trash2 />,
                            tone: "danger",
                            separated: true,
                            onSelect: () =>
                              confirm({
                                title: t("common.confirm.title"),
                                body: t("common.confirm.deleteBody"),
                                tone: "danger",
                                confirmLabel: t("common.actions.delete"),
                                onConfirm: () => {
                                  removeItem("reviews", r.id);
                                  toast.success(t("common.toast.deleted"));
                                },
                              }),
                          },
                        ]}
                      />
                    </span>
                  </div>
                  <p className="mt-2 text-sm">“{r.comment}”</p>
                  <p className="mt-2 text-xs text-muted-foreground">{r.name} · {formatDate(r.createdAt, lang)}</p>
                </Card>
              ))
            ) : (
              <Card className="md:col-span-2"><EmptyState title={t("site.companies.noReviews")} /></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="files">
          <FileManager partnerId={p.id} />
        </TabsContent>

        <TabsContent value="messages">
          <Card className="overflow-hidden">
            <CardHeader title={tp("tabs.messages")} action={<Button size="sm" onClick={() => setContact(true)}><MessageSquare /> {tp("contactCo.button")}</Button>} />
            <ul className="mt-4 divide-y border-t">
              {messages.length ? (
                messages.map((m) => (
                  <li key={m.id} className="px-5 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{m.subject}</span>
                      <Badge tone="neutral">{tp(`contactCo.channels.${m.channel}`)}</Badge>
                      <span className={cn("ms-auto text-xs", m.readAt ? "text-muted-foreground" : "font-semibold text-warning")}>
                        {m.readAt ? tp("contactCo.read", { date: formatDate(m.readAt, lang) }) : tp("contactCo.unread")}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-muted-foreground">{m.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{userName(m.byUserId)} · {formatDateTime(m.createdAt, lang)}</p>
                  </li>
                ))
              ) : (
                <li><EmptyState title={tp("contactCo.none")} className="py-8" /></li>
              )}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>

      {contact && <ContactCompanyDialog partner={p} onClose={() => setContact(false)} />}
      {topUp && <TopUpDialog partner={p} onClose={() => setTopUp(false)} />}
      {credit && <CreditDialog partner={p} onClose={() => setCredit(false)} />}
      {doc && <MoneyDocDialog doc={doc} onClose={() => setDoc(null)} />}
      {dialog}
    </>
  );
}

