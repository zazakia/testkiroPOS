import { NextRequest, NextResponse } from 'next/server';
import { roleService } from '@/services/role.service';
import { assignPermissionsSchema } from '@/lib/validations/role.validation';
import { NotFoundError, ValidationError } from '@/lib/errors';

/**
 * GET /api/roles/[id]/permissions
 * Get all permissions assigned to a role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissions = await roleService.getRolePermissions(params.id);

    return NextResponse.json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch role permissions',
      },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * PUT /api/roles/[id]/permissions
 * Bulk assign/update permissions for a role
 * This replaces all existing permissions with the provided list
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = assignPermissionsSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      throw new ValidationError('Invalid permission data', errors);
    }

    const { permissionIds } = validationResult.data;

    // Assign permissions to role
    await roleService.assignPermissions(params.id, permissionIds);

    // Fetch updated role with permissions
    const role = await roleService.getRoleById(params.id);

    return NextResponse.json({
      success: true,
      data: role,
      message: 'Permissions updated successfully',
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update permissions',
      },
      { status: error.statusCode || 500 }
    );
  }
}
