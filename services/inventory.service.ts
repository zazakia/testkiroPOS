import { prisma } from '@/lib/prisma';
import { inventoryRepository } from '@/repositories/inventory.repository';
import { productService } from '@/services/product.service';
import {
  AddStockInput,
  DeductStockInput,
  TransferStockInput,
  BatchWithRelations,
  MovementWithRelations,
  BatchFilters,
  MovementFilters,
  WeightedAverageCostResult,
  StockLevel,
} from '@/types/inventory.types';
import { ValidationError, NotFoundError, InsufficientStockError } from '@/lib/errors';

export class InventoryService {
  /**
   * Generate a unique batch number in format: BATCH-YYYYMMDD-XXXX
   */
  async generateBatchNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find the last batch number for today
    const lastBatch = await prisma.inventoryBatch.findFirst({
      where: {
        batchNumber: {
          startsWith: `BATCH-${dateStr}`,
        },
      },
      orderBy: {
        batchNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastBatch) {
      const lastSequence = parseInt(lastBatch.batchNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `BATCH-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Calculate weighted average cost for a product in a warehouse
   * Formula: (sum of quantity × unitCost) / (sum of quantity)
   */
  async calculateWeightedAverageCost(
    productId: string,
    warehouseId: string
  ): Promise<number> {
    const batches = await inventoryRepository.findActiveBatches(productId, warehouseId);

    if (batches.length === 0) {
      return 0;
    }

    const totalCost = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity) * Number(batch.unitCost),
      0
    );

    const totalQuantity = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity),
      0
    );

    return totalQuantity > 0 ? totalCost / totalQuantity : 0;
  }

  /**
   * Get detailed weighted average cost information
   */
  async getWeightedAverageCostDetails(
    productId: string,
    warehouseId: string
  ): Promise<WeightedAverageCostResult> {
    const batches = await inventoryRepository.findActiveBatches(productId, warehouseId);

    const totalCost = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity) * Number(batch.unitCost),
      0
    );

    const totalQuantity = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity),
      0
    );

    const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    return {
      productId,
      warehouseId,
      averageCost,
      totalQuantity,
      totalValue: totalCost,
    };
  }

  /**
   * Convert quantity from any UOM to base UOM
   */
  async convertToBaseUOM(
    productId: string,
    quantity: number,
    uom: string
  ): Promise<number> {
    const product = await productService.getProductById(productId);

    // If already base UOM, return as-is
    if (uom.toLowerCase() === product.baseUOM.toLowerCase()) {
      return quantity;
    }

    // Find the alternate UOM
    const alternateUOM = product.alternateUOMs.find(
      (u) => u.name.toLowerCase() === uom.toLowerCase()
    );

    if (!alternateUOM) {
      throw new ValidationError(`UOM '${uom}' not found for product ${product.name}`, {
        uom: 'Invalid UOM for this product',
      });
    }

    // Convert: quantity × conversionFactor = base units
    return quantity * Number(alternateUOM.conversionFactor);
  }

  /**
   * Add stock to inventory
   */
  async addStock(data: AddStockInput): Promise<BatchWithRelations> {
    // Validate product exists
    const product = await productService.getProductById(data.productId);

    // Convert quantity to base UOM
    const baseQuantity = await this.convertToBaseUOM(
      data.productId,
      data.quantity,
      data.uom
    );

    // Validate quantity
    if (baseQuantity <= 0) {
      throw new ValidationError('Quantity must be greater than zero', {
        quantity: 'Invalid quantity',
      });
    }

    // Validate unit cost
    if (data.unitCost <= 0) {
      throw new ValidationError('Unit cost must be greater than zero', {
        unitCost: 'Invalid unit cost',
      });
    }

    // Generate batch number
    const batchNumber = await this.generateBatchNumber();

    // Calculate expiry date
    const receivedDate = data.receivedDate || new Date();
    const expiryDate = new Date(receivedDate);
    expiryDate.setDate(expiryDate.getDate() + product.shelfLifeDays);

    // Create batch and movement in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create inventory batch
      const batch = await tx.inventoryBatch.create({
        data: {
          batchNumber,
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: baseQuantity,
          unitCost: data.unitCost,
          receivedDate,
          expiryDate,
          status: 'active',
        },
        include: {
          product: true,
          warehouse: true,
        },
      });

      // Record stock movement
      await tx.stockMovement.create({
        data: {
          batchId: batch.id,
          type: 'IN',
          quantity: baseQuantity,
          reason: data.reason || 'Stock addition',
          referenceId: data.referenceId,
          referenceType: data.referenceType,
        },
      });

      return batch;
    });

    return result;
  }

  /**
   * Deduct stock from inventory using FIFO (First Expiry, First Out)
   */
  async deductStock(data: DeductStockInput): Promise<void> {
    // Validate product exists
    await productService.getProductById(data.productId);

    // Convert quantity to base UOM
    const baseQuantity = await this.convertToBaseUOM(
      data.productId,
      data.quantity,
      data.uom
    );

    // Validate quantity
    if (baseQuantity <= 0) {
      throw new ValidationError('Quantity must be greater than zero', {
        quantity: 'Invalid quantity',
      });
    }

    // Get active batches ordered by expiry date (FIFO)
    const batches = await inventoryRepository.findActiveBatches(
      data.productId,
      data.warehouseId
    );

    // Check if sufficient stock is available
    const totalAvailable = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity),
      0
    );

    if (totalAvailable < baseQuantity) {
      const product = await productService.getProductById(data.productId);
      throw new InsufficientStockError(
        product.name,
        totalAvailable,
        baseQuantity
      );
    }

    // Deduct from batches in transaction
    await prisma.$transaction(async (tx) => {
      let remainingToDeduct = baseQuantity;

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;

        const batchQuantity = Number(batch.quantity);
        const deductFromBatch = Math.min(batchQuantity, remainingToDeduct);

        // Update batch quantity
        const newQuantity = batchQuantity - deductFromBatch;
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            quantity: newQuantity,
            status: newQuantity === 0 ? 'depleted' : 'active',
          },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            batchId: batch.id,
            type: 'OUT',
            quantity: deductFromBatch,
            reason: data.reason,
            referenceId: data.referenceId,
            referenceType: data.referenceType,
          },
        });

        remainingToDeduct -= deductFromBatch;
      }
    });
  }

  /**
   * Transfer stock between warehouses
   */
  async transferStock(data: TransferStockInput): Promise<void> {
    // Validate warehouses are different
    if (data.sourceWarehouseId === data.destinationWarehouseId) {
      throw new ValidationError('Source and destination warehouses must be different', {
        warehouse: 'Cannot transfer to the same warehouse',
      });
    }

    // Validate product exists
    const product = await productService.getProductById(data.productId);

    // Convert quantity to base UOM
    const baseQuantity = await this.convertToBaseUOM(
      data.productId,
      data.quantity,
      data.uom
    );

    // Get weighted average cost from source warehouse for the new batch
    const avgCost = await this.calculateWeightedAverageCost(
      data.productId,
      data.sourceWarehouseId
    );

    if (avgCost === 0) {
      throw new ValidationError('No stock available in source warehouse', {
        warehouse: 'Source warehouse has no stock',
      });
    }

    // Perform transfer in transaction
    await prisma.$transaction(async (tx) => {
      // Deduct from source warehouse
      await this.deductStock({
        productId: data.productId,
        warehouseId: data.sourceWarehouseId,
        quantity: data.quantity,
        uom: data.uom,
        referenceType: 'TRANSFER',
        reason: data.reason || `Transfer to destination warehouse`,
      });

      // Add to destination warehouse
      await this.addStock({
        productId: data.productId,
        warehouseId: data.destinationWarehouseId,
        quantity: data.quantity,
        uom: data.uom,
        unitCost: avgCost,
        referenceType: 'TRANSFER',
        reason: data.reason || `Transfer from source warehouse`,
      });
    });
  }

  /**
   * Get all inventory batches with filters
   */
  async getAllBatches(filters?: BatchFilters): Promise<BatchWithRelations[]> {
    return await inventoryRepository.findAllBatches(filters);
  }

  /**
   * Get batch by ID
   */
  async getBatchById(id: string): Promise<BatchWithRelations> {
    const batch = await inventoryRepository.findBatchById(id);
    if (!batch) {
      throw new NotFoundError('Inventory batch');
    }
    return batch;
  }

  /**
   * Get all stock movements with filters
   */
  async getAllMovements(filters?: MovementFilters): Promise<MovementWithRelations[]> {
    return await inventoryRepository.findAllMovements(filters);
  }

  /**
   * Get current stock levels with weighted average costs
   */
  async getStockLevels(warehouseId?: string): Promise<StockLevel[]> {
    const groupedStock = await inventoryRepository.getStockLevels(warehouseId);

    const stockLevels: StockLevel[] = [];

    for (const group of groupedStock) {
      const product = await productService.getProductById(group.productId);
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: group.warehouseId },
      });

      if (!warehouse) continue;

      const avgCost = await this.calculateWeightedAverageCost(
        group.productId,
        group.warehouseId
      );

      const quantity = Number(group._sum.quantity || 0);

      stockLevels.push({
        productId: group.productId,
        productName: product.name,
        warehouseId: group.warehouseId,
        warehouseName: warehouse.name,
        quantity,
        weightedAverageCost: avgCost,
        totalValue: quantity * avgCost,
      });
    }

    return stockLevels;
  }

  /**
   * Get total stock for a product across all warehouses
   */
  async getTotalStockForProduct(productId: string): Promise<number> {
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        productId,
        status: 'active',
      },
    });

    return batches.reduce((sum, batch) => sum + Number(batch.quantity), 0);
  }

  /**
   * Check if product has sufficient stock in warehouse
   */
  async hasSufficientStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    uom: string
  ): Promise<boolean> {
    const baseQuantity = await this.convertToBaseUOM(productId, quantity, uom);
    const totalStock = await inventoryRepository.getTotalStock(productId, warehouseId);
    return totalStock >= baseQuantity;
  }

  /**
   * Update batch status (e.g., mark as expired)
   */
  async updateBatchStatus(
    batchId: string,
    status: 'active' | 'expired' | 'depleted'
  ): Promise<void> {
    await inventoryRepository.updateBatch(batchId, { status });
  }

  /**
   * Mark expired batches
   */
  async markExpiredBatches(): Promise<number> {
    const expiredBatches = await prisma.inventoryBatch.findMany({
      where: {
        status: 'active',
        expiryDate: {
          lt: new Date(),
        },
      },
    });

    for (const batch of expiredBatches) {
      await this.updateBatchStatus(batch.id, 'expired');
    }

    return expiredBatches.length;
  }
}

export const inventoryService = new InventoryService();
