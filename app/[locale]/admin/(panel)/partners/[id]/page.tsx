"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, CheckCircle2, ExternalLink, FileText, Lock, LockOpen, Mail, Phone, Plus, Star, Store, Upload, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { cn, formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, usePartnerRatings } from "@/lib/mock/hooks";
import { partnerLedger } from "@/lib/mock/selectors";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Avatar, Switch } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/tabs";
import { EmptyState, Stars, StatusBadge, useConfirm } from "@/components/shared/bits";
import { Icon } from "@/components/shared/icon";
import { DL, KpiCard, Mono, PageHeader } from "@/components/admin/ui";
import { ExpiryDialog } from "@/components/admin/expiry-dialog";

export default function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const tp = useTranslations("admin.partners");
  const L = useL();
  const lang = useLang();
  const p = useStore((s) => s.partners.find((x) => x.id === id));
  const db = useStore();
  const patch = useStore((s) => s.patch);
  const partnerLogin = useStore((s) => s.partnerLogin);
  const router = useRouter();
  const ratings = usePartnerRatings();
  const { confirm, dialog } = useConfirm();
  const [email, setEmail] = useState(false);
  const [expiry, setExpiry] = useState(false);
  const [walletDlg, setWalletDlg] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [addSvc, setAddSvc] = useState("");

  if (!p) return <Card><EmptyState title={t("common.notFound.title")} /></Card>;

  const ledger = partnerLedger(db, p.id);
  const orders = db.orders.filter((o) => o.partnerId === p.id);
  const reviews = db.reviews.filter((r) => r.target === p.id);
  const dues = db.dues.filter((d) => d.partnerId === p.id);
  const offerMap = Object.fromEntries(db.offers.map((o) => [o.id, o]));
  const missing = db.services.filter((s) => s.active && !p.serviceIds.includes(s.id));
  const val = (k: keyof typeof p) => form[k as string] ?? String(p[k] ?? "");

  const saveProfile = async () => {
    await mock(() =>
      patch("partners", p.id, {
        name: val("name"),
        email: val("email"),
        phone: val("phone"),
        website: val("website"),
        ownerName: val("ownerName"),
        address: val("address"),
        city: val("city"),
        zip: val("zip"),
      }),
    );
    setForm({});
    toast.success(t("common.toast.saved"));
  };

  const doc = (key: "contract" | "insurance" | "register", label: string) => {
    const file = p.documents[key];
    return (
      <li className="flex items-center gap-3 rounded-xl border p-3">
        <span className={cn("flex size-10 items-center justify-center rounded-lg", file ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="truncate text-xs text-muted-foreground" dir="ltr">{file ?? tp("notUploaded")}</p>
        </div>
        {file ? (
          <Button variant="ghost" size="sm" onClick={() => toast.info(file)}>{t("common.actions.view")}</Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              patch("partners", p.id, { documents: { ...p.documents, [key]: `${key}-${Date.now().toString().slice(-4)}.pdf` } });
              toast.success(t("common.toast.updated"));
            }}
          >
            <Upload /> {t("common.actions.upload")}
          </Button>
        )}
      </li>
    );
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: tp("title"), href: "/admin/partners" }, { label: p.name }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={p.name} square className="size-11 rounded-xl text-sm" />
            {p.name}
            <StatusBadge status={p.banned ? "banned" : p.status} />
          </span>
        }
        subtitle={`${p.address}, ${p.zip} ${p.city} · ${p.regNumber}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEmail(true)}><Mail /> {tp("sendEmail")}</Button>
            <Button asChild variant="outline">
              <Link href={`/companies/${p.id}`} target="_blank"><ExternalLink /> {t("admin.cms.viewOnSite")}</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                partnerLogin(p.id);
                router.push("/portal");
              }}
            >
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
        <KpiCard label={tp("wallet")} value={formatCHF(p.wallet, lang)} icon={<Wallet />} footer={<button className="font-semibold text-primary hover:underline" onClick={() => setWalletDlg(true)}>{tp("adjustWallet")}</button>} />
        <KpiCard label={tp("leadsBought")} value={ledger.leads} icon={<CheckCircle2 />} tone="info" />
        <KpiCard label={tp("spent")} value={formatCHF(ledger.purchased, lang)} icon={<Wallet />} tone="accent" footer={`${t("admin.kompassDues.outstanding")}: ${formatCHF(ledger.outstanding, lang)}`} />
        <KpiCard label={tp("avgRating")} value={ratings[p.id]?.avg.toFixed(1) ?? "–"} icon={<Star />} tone="warning" footer={`${ratings[p.id]?.count ?? 0} ${tp("reviews")}`} />
      </div>

      <Tabs defaultValue="profile">
        <UnderlineTabsList className="mb-4">
          <UnderlineTabsTrigger value="profile">{tp("profile")}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="orders">{tp("orders")} <Badge>{orders.length}</Badge></UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="payments">{tp("payments")} <Badge>{dues.length}</Badge></UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="reviews">{tp("reviews")} <Badge>{reviews.length}</Badge></UnderlineTabsTrigger>
        </UnderlineTabsList>

        <TabsContent value="profile" className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Card>
              <CardHeader title={tp("profile")} action={Object.keys(form).length > 0 && <Button size="sm" onClick={saveProfile}>{t("common.actions.save")}</Button>} />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["name", t("site.partner.companyName")],
                    ["ownerName", t("site.partner.owner")],
                    ["email", t("common.fields.email")],
                    ["phone", t("common.fields.phone")],
                    ["website", t("common.fields.website")],
                    ["address", t("common.fields.street")],
                    ["zip", t("common.fields.zip")],
                    ["city", t("common.fields.city")],
                  ] as const
                ).map(([k, label]) => (
                  <Field key={k} label={label}>
                    <Input value={val(k)} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} dir={["email", "phone", "website", "zip"].includes(k) ? "ltr" : undefined} />
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
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={tp("removeService")}
                          onClick={() => patch("partners", p.id, { serviceIds: p.serviceIds.filter((x) => x !== sid) })}
                        >
                          <X />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                {missing.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    <Select value={addSvc} onValueChange={setAddSvc} placeholder={tp("addService")} options={missing.map((s) => ({ value: s.id, label: L(s.name) }))} />
                    <Button
                      variant="outline"
                      disabled={!addSvc}
                      onClick={() => {
                        patch("partners", p.id, { serviceIds: [...p.serviceIds, addSvc] });
                        setAddSvc("");
                        toast.success(t("common.toast.updated"));
                      }}
                    >
                      <Plus /> {t("common.actions.add")}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader title={tp("documents")} />
              <CardBody>
                <ul className="space-y-2">
                  {doc("contract", tp("contract"))}
                  {doc("insurance", tp("insurance"))}
                  {doc("register", tp("register"))}
                </ul>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 p-3 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><CalendarClock className="size-4" />{tp("expires")}</span>
                  <span className="font-semibold">{p.expiresAt ? formatDate(p.expiresAt, lang) : "–"}</span>
                  <Button variant="link" size="sm" onClick={() => setExpiry(true)}>{tp("changeExpiry")}</Button>
                </div>
                <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border p-3 text-sm font-medium">
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
            <Card>
              <CardHeader title={tp("contact")} />
              <CardBody className="space-y-2 text-sm">
                <a href={`tel:${p.phone}`} className="flex items-center gap-2 hover:text-primary" dir="ltr"><Phone className="size-4 text-muted-foreground" />{p.phone}</a>
                <a href={`mailto:${p.email}`} className="flex items-center gap-2 hover:text-primary" dir="ltr"><Mail className="size-4 text-muted-foreground" />{p.email}</a>
                <p className="text-xs text-muted-foreground">{t("common.fields.lastSeen")}: {formatDateTime(p.lastSeen, lang)}</p>
              </CardBody>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="overflow-hidden">
            {orders.length ? (
              <table className="w-full text-sm">
                <thead className="bg-surface-2/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-start">{t("admin.shop.order")}</th>
                    <th className="px-4 py-2.5 text-start">{t("admin.leads.id")}</th>
                    <th className="px-4 py-2.5 text-start">{t("admin.leads.route")}</th>
                    <th className="px-4 py-2.5 text-start">{t("admin.shop.channel")}</th>
                    <th className="px-4 py-2.5 text-start">{t("common.fields.price")}</th>
                    <th className="px-4 py-2.5 text-start">{t("common.fields.date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 25).map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="px-4 py-2.5"><Mono>{o.id}</Mono></td>
                      <td className="px-4 py-2.5"><Link href={`/admin/leads/${o.offerId}`} className="font-mono text-[13px] font-semibold text-primary hover:underline" dir="ltr">{o.offerId}</Link></td>
                      <td className="px-4 py-2.5 text-muted-foreground">{offerMap[o.offerId]?.from.city} → {offerMap[o.offerId]?.to.city}</td>
                      <td className="px-4 py-2.5">{t(`admin.shop.${o.channel}`)}</td>
                      <td className="px-4 py-2.5 font-semibold">{formatCHF(o.price, lang)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{formatDate(o.createdAt, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title={t("common.table.noResults")} />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="divide-y">
            {dues.length ? (
              dues.map((d) => (
                <div key={d.id} className="flex items-center gap-4 p-4 text-sm">
                  <Mono>{d.id}</Mono>
                  <span className="flex-1 text-muted-foreground">{t(`admin.dues.${d.method}`)} · {d.reference}</span>
                  <span className="font-semibold">{formatCHF(d.amount, lang)}</span>
                  <StatusBadge status={d.status} />
                  <span className="w-28 text-end text-muted-foreground">{formatDate(d.createdAt, lang)}</span>
                </div>
              ))
            ) : (
              <EmptyState title={t("common.table.noResults")} />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.length ? (
              reviews.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <Stars value={r.stars} />
                    <StatusBadge status={r.status} />
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
      </Tabs>

      <EmailDialog open={email} onOpenChange={setEmail} to={p.email} name={p.name} />
      <ExpiryDialog open={expiry} onOpenChange={setExpiry} current={p.expiresAt} onSave={(d) => patch("partners", p.id, { expiresAt: d })} />
      <WalletDialog open={walletDlg} onOpenChange={setWalletDlg} current={p.wallet} onSave={(v) => patch("partners", p.id, { wallet: v })} />
      {dialog}
    </>
  );
}

function EmailDialog({ open, onOpenChange, to, name }: { open: boolean; onOpenChange: (v: boolean) => void; to: string; name: string }) {
  const t = useTranslations();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.partners.emailTo", { name })}</DialogTitle>
        </DialogHeader>
        <Field label={t("common.fields.email")}><Input value={to} readOnly dir="ltr" className="bg-surface-2" /></Field>
        <Field label={t("common.fields.message")}><Textarea rows={6} value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.actions.cancel")}</Button>
          <Button
            loading={busy}
            disabled={msg.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              await mock(() => null);
              setBusy(false);
              setMsg("");
              onOpenChange(false);
              toast.success(t("admin.partners.emailSent", { email: to }));
            }}
          >
            <Mail /> {t("common.actions.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WalletDialog({ open, onOpenChange, current, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; current: number; onSave: (v: number) => void }) {
  const t = useTranslations();
  const [delta, setDelta] = useState("0");
  const next = current + (Number(delta) || 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t("admin.partners.adjustWallet")}</DialogTitle></DialogHeader>
        <Field label="± CHF" hint={`${current} → ${next} CHF`}>
          <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} dir="ltr" />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.actions.cancel")}</Button>
          <Button onClick={() => { onSave(Math.max(0, next)); onOpenChange(false); setDelta("0"); toast.success(t("admin.partners.walletUpdated")); }}>{t("common.actions.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
