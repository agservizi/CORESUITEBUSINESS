import PDFDocument from "pdfkit";

export async function generateReceiptPdf(data: {
  title: string;
  code: string;
  clientName: string;
  amount?: string;
  lines: { label: string; value: string }[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("AG Servizi — Coresuite", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(data.title, { align: "center" });
    doc.fontSize(10).text(`Codice: ${data.code}`, { align: "center" });
    doc.moveDown();
    doc.text(`Cliente: ${data.clientName}`);
    doc.moveDown();
    for (const line of data.lines) {
      doc.text(`${line.label}: ${line.value}`);
    }
    if (data.amount) {
      doc.moveDown();
      doc.fontSize(12).text(`Importo: ${data.amount}`, { underline: true });
    }
    doc.moveDown(2);
    doc.fontSize(8).text(`Generato il ${new Date().toLocaleString("it-IT")}`, { align: "right" });
    doc.end();
  });
}

export async function generateTicketPdf(data: {
  code: string;
  subject: string;
  clientName: string;
  status: string;
  priority: string;
}): Promise<Buffer> {
  return generateReceiptPdf({
    title: "Ticket Assistenza",
    code: data.code,
    clientName: data.clientName,
    lines: [
      { label: "Oggetto", value: data.subject },
      { label: "Stato", value: data.status },
      { label: "Priorità", value: data.priority },
    ],
  });
}

export async function generateCashMovementPdf(data: {
  description: string;
  type: string;
  clientName: string;
  amount: string;
  status: string;
  method: string;
}): Promise<Buffer> {
  return generateReceiptPdf({
    title: `Movimento ${data.type}`,
    code: data.description.slice(0, 20),
    clientName: data.clientName,
    amount: data.amount,
    lines: [
      { label: "Stato", value: data.status },
      { label: "Metodo", value: data.method },
    ],
  });
}

export async function generatePracticePdf(data: {
  code: string;
  practiceType: string;
  clientName: string;
  category: string;
  status: string;
  notes?: string;
}): Promise<Buffer> {
  return generateReceiptPdf({
    title: `Pratica ${data.category}`,
    code: data.code,
    clientName: data.clientName,
    lines: [
      { label: "Tipo", value: data.practiceType },
      { label: "Stato", value: data.status },
      { label: "Note", value: data.notes || "—" },
    ],
  });
}

function eur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export async function generateCashJournalPdf(journal: {
  businessDate: string;
  generatedAt: string;
  openedBy: string;
  closedBy?: string;
  opening: { amount: number; notes?: string | null };
  closing?: { amount: number; expected: number; variance: number; notes?: string | null };
  summary: {
    totalEntrate: number;
    totalUscite: number;
    saldoNetto: number;
    margineTotale: number;
    expressSalesCount: number;
    expressSalesTotal: number;
  };
  byMethod: Array<{ method: string; entrate: number; uscite: number; netto: number }>;
  movements: Array<{
    time: string;
    type: string;
    description: string;
    method: string;
    amount: number;
    source: string;
  }>;
  expressSales: Array<{ time: string; label: string; total: number; method: string; lines: string }>;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("GIORNALE DI CASSA", { align: "center" });
    doc.fontSize(11).text(`Giornata ${journal.businessDate}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Apertura: ${journal.openedBy} · Fondo ${eur(journal.opening.amount)}`);
    if (journal.closing) {
      doc.text(
        `Chiusura: ${journal.closedBy || "—"} · Contato ${eur(journal.closing.amount)} · Atteso ${eur(journal.closing.expected)} · Scostamento ${eur(journal.closing.variance)}`
      );
    }
    doc.moveDown();

    doc.fontSize(12).text("Riepilogo economico", { underline: true });
    doc.fontSize(10);
    doc.text(`Entrate totali: ${eur(journal.summary.totalEntrate)}`);
    doc.text(`Uscite totali: ${eur(journal.summary.totalUscite)}`);
    doc.text(`Saldo netto giornata: ${eur(journal.summary.saldoNetto)}`);
    doc.text(`Margine registrato: ${eur(journal.summary.margineTotale)}`);
    doc.text(
      `Vendite Express: ${journal.summary.expressSalesCount} · ${eur(journal.summary.expressSalesTotal)}`
    );
    doc.moveDown();

    if (journal.byMethod.length) {
      doc.fontSize(12).text("Incassi per metodo di pagamento", { underline: true });
      doc.fontSize(9);
      for (const row of journal.byMethod) {
        doc.text(
          `${row.method}: +${eur(row.entrate)} / -${eur(row.uscite)} = ${eur(row.netto)}`
        );
      }
      doc.moveDown();
    }

    if (journal.expressSales.length) {
      doc.fontSize(12).text("Vendite Express", { underline: true });
      doc.fontSize(9);
      for (const s of journal.expressSales) {
        const t = new Date(s.time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
        doc.text(`${t} · ${s.label} · ${s.method} · ${eur(s.total)}`);
        if (s.lines) doc.text(`   ${s.lines}`, { indent: 12 });
      }
      doc.moveDown();
    }

    if (journal.movements.length) {
      doc.fontSize(12).text("Movimenti di cassa", { underline: true });
      doc.fontSize(8);
      for (const m of journal.movements) {
        const t = new Date(m.time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
        const sign = m.type === "ENTRATA" ? "+" : "-";
        doc.text(
          `${t} · ${sign}${eur(m.amount)} · ${m.method} · ${m.source} · ${m.description.slice(0, 60)}`
        );
      }
    }

    doc.moveDown(2);
    doc.fontSize(8).text(
      `Generato il ${new Date(journal.generatedAt).toLocaleString("it-IT")}`,
      { align: "right" }
    );
    doc.end();
  });
}
