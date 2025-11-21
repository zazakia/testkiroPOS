import { NextRequest, NextResponse } from 'next/server';
import { roleService } from '@/services/role.service';
import { updateRoleSchema } from '@/lib/validations/role.validation';
import { NotFoundError, ValidationError } from '@/lib/errors';

/**
 * GET /api/roles/[id]
 * Fetch a single role by ID with permissions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const role = await roleService.getRoleById(params.id);

    return NextResponse.json({
      success: true,
      data: role,
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
        error: error.message || 'Failed to fetch role',
      },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * PUT /api/roles/[id]
 * Update a role's details (name, description)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = updateRoleSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      throw new ValidationError('Invalid role data', errors);
    }

    const role = await roleService.updateRole(params.id, validationResult.data);

    return NextResponse.json({
      success: true,
      data: role,
      message: 'Role updated successfully',
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
        error: error.message || 'Failed to update role',
      },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * DELETE /api/roles/[id]
 * Delete a role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await roleService.deleteRole(params.id);

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully',
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
        error: error.message || 'Failed to delete role',
      },
      { status: error.statusCode || 500 }
    );
  }
}
