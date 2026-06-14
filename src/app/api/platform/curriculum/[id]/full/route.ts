import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import {
  getCurriculumFull,
  updateCurriculumProfile,
  addCurriculumExperience,
  addCurriculumEducation,
  addCurriculumSkill,
  addCurriculumLanguage,
  deleteCurriculumSection,
} from "@/lib/platform/energia-curriculum-service";

export const GET = withApi(
  async (_req, { params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    const curriculum = await getCurriculumFull(id);
    if (!curriculum) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    return NextResponse.json({ curriculum });
  },
  { requireCsrf: false, serviceSlug: "curriculum" }
);

export const PATCH = withApi(
  async (request, { params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    const body = await request.json();
    const curriculum = await updateCurriculumProfile(id, body);
    return NextResponse.json({ curriculum });
  },
  { serviceSlug: "curriculum" }
);

export const POST = withApi(
  async (request, { params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    const body = await request.json();
    switch (body.section) {
      case "experience":
        return NextResponse.json({ item: await addCurriculumExperience(id, body) }, { status: 201 });
      case "education":
        return NextResponse.json({ item: await addCurriculumEducation(id, body) }, { status: 201 });
      case "skill":
        return NextResponse.json({ item: await addCurriculumSkill(id, String(body.name), body.level) }, { status: 201 });
      case "language":
        return NextResponse.json(
          { item: await addCurriculumLanguage(id, String(body.language), String(body.level)) },
          { status: 201 }
        );
      default:
        return NextResponse.json({ error: "Sezione non valida" }, { status: 400 });
    }
  },
  { serviceSlug: "curriculum" }
);

export const DELETE = withApi(
  async (request, { params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    const body = await request.json();
    await deleteCurriculumSection(body.section, String(body.itemId));
    return NextResponse.json({ success: true });
  },
  { serviceSlug: "curriculum" }
);
