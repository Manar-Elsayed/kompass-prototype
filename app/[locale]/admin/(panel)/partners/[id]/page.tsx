"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check, CheckCircle2, ClipboardList, ExternalLink, EyeOff, HandCoins, Landmark, Lock, LockOpen, Mail, Phone, Plus, RotateCcw, Star, Store, Trash2, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import type { Order, Payout, Review } from "@/lib/types";
import { cn, formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, usePartnerRatings } from "@/lib/mock/hooks";
import { isOverdue, walletLedger } from "@/lib/mock/selectors";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Avatar, Switch } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/tabs";
import { EmptyState, Stars, StatusBadge, useConfirm } from "@/components/shared/bits";
import { WalletLedger } from "@/components/shared/wallet-ledger";
import { MoneyDocDialog, type MoneyDoc } from "@/components/shared/money-doc";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { DL, KpiCard, Mono, ProfileHeader } from "@/components/admin/ui";
import { CreditDialog, TopUpDialog } from "@/components/admin/wallet-actions";
import { DocStateBadge } from "@/components/admin/doc-state";
import { PartnerServices } from "@/components/shared/partner-services";
import { CompanyDocuments } from "@/components/admin/company-docs";
import { FileManager } from "@/components/admin/file-manager";
import { PayoutDecisionDialog } from "@/components/admin/payout-actions";
import { MessageCenter } from "@/components/shared/message-thread";
import { routeText } from "@/lib/jobs";

const TABS = ["overview", "documents", "bookings", "wallet", "reviews", "files", "messages"] as const;

export default function PartnerDetailPage() {
  return (
    <Suspense>
      <PartnerDetail />
    </Suspense>
  );
}

function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
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
  const [topUp, setTopUp] = useState(false);
  const [credit, setCredit] = useState(false);
  const [doc, setDoc] = useState<MoneyDoc | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("overview");
  const [thread, setThread] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<{ payout: Payout; decision: "paid" | "rejected" } | null>(null);
  // deep links from notifications: ?tab=messages, ?tab=wallet
  const wanted = params.get("tab");
  useEffect(() => {
    if (wanted && (TABS as readonly string[]).includes(wanted)) setTab(wanted);
  }, [wanted]);

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
  const allReviews = db.reviews.filter((r) => r.target === p.id);
  const reviewColumns: ColumnDef<Review, unknown>[] = [
    { id: "stars", header: tp("rating"), accessorFn: (r) => r.stars, cell: ({ row: { original: r } }) => <Stars value={r.stars} /> },
    {
      id: "comment",
      header: tp("review"),
      enableSorting: false,
      accessorFn: (r) => r.comment,
      cell: ({ row: { original: r } }) => <p className="line-clamp-2 min-w-48 text-sm text-ink">“{r.comment}”</p>,
    },
    {
      id: "name",
      header: tp("reviewer"),
      accessorFn: (r) => r.name,
      cell: ({ row: { original: r } }) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold text-ink">{r.name}</p>
          {r.offerId && <Mono className="text-xs text-muted-foreground">{r.offerId}</Mono>}
        </div>
      ),
    },
    { id: "date", header: t("common.fields.date"), accessorFn: (r) => r.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    { id: "status", header: t("common.fields.status"), accessorFn: (r) => r.status, cell: (c) => <StatusBadge status={c.getValue() as string} /> },
    actionsColumn<Review>((r) => (
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
    )),
  ];
  const invoices = db.invoices.filter((i) => i.partnerId === p.id);
  const unreadFromCompany = db.messages.filter((m) => m.partnerId === p.id && m.from === "company" && !m.readAt).length;
  const threadCount = new Set(db.messages.filter((m) => m.partnerId === p.id).map((m) => m.threadId)).size;
  const payouts = db.payouts.filter((x) => x.partnerId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
                  <td className="px-4 py-2.5 text-muted-foreground">{offer ? routeText(offer) : "–"}</td>
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
                        { label: t("admin.leads.survey.openSurvey"), icon: <ExternalLink />, href: `/requests/${o.offerId}` },
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
      <ProfileHeader
        crumbs={[{ label: tp("title"), href: "/admin/partners" }, { label: p.name }]}
        avatar={<Avatar name={p.name} square className="size-14 rounded-2xl text-base" />}
        title={p.name}
        badges={
          <>
            <StatusBadge status={p.banned ? "banned" : p.status} />
            <DocStateBadge partner={p} standalone />
          </>
        }
        subtitle={`${p.address}, ${p.zip} ${p.city} (${p.canton}) · ${p.regNumber}`}
        primary={
          <>
            {/* featured among the companies on the homepage (a banned company can't be) */}
            {!p.banned && (
              <label className="flex h-10 items-center gap-2 rounded-lg border bg-surface px-3 text-sm font-medium">
                <Switch
                  checked={p.featured}
                  onCheckedChange={(v) => {
                    patch("partners", p.id, { featured: v });
                    toast.success(t(v ? "admin.rows.featured" : "admin.rows.unfeatured", { name: p.name }));
                  }}
                />
                {tp("featured")}
              </label>
            )}
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
        secondary={
          <>
            <Button asChild variant="outline">
              <Link href={`/companies/${p.id}`} target="_blank"><ExternalLink /> {t("admin.cms.viewOnSite")}</Link>
            </Button>
            <Button variant="outline" onClick={() => { partnerLogin(p.id); router.push("/portal"); }}>
              <Store /> {tp("openPortal")}
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={tp("wallet")} value={formatCHF(p.wallet, lang)} icon={<Wallet />} />
        <KpiCard label={tp("leadsBought")} value={ledger.leads} icon={<CheckCircle2 />} tone="info" footer={fakeBookings.length ? tb("fakeCount", { count: fakeBookings.length }) : undefined} />
        <KpiCard label={tp("spent")} value={formatCHF(ledger.spent, lang)} icon={<Wallet />} tone="accent" footer={ledger.creditDue ? `${t("admin.wallets.creditDue")}: ${formatCHF(ledger.creditDue, lang)}` : undefined} />
        <KpiCard label={tp("avgRating")} value={ratings[p.id]?.avg.toFixed(1) ?? "–"} icon={<Star />} tone="warning" footer={`${ratings[p.id]?.count ?? 0} ${tp("reviews")}`} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <UnderlineTabsList className="mb-4 overflow-x-auto">
          <UnderlineTabsTrigger value="overview">{tp("tabs.overview")}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="documents">{tp("docs.title")} <DocStateBadge partner={p} /></UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="bookings">{tp("tabs.bookings")} <Badge>{orders.length}</Badge></UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="wallet">{tp("tabs.wallet")}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="reviews">{tp("reviews")} <Badge>{allReviews.length}</Badge></UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="files">{tp("tabs.files")}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="messages">{tp("tabs.messages")} <Badge tone={unreadFromCompany ? "accent" : "neutral"}>{unreadFromCompany || threadCount}</Badge></UnderlineTabsTrigger>
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
                {/* Kompass only pauses and resumes; the company adds and removes in its portal */}
                <PartnerServices partner={p} />
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
                  <Button size="sm" variant="outline" onClick={() => setCredit(true)}><HandCoins /> {t("admin.wallets.addCredit")}</Button>
                  {/* rare: money that reached Kompass outside the partner dashboard (cash, a transfer without a receipt) */}
                  <Button size="sm" variant="ghost" onClick={() => setTopUp(true)}><Plus /> {t("admin.wallets.topUp")}</Button>
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
          <Card className="h-fit overflow-hidden xl:col-start-2">
            <CardHeader title={t("admin.payouts.title")} />
            <div className="mt-4 divide-y border-t">
              {payouts.length ? (
                payouts.map((x) => (
                  <div key={x.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <Landmark className="size-4 text-muted-foreground" />
                    <Mono>{x.id}</Mono>
                    <span className="flex-1 font-semibold">{formatCHF(x.amount, lang)}</span>
                    {x.status === "requested" ? (
                      <span className="flex gap-1.5">
                        <Button size="sm" variant="success" onClick={() => setDeciding({ payout: x, decision: "paid" })}><Check /> {t("admin.payouts.pay")}</Button>
                        <Button size="icon-sm" variant="danger-soft" onClick={() => setDeciding({ payout: x, decision: "rejected" })} aria-label={t("common.actions.reject")}><X /></Button>
                      </span>
                    ) : (
                      <StatusBadge status={x.status} />
                    )}
                  </div>
                ))
              ) : (
                <EmptyState title={t("admin.payouts.none")} className="py-8" />
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <DataTable
            data={allReviews}
            columns={reviewColumns}
            initialSort={[{ id: "date", desc: true }]}
            search={(r) => `${r.name} ${r.comment} ${r.offerId ?? ""}`}
            searchPlaceholder={tp("reviewsSearchPh")}
            wideSearch
            filters={[
              { id: "stars", label: tp("rating"), options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: tp("starsN", { n }) })), get: (r) => String(r.stars) },
              { id: "status", label: t("common.fields.status"), options: (["pending", "approved", "rejected"] as const).map((x) => ({ value: x, label: t(`common.status.${x}`) })), get: (r) => r.status },
            ]}
            emptyState={<EmptyState title={t("site.companies.noReviews")} />}
          />
        </TabsContent>

        <TabsContent value="files">
          <FileManager partnerId={p.id} />
        </TabsContent>

        <TabsContent value="messages">
          <p className="mb-3 text-sm text-muted-foreground">{tp("threadsHint")}</p>
          <MessageCenter
            partnerId={p.id}
            partnerName={p.name}
            partnerEmail={p.email}
            viewer="kompass"
            selected={thread}
            onSelect={setThread}
            canStart
            autoOpen
            empty={<EmptyState title={tp("contactCo.none")} className="py-12" />}
          />
        </TabsContent>
      </Tabs>

      {topUp && <TopUpDialog partner={p} onClose={() => setTopUp(false)} />}
      {credit && <CreditDialog partner={p} onClose={() => setCredit(false)} />}
      {doc && <MoneyDocDialog doc={doc} onClose={() => setDoc(null)} />}
      {deciding && <PayoutDecisionDialog payout={deciding.payout} decision={deciding.decision} onClose={() => setDeciding(null)} />}
      {dialog}
    </>
  );
}

