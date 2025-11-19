import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/middleware/auth.middleware';
import { permissionMiddleware } from '@/middleware/permission.middleware';
import { 
  SecurityValidator, 
  ErrorHandler, 
  AuthValidator, 
  RateLimiters,
  DataValidator,
  ValidationError,
  AuthorizationError,
  DataNotFoundError,
  withSecurity
} from '@/lib/report-security';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    RateLimiters.reportGeneration(clientIp);

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

    // Validate and sanitize parameters
    const dateRange = {
      fromDate: startDate ? new Date(startDate) : undefined,
      toDate: endDate ? new Date(endDate) : undefined,
    };

    // Validate date range and other parameters
    SecurityValidator.validateReportParams({
      dateRange,
      branchId: branchId || undefined,
      userId: userId || undefined,
    });

    // Sanitize parameters
    const sanitizedBranchId = branchId ? SecurityValidator.sanitizeInput(branchId) : undefined;
    const sanitizedUserId = userId ? SecurityValidator.sanitizeInput(userId) : undefined;

    // Build where clause for date filtering
    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = dateRange.fromDate;
      if (endDate) whereClause.createdAt.lte = dateRange.toDate;
    }
    if (sanitizedBranchId) whereClause.branchId = sanitizedBranchId;
    if (sanitizedUserId) whereClause.userId = sanitizedUserId;

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

    // Check if data exists
    if (!employeePerformance || employeePerformance.length === 0) {
      throw new DataNotFoundError('Employee performance data');
    }

    return NextResponse.json({
      success: true,
      data: {
        employeePerformance,
        summaryStats,
        topPerformers,
        branchPerformance: branchDetails,
        filters: {
          startDate,
          endDate,
          branchId: sanitizedBranchId,
          userId: sanitizedUserId,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Employee performance report error:', error);
    const errorResponse = ErrorHandler.formatErrorResponse(error);
    ErrorHandler.logError(error, {
      endpoint: '/api/reports/employee-performance',
      method: 'GET',
      params: { startDate, endDate, branchId, userId }
    });
    
    return NextResponse.json(errorResponse, { 
      status: error.statusCode || 500 
    });
  }
}

// POST endpoint to create or update employee performance records
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    RateLimiters.reportGeneration(clientIp);

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
    if (!userId || !branchId) {
      throw new ValidationError('User ID and Branch ID are required');
    }

    // Validate and sanitize parameters
    SecurityValidator.validateReportParams({
      branchId: SecurityValidator.sanitizeInput(branchId),
      userId: SecurityValidator.sanitizeInput(userId),
    });

    // Validate numeric values
    DataValidator.validateRange(totalSales, 0, 10000000, 'Total sales');
    DataValidator.validateRange(totalTransactions, 0, 1000000, 'Total transactions');
    DataValidator.validateRange(totalItems, 0, 10000000, 'Total items');
    DataValidator.validateRange(averageTransactionValue, 0, 1000000, 'Average transaction value');
    DataValidator.validateRange(averageItemsPerTransaction, 0, 1000, 'Average items per transaction');
    DataValidator.validateRange(discountAmount || 0, 0, 1000000, 'Discount amount');
    DataValidator.validateRange(refundAmount || 0, 0, 1000000, 'Refund amount');
    DataValidator.validateRange(performanceScore || 0, 0, 100, 'Performance score');

    // Check if user and branch exist
    const userExists = await prisma.user.findUnique({
      where: { id: sanitizedUserId },
      select: { id: true, branchId: true }
    });

    const branchExists = await prisma.branch.findUnique({
      where: { id: sanitizedBranchId },
      select: { id: true }
    });

    if (!userExists) {
      throw new DataNotFoundError('User');
    }

    if (!branchExists) {
      throw new DataNotFoundError('Branch');
    }

    // Check authorization for branch access
    const user = JSON.parse(authResponse.headers.get('x-user') || '{}');
    AuthValidator.validateReportAccess(user, 'employee', sanitizedBranchId);

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

    return NextResponse.json({
      success: true,
      data: performanceRecord,
      message: existingRecord ? 'Performance record updated successfully' : 'Performance record created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Employee performance record creation error:', error);
    const errorResponse = ErrorHandler.formatErrorResponse(error);
    ErrorHandler.logError(error, {
      endpoint: '/api/reports/employee-performance',
      method: 'POST',
      body: { userId, branchId, totalSales, totalTransactions }
    });
    
    return NextResponse.json(errorResponse, { 
      status: error.statusCode || 500 
    });
  }
}