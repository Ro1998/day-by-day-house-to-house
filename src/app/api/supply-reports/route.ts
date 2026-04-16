import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireApprovedUser } from '@/lib/auth'

const RESOLVED_REPORT_RETENTION_DAYS = 7

const serializeReport = (report: Awaited<ReturnType<typeof prisma.supplyReport.findFirstOrThrow>> & { createdBy: { name: string } }) => ({
  id: report.id,
  title: report.title,
  category: report.category,
  itemName: report.itemName,
  message: report.message,
  status: report.status,
  response: report.response,
  createdBy: report.createdBy.name,
  createdById: report.createdById,
  createdAt: report.createdAt.toISOString(),
  updatedAt: report.updatedAt.toISOString(),
})

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error

    const retentionCutoff = new Date(Date.now() - RESOLVED_REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000)

    await prisma.supplyReport.deleteMany({
      where: {
        status: 'resolved',
        updatedAt: {
          lt: retentionCutoff,
        },
      },
    })

    const reports = await prisma.supplyReport.findMany({
      include: { createdBy: true },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(reports.map(serializeReport), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    return apiError('supply-reports.GET', error, 'Failed to fetch supply reports')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error
    const body = await request.json()
    const report = await prisma.supplyReport.create({
      data: {
        title: String(body.title).trim(),
        category: String(body.category),
        itemName: body.itemName ? String(body.itemName).trim() : null,
        message: String(body.message).trim(),
        status: String(body.status ?? 'missing'),
        createdById: body.userId,
      },
      include: { createdBy: true },
    })
    return NextResponse.json(serializeReport(report))
  } catch (error) {
    return apiError('supply-reports.POST', error, 'Failed to create supply report')
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error
    const body = await request.json()
    const report = await prisma.supplyReport.update({
      where: { id: String(body.id) },
      data: {
        status: body.status ? String(body.status) : undefined,
        response: body.response != null ? String(body.response).trim() : undefined,
      },
      include: { createdBy: true },
    })
    return NextResponse.json(serializeReport(report))
  } catch (error) {
    return apiError('supply-reports.PATCH', error, 'Failed to update supply report')
  }
}
