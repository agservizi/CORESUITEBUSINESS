import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import type { CashDayJournal } from "@/lib/platform/cash-register-service";
import { generateCashJournalPdf } from "@/lib/pdf";

type Params = { id: string };

export const GET = async (request: Request, routeContext: { params: Promise<Params> }) => {
  const params = await routeContext.params;
  return withApi(
    async () => {
      const session = await prisma.cashRegisterSession.findUnique({
        where: { id: params.id },
      });
      if (!session?.journal) {
        return NextResponse.json({ error: "Giornale non disponibile" }, { status: 404 });
      }

      const journal = session.journal as unknown as CashDayJournal;
      const buffer = await generateCashJournalPdf(journal);
      const filename = `giornale-cassa-${journal.businessDate}.pdf`;

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    },
    { requireCsrf: false, serviceSlug: "entrate-uscite" }
  )(request as never, routeContext);
};
