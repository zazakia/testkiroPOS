import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { Product } from '@prisma/client';
import { CreateProductInput, UpdateProductInput, ProductWithUOMs, ProductFilters } from '@/types/product.types';

export class ProductRepository {
  async findAll(filters?: ProductFilters): Promise<ProductWithUOMs[]> {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    return await prisma.product.findMany({
      where,
      include: {
        ProductUOM: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<ProductWithUOMs | null> {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        ProductUOM: true,
      },
    });
  }

  async findByName(name: string): Promise<Product | null> {
    return await prisma.product.findUnique({
      where: { name },
    });
  }

  async findActive(): Promise<ProductWithUOMs[]> {
    return await prisma.product.findMany({
      where: { status: 'active' },
      include: {
        ProductUOM: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: CreateProductInput): Promise<ProductWithUOMs> {
    const { ProductUOM, ...productData } = data;

    return await prisma.product.create({
      data: {
        ...productData,
        updatedAt: new Date(),
        ProductUOM: ProductUOM && ProductUOM.length > 0
          ? {
              create: ProductUOM.map(u => ({ id: randomUUID(), ...u })),
            }
          : undefined,
      },
      include: {
        ProductUOM: true,
      },
    });
  }

  async update(id: string, data: UpdateProductInput): Promise<ProductWithUOMs> {
    const { ProductUOM, ...productData } = data;

    // If ProductUOM are provided, we need to handle them separately
    if (ProductUOM !== undefined) {
      // Delete existing alternate UOMs and create new ones
      await prisma.productUOM.deleteMany({
        where: { productId: id },
      });

      return await prisma.product.update({
        where: { id },
        data: {
          ...productData,
          updatedAt: new Date(),
          ProductUOM: ProductUOM.length > 0
            ? {
                create: ProductUOM.map(u => ({ id: randomUUID(), ...u })),
              }
            : undefined,
        },
        include: {
          ProductUOM: true,
        },
      });
    }

    // If no ProductUOM provided, just update product data
    return await prisma.product.update({
      where: { id },
      data: { ...productData, updatedAt: new Date() },
      include: {
        ProductUOM: true,
      },
    });
  }

  async delete(id: string): Promise<Product> {
    return await prisma.product.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: 'active' | 'inactive'): Promise<Product> {
    return await prisma.product.update({
      where: { id },
      data: { status },
    });
  }
}

export const productRepository = new ProductRepository();
