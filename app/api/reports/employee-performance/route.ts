import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/middleware/auth.middleware';
import { permissionMiddleware } from '@/middleware/permission.middleware';

export async function GET(request: NextRequest) {
  try {
    // Apply authentication and permission middleware
    const authResponse = await authMiddleware(request);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    const permissionResponse = await permissionMiddleware(request, ['view_reports']);
    if (permissionResponse.status !== 200) {
      return permissionResponse;
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchId = searchParams.get('branchId');
    const userId = searchParams.get('userId');

    // Build where clause for date filtering
    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }
    if (branchId) whereClause.branchId = branchId;
    if (userId) whereClause.userId = userId;

    // Get employee performance data
    const employeePerformance = await prisma.employeePerformance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary statistics
    const summaryStats = await prisma.employeePerformance.aggregate({
      where: whereClause,
      _sum: {
        totalSales: true,
        totalTransactions: true,
        totalItems: true,
        discountAmount: true,
        refundAmount: true,
      },
      _avg: {
        averageTransactionValue: true,
        averageItemsPerTransaction: true,
      },
      _count: {
        id: true,
      },
    });

    // Get top performers
    const topPerformers = await prisma.employeePerformance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: {
        totalSales: 'desc',
      },
      take: 10,
    });

    // Calculate performance metrics by branch
    const branchPerformance = await prisma.employeePerformance.groupBy({
      by: ['branchId'],
      where: whereClause,
      _sum: {
        totalSales: true,
        totalTransactions: true,
        totalItems: true,
        discountAmount: true,
        refundAmount: true,
      },
      _avg: {
        averageTransactionValue: true,
        averageItemsPerTransaction: true,
      },
      _count: {
        id: true,
      },
    });

    // Get branch details for performance data
    const branchDetails = await Promise.all(
      branchPerformance.map(async (branch) => {
        const branchInfo = await prisma.branch.findUnique({
          where: { id: branch.branchId },
          select: { id: true, name: true, code: true },
        });
        return {
          ...branch,
          branch: branchInfo,
        };
      })
    );

    return NextResponse.json({
      employeePerformance,
      summaryStats,
      topPerformers,
      branchPerformance: branchDetails,
      filters: {
        startDate,
        endDate,
        branchId,
        userId,
      },
    });
  } catch (error) {
    console.error('Employee performance report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate employee performance report' },
      { status: 500 }
    );
  }
}

// POST endpoint to create or update employee performance records
export async function POST(request: NextRequest) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    const permissionResponse = await permissionMiddleware(request, ['manage_reports']);
    if (permissionResponse.status !== 200) {
      return permissionResponse;
    }

    const body = await request.json();
    const {
      userId,
      branchId,
      totalSales,
      totalTransactions,
      totalItems,
      averageTransactionValue,
      averageItemsPerTransaction,
      discountAmount,
      refundAmount,
      performanceScore,
      notes,
    } = body;

    // Validate required fields
    if (!userId || !branchId || totalSales === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, branchId, totalSales' },
        { status: 400 }
      );
    }

    // Check if performance record exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingRecord = await prisma.employeePerformance.findFirst({
      where: {
        userId,
        branchId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    let performanceRecord;
    if (existingRecord) {
      // Update existing record
      performanceRecord = await prisma.employeePerformance.update({
        where: { id: existingRecord.id },
        data: {
          totalSales,
          totalTransactions,
          totalItems,
          averageTransactionValue,
          averageItemsPerTransaction,
          discountAmount,
          refundAmount,
          performanceScore,
          notes,
        },
      });
    } else {
      // Create new record
      performanceRecord = await prisma.employeePerformance.create({
        data: {
          userId,
          branchId,
          totalSales,
          totalTransactions,
          totalItems,
          averageTransactionValue,
          averageItemsPerTransaction,
          discountAmount,
          refundAmount,
          performanceScore,
          notes,
        },
      });
    }

    return NextResponse.json(performanceRecord);
  } catch (error) {
    console.error('Employee performance record creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create employee performance record' },
      { status: 500 }
    );
  }
}